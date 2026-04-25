# Setup Guide

How to get this repo running on a new machine from scratch.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org or `nvm install 20` |
| pnpm | any | `npm install -g pnpm` |
| Git | any | https://git-scm.com |

---

## 2. Clone and install

```bash
git clone <repo-url>
cd web3nz-hackathon
pnpm install
```

---

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Avalanche Fuji testnet
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113

# Supabase
SUPABASE_URL=https://nhypczhfaixwwxeupsgm.supabase.co
SUPABASE_ANON_KEY=<anon key from .env.example>
SUPABASE_SERVICE_ROLE_KEY=<grab from Supabase dashboard → Settings → API>

# Facilitator wallet — submits on-chain txs, needs AVAX for gas
PAYWALL_PRIVATE_KEY=0x<your-facilitator-private-key>

# Dashboard backend used by paywall middleware
DASHBOARD_BACKEND_URL=http://localhost:3001

# Product API key copied from the merchant dashboard (after registering)
PRODUCT_API_KEY=pk_live_...

# Product config cache duration in middleware
PRODUCT_CONFIG_CACHE_TTL_MS=30000

# USDC on Fuji testnet
USDC_CONTRACT_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65

# Agent wallet — signs EIP-712 authorizations, needs USDC
AGENT_PRIVATE_KEY=0x<your-agent-private-key>

# OpenAI key for GPT-4o agent reasoning
OPENAI_API_KEY=sk-...
```

> **Never commit `.env`** — it is gitignored.

The Supabase service role key is the only secret you need to grab manually:
go to https://supabase.com/dashboard → your project → Settings → API → copy
the `service_role` key. Treat it like a database password — it bypasses
row-level security and should never be shipped to a browser.

---

## 4. Get testnet funds

**AVAX for gas — facilitator wallet:**
- Faucet: https://core.app/tools/testnet-faucet (select Fuji C-Chain)
- Or join the Avalanche Discord and use `#fuji-faucet`

**USDC for payments — agent wallet:**
- Faucet: https://faucet.circle.com (select Avalanche Fuji)
- Contract: `0x5425890298aed601595a70AB815c96711a31Bc65`

---

## 5. Build shared packages

```bash
pnpm build
```

Compiles `packages/shared`, `packages/paywall-middleware`, and `packages/agent-sdk` to `dist/`.

---

## 6. Run the stack

```bash
# Terminal 1 — paywalled API server
pnpm dev:business               # → http://localhost:3000

# Terminal 2 — dashboard merchant/config/payment API
pnpm --filter dashboard-backend dev   # → http://localhost:3001

# Terminal 3 — agent chat SSE backend
pnpm dev:agent-chat-backend     # → http://localhost:3002

# Terminal 4 — merchant dashboard
pnpm dev:dashboard              # → http://localhost:5173

# Terminal 5 — interactive agent chat demo
pnpm dev:agent-chat             # → http://localhost:5174
```

Open `http://localhost:5173` to register a merchant account. Once registered:

1. Set your receiving wallet address and payment network in Settings
2. Create a product
3. Copy the product's API key into `PRODUCT_API_KEY` in your `.env`
4. Restart the demo-business server so it picks up the new key

Then open `http://localhost:5174`, type a request like:
> "Get me the premium data from the business API"

Watch the 402 → signing → on-chain settlement → agent response happen live.

Account, product, and transaction data live in the Supabase Postgres database.
There is no longer a `data/*.json` runtime store.

---

## Troubleshooting

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**`@web3nz/shared` import error at runtime:**
```bash
pnpm --filter @web3nz/shared build
pnpm --filter @web3nz/paywall-middleware build
pnpm --filter @web3nz/agent-sdk build
```

**`SUPABASE_SERVICE_ROLE_KEY is required`:**
Make sure `.env` is at the repo root and contains all three Supabase vars
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Restart
any backend after editing `.env`.

**`pnpm: command not found`:**
```bash
npm install -g pnpm
```
