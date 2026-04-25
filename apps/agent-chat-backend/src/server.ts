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
      name: 'call_paid_api',
      description:
        'Call a premium paid API endpoint. USDC payment is handled automatically from the agent wallet using x402.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The API endpoint URL to call' },
        },
        required: ['url'],
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
          'You are an autonomous AI agent with a crypto wallet. The business API is running at http://localhost:3000. It has a free endpoint at /free and a premium paid endpoint at /premium. When the user asks for premium data, use call_paid_api with http://localhost:3000/premium — your wallet will automatically pay the required USDC fee via x402. Be concise in your final answer.',
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
          const { url } = JSON.parse(toolCall.function.arguments) as { url: string };
          send({ type: 'step', text: `Calling ${url}` });

          const apiRes = await agent.payAndFetch(url);
          const data = await apiRes.json();

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
