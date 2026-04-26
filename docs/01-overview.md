# System Overview

## What This Project Is

An x402 payment gateway that lets AI agents autonomously pay for HTTP API access using USDC on Avalanche C-Chain. It implements the HTTP 402 "Payment Required" standard: an API server responds to an unauthorised request with a `402` and a machine-readable payment description; the calling agent reads that description, signs a USDC transfer authorisation off-chain (gasless), retries the request with the signature attached, and the server settles the payment on-chain before serving the response.

**The product:** Drop-in middleware that lets any developer paywall their API in one line, and an agent SDK that lets any AI agent pay for APIs automatically — no subscriptions, no API keys, pay per request.

---

## Repository Layout

```
web3nz-hackathon/
├── packages/
│   ├── shared/                # Types, network constants, EIP-712 helpers
│   ├── paywall-middleware/    # Express middleware — 402 challenge + on-chain settlement
│   └── agent-sdk/             # Agent-side HTTP client — auto-pays 402s
├── apps/
│   ├── demo-business/         # Example paywalled API server
│   ├── demo-agent/            # One-shot CLI agent (GPT-4o + agent-sdk)
│   ├── agent-chat-backend/    # SSE backend for interactive chat demo
│   ├── agent-chat/            # React chat UI — user talks to agent live
│   ├── dashboard-backend/     # REST API for merchant auth, products, settings, payments
│   └── dashboard/             # React merchant dashboard — products, API keys, revenue, txs
├── data/                      # Placeholder directory only; runtime data now lives in Supabase
├── docs/                      # This documentation
├── .env.example               # Environment variable template
├── package.json               # Workspace root + shared dev tooling
├── pnpm-workspace.yaml        # Declares packages/* and apps/* as workspaces
└── tsconfig.base.json         # Shared TypeScript compiler options
```

---

## Payment Flow

```
AI Agent                      Business Server                 Avalanche C-Chain
   │                                │                                 │
   │  GET /premium                  │                                 │
   │ ──────────────────────────────►│                                 │
   │                                │                                 │
   │  402 Payment Required          │                                 │
   │  { amount, payTo, network }    │                                 │
   │ ◄──────────────────────────────│                                 │
   │                                │                                 │
   │  [signs EIP-712 auth           │                                 │
   │   off-chain, instant,          │                                 │
   │   no gas needed]               │                                 │
   │                                │                                 │
   │  GET /premium                  │                                 │
   │  X-Payment: <base64 sig>       │                                 │
   │ ──────────────────────────────►│                                 │
   │                                │  transferWithAuthorization()    │
   │                                │ ───────────────────────────────►│
   │                                │  tx confirmed (~2s)             │
   │                                │ ◄───────────────────────────────│
   │  200 OK + response body        │                                 │
   │ ◄──────────────────────────────│                                 │
```

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| EIP-712 `TransferWithAuthorization` | Gasless for the agent — the business server submits the on-chain tx and pays gas. The agent only signs. |
| USDC on Avalanche C-Chain | Circle's USDC natively supports EIP-3009 (`transferWithAuthorization`). No token approval step needed. Sub-second finality, ~$0.001 gas. |
| `validAfter - 30s` buffer | Accounts for clock skew between agent and blockchain node. Prevents "authorization not yet valid" reverts. |
| `validAfter` / `validBefore` window | Prevents replay attacks. Auth expires if not settled within `maxTimeoutSeconds`. |
| `nonce` as random `bytes32` | Each authorisation has a unique nonce — prevents double-spend of the same signature. |
| Supabase for storage | Merchant accounts, products, and transactions live in Supabase Auth + Postgres. |
| SSE for chat streaming | Payment steps (402, signing, 200) stream to the browser in real time as they happen. |

---

## Data Structures

Defined in `packages/shared/src/types.ts`, imported by every package.

### `Transaction`
Written to the Supabase `transactions` table after each successful on-chain settlement.

### Dashboard merchant data
Stored in Supabase: `auth.users` holds credentials, `public.accounts` stores merchant settings, and `public.products` stores product configs, API keys, and pricing.

### `GatewayProductConfig`
Returned by `dashboard-backend` to paywall middleware when middleware looks up a product by API key. It tells middleware the product name, description, price, account network, receiving wallet, resource, and status.

### `PaymentRequirements`
Sent in the `402` response body. Tells the agent what to pay, to whom, on which network.

### `TransferAuthorization`
Sent by the agent in the `X-Payment` header. Contains EIP-712 signature components (`v`, `r`, `s`) plus parameters for `transferWithAuthorization`.

---

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `RPC_URL` | middleware, agent-sdk | Avalanche Fuji JSON-RPC endpoint |
| `CHAIN_ID` | middleware, agent-sdk | `43113` for Fuji testnet |
| `PAYWALL_PRIVATE_KEY` | paywall-middleware | Submits settlement txs, pays gas |
| `DASHBOARD_BACKEND_URL` | paywall-middleware | Product config API base URL |
| `PRODUCT_API_KEY` | demo-business | Product API key copied from dashboard |
| `PRODUCT_CONFIG_CACHE_TTL_MS` | paywall-middleware | Product config cache duration |
| `USDC_CONTRACT_ADDRESS` | middleware, agent-sdk | `0x5425890298aed601595a70AB815c96711a31Bc65` on Fuji |
| `AGENT_PRIVATE_KEY` | demo-agent, agent-chat-backend | Signs EIP-712 authorizations |
| `OPENAI_API_KEY` | demo-agent, agent-chat-backend | GPT-4o for agent reasoning |

---

## Build System

| Tool | Used for |
|---|---|
| `tsup` | Builds `packages/*` — outputs CJS, ESM, and type declarations |
| `tsx` | Runs TypeScript directly in Node for Express backends (no build step in dev) |
| `vite` | Bundles and serves React frontends (`dashboard`, `agent-chat`) |
| `tsc` | Type-checking only |

---

## Running the Full Stack

```bash
# Terminal 1 — paywalled API server
pnpm dev:business               # → http://localhost:3000

# Terminal 2 — dashboard merchant/config/payment API
pnpm --filter dashboard-backend dev   # → http://localhost:3001

# Terminal 3 — agent chat SSE backend
pnpm dev:agent-chat-backend     # → http://localhost:3002

# Terminal 4 — merchant dashboard UI
pnpm dev:dashboard              # → http://localhost:5173

# Terminal 5 — interactive agent chat UI
pnpm dev:agent-chat             # → http://localhost:5174

# One-shot agent run (no UI)
pnpm --filter demo-agent start
```
