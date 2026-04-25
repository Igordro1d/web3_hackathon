import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createAgent } from '@web3nz/agent-sdk';

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const agent = createAgent({
  network: 'avalanche-fuji',
  privateKey: (process.env.AGENT_PRIVATE_KEY || '0x0') as `0x${string}`,
});

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_binance_price',
      description:
        'Get the live spot price of a crypto trading pair from Binance. Costs 0.01 USDC per call, paid automatically via x402.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Binance trading pair symbol, e.g. BTCUSDT, ETHUSDT, SOLUSDT, AVAXUSDT',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_binance_stats',
      description:
        'Get 24-hour rolling statistics for a trading pair: price change %, high, low, open, close, and trading volume. Use this when asked about daily performance, volatility, or volume. Costs 0.01 USDC per call.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Binance trading pair symbol, e.g. BTCUSDT, ETHUSDT, SOLUSDT',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_binance_klines',
      description:
        'Get candlestick (OHLCV) data for a trading pair over a time range. Use this to analyse price trends, momentum, or recent highs and lows. Costs 0.01 USDC per call.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Binance trading pair symbol, e.g. BTCUSDT, ETHUSDT',
          },
          interval: {
            type: 'string',
            enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
            description: 'Candlestick interval. Use 1h for hourly, 1d for daily.',
          },
          limit: {
            type: 'number',
            description: 'Number of candles to return (max 100). Default 24.',
          },
        },
        required: ['symbol', 'interval'],
      },
    },
  },
];

app.post('/api/chat', async (req, res) => {
  const { message } = req.body as { message: string };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  // Intercept agent-sdk console.log to stream payment steps as SSE
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    const line = args.join(' ');
    if (line.includes('[agent-sdk]')) {
      send({ type: 'step', text: line.replace('[agent-sdk] ', '') });
    }
    originalLog(...args);
  };

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are an autonomous AI agent with a crypto wallet. You have access to a premium Binance market data service. Each call costs 0.01 USDC and is paid automatically from your wallet via x402. Use get_binance_price for spot prices, get_binance_stats for 24h performance/volume/volatility, and get_binance_klines for trend and candlestick analysis. You may call multiple tools in parallel when comparing assets. Be concise in your final answer.',
      },
      { role: 'user', content: message },
    ];

    while (true) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        tools,
        messages,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === 'stop') {
        send({ type: 'message', role: 'agent', text: choice.message.content ?? '' });
        break;
      }

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const args = JSON.parse(toolCall.function.arguments) as Record<string, string | number>;

          let url: string;
          let stepText: string;

          if (toolCall.function.name === 'get_binance_price') {
            url = `http://localhost:3000/premium?symbol=${args.symbol}`;
            stepText = `Fetching spot price for ${args.symbol}`;
          } else if (toolCall.function.name === 'get_binance_stats') {
            url = `http://localhost:3000/premium/stats?symbol=${args.symbol}`;
            stepText = `Fetching 24hr stats for ${args.symbol}`;
          } else if (toolCall.function.name === 'get_binance_klines') {
            const interval = args.interval ?? '1h';
            const limit = args.limit ?? 24;
            url = `http://localhost:3000/premium/klines?symbol=${args.symbol}&interval=${interval}&limit=${limit}`;
            stepText = `Fetching ${interval} klines for ${args.symbol}`;
          } else {
            continue;
          }

          send({ type: 'step', text: stepText });
          const apiRes = await agent.payAndFetch(url);
          const data = await apiRes.json();
          send({ type: 'step', text: `API response: ${JSON.stringify(data, null, 2)}` });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(data),
          });
        }
      } else {
        break;
      }
    }
  } catch (err) {
    send({ type: 'error', text: String(err) });
  } finally {
    console.log = originalLog;
    send({ type: 'done' });
    res.end();
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Agent chat backend running on http://localhost:${PORT}`);
});
