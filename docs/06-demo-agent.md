# apps/demo-agent

**Package name:** `demo-agent`
**Location:** `apps/demo-agent/`
**Runtime:** Node.js via `tsx`
**Mode:** One-shot CLI script — runs, prints result, exits

---

## Purpose

A CLI script that demonstrates an AI agent (GPT-4o) autonomously calling a paywalled API. The agent decides to call the paid endpoint, the `agent-sdk` handles the 402 flow transparently, and the agent summarises what it received — without any human intervention in the payment.

---

## How It Works

1. GPT-4o is given a `call_paid_api(url)` tool
2. GPT-4o decides to call `http://localhost:3000/premium`
3. `agent.payAndFetch(url)` intercepts the 402, signs an EIP-712 auth, retries
4. Business server settles 0.01 USDC on-chain
5. GPT-4o summarises the response

---

## Running

```bash
pnpm --filter demo-agent start
```

**Expected output:**
```
[agent] Starting AI agent with x402 payment capability
[agent] stop_reason: tool_calls
[agent] Calling paid API: http://localhost:3000/premium
[agent-sdk] → GET http://localhost:3000/premium
[agent-sdk] ← 402 Payment Required
[agent-sdk]   amount : 0.01 USDC
[agent-sdk]   payTo  : 0xC1dDD...
[agent-sdk]   network: avalanche-fuji
[agent-sdk] ✍  Signing EIP-712 TransferWithAuthorization...
[agent-sdk] ✓  Signed — 0x...
[agent-sdk] → Retrying with X-PAYMENT header...
[agent-sdk] ← 200 — access granted
[agent] API response: { message: 'This is premium paid content', secret: 42 }
[agent] Final answer: I fetched the premium data...
```

---

## Dependencies

```
demo-agent
├── @web3nz/agent-sdk  (workspace:*)
├── openai
└── dotenv
```
