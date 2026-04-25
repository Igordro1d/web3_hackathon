import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });
import OpenAI from 'openai';
import { createAgent } from '@web3nz/agent-sdk';

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
        'Call a premium paid API endpoint. USDC payment is handled automatically from your wallet using x402.',
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

async function main() {
  console.log('[agent] Starting AI agent with x402 payment capability');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content:
        'You are an autonomous AI agent with a crypto wallet. Fetch premium data from http://localhost:3000/premium — your wallet will automatically pay the required USDC fee. Call the API then summarise what you received.',
    },
  ];

  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      tools,
      messages,
    });

    const choice = response.choices[0];
    console.log('[agent] stop_reason:', choice.finish_reason);

    if (choice.finish_reason === 'stop') {
      console.log('[agent] Final answer:', choice.message.content);
      break;
    }

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const { url } = JSON.parse(toolCall.function.arguments) as { url: string };
        console.log(`[agent] Calling paid API: ${url}`);

        const res = await agent.payAndFetch(url);
        const data = await res.json();
        console.log('[agent] API response:', data);

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
}

main().catch(console.error);
