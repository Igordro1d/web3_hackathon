# @web3nz/agent-sdk

SDK for AI agents to automatically pay [x402](https://x402.org) paywalls using USDC on Avalanche. Drop-in replacement for `fetch` — handles 402 responses, signs payments, and retries transparently.

## How it works

1. Agent calls `payAndFetch(url)` — same as `fetch(url)`
2. If the response is `402`, the SDK reads the payment requirements
3. Signs an EIP-712 `TransferWithAuthorization` with the agent's private key (off-chain, instant, no gas)
4. Retries with `X-Payment` header containing the signature
5. The server settles on-chain and returns the data

**The agent never submits a blockchain transaction.** Only USDC is needed — no AVAX for gas.

## Installation

```bash
npm install @web3nz/agent-sdk
```

## Prerequisites

- A wallet with **USDC** on Avalanche C-Chain
- `RPC_URL` environment variable set

Get testnet USDC at [faucet.circle.com](https://faucet.circle.com) (select Avalanche Fuji).

## Quick start

```typescript
import { createAgent } from '@web3nz/agent-sdk';

const agent = createAgent({
  network: 'avalanche-fuji',
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
});

// Works just like fetch — pays automatically if endpoint requires it
const res = await agent.payAndFetch('https://api.example.com/premium');
const data = await res.json();
```

## With an AI agent (OpenAI tool use)

```typescript
import OpenAI from 'openai';
import { createAgent } from '@web3nz/agent-sdk';

const openai = new OpenAI();
const agent = createAgent({
  network: 'avalanche-fuji',
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
});

const tools = [{
  type: 'function' as const,
  function: {
    name: 'call_paid_api',
    description: 'Call a paid API endpoint. USDC payment is handled automatically.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
}];

const messages = [{ role: 'user' as const, content: 'Get me the premium market data.' }];

while (true) {
  const response = await openai.chat.completions.create({ model: 'gpt-4o', tools, messages });
  const choice = response.choices[0];

  if (choice.finish_reason === 'stop') break;

  if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
    messages.push(choice.message);
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const { url } = JSON.parse(toolCall.function.arguments);
      const res = await agent.payAndFetch(url);
      const data = await res.json();
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(data) });
    }
  }
}
```

## API Reference

### `createAgent(config)`

| Parameter | Type | Description |
|---|---|---|
| `config.network` | `'avalanche-fuji' \| 'avalanche'` | Blockchain network |
| `config.privateKey` | `0x${string}` | Agent's private key — used to sign payment authorizations |

### `agent.payAndFetch(url)`

Drop-in replacement for `fetch`. Automatically handles 402 Payment Required responses.

- If the endpoint returns anything other than `402` → returns the response as-is
- If the endpoint returns `402` → pays and retries, returns the paid response

### Console output

```
[agent-sdk] → GET https://api.example.com/premium
[agent-sdk] ← 402 Payment Required
[agent-sdk]   amount : 0.01 USDC
[agent-sdk]   payTo  : 0xC1dDD...
[agent-sdk]   network: avalanche-fuji
[agent-sdk] ✍  Signing EIP-712 TransferWithAuthorization...
[agent-sdk] ✓  Signed — 0x1a2b3c...
[agent-sdk] → Retrying with X-PAYMENT header...
[agent-sdk] ← 200 — access granted
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RPC_URL` | Yes | Avalanche JSON-RPC endpoint |
| `AGENT_PRIVATE_KEY` | Recommended | Keep the private key in env, not hardcoded |

## Supported networks

| Network | Chain ID | USDC Contract |
|---|---|---|
| `avalanche-fuji` (testnet) | 43113 | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `avalanche` (mainnet) | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## Security

- Never hardcode `privateKey` — use environment variables
- The private key only signs EIP-712 messages locally — it is never sent over the network
- Each payment uses a unique random `nonce` — signatures cannot be replayed

## License

MIT
