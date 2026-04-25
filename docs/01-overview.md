# System Overview

## What This Project Is

An x402-style payment gateway that lets AI agents pay for HTTP API access using USDC on Avalanche C-Chain. The name references the never-standardised HTTP 402 "Payment Required" status code. The idea: an API server responds to an unauthorised request with a `402` and a machine-readable payment description; the calling agent reads that description, signs a USDC transfer authorisation, retries the request with the signature attached, and the server settles the payment on-chain before serving the response.

Future scope (post-scaffold) adds Aave integration so the business's treasury continuously earns yield on collected USDC between settlement and withdrawal.

---

## Repository Layout

```
web3nz-hackathon/
├── packages/
│   ├── shared/              # Types, network constants, EIP-712 helpers
│   ├── paywall-middleware/  # Express middleware — 402 challenge + settlement
│   └── agent-sdk/           # Agent-side HTTP client — auto-pays 402s
├── apps/
│   ├── demo-business/       # Example API server that uses paywall-middleware
│   ├── demo-agent/          # Example AI agent that calls the business server
│   ├── dashboard-backend/   # REST API reading from the JSON transaction log
│   └── dashboard/           # React + Vite + Tailwind frontend dashboard
├── data/                    # Runtime JSON storage (gitignored)
├── docs/                    # This documentation
├── .env.example             # Environment variable template
├── package.json             # Workspace root + shared dev tooling
├── pnpm-workspace.yaml      # Declares packages/* and apps/* as workspaces
└── tsconfig.base.json       # Shared TypeScript compiler options
```

### Package manager

pnpm workspaces. All packages and apps live in a single `node_modules` tree at the root (hoisted). Internal packages reference each other via `"workspace:*"` in `dependencies`, which pnpm resolves to the local directory at install time — no publishing required.

---

## Payment Flow (intended, not yet fully implemented)

```
AI Agent                      Business Server                 Avalanche C-Chain
   │                                │                                 │
   │  GET /premium                  │                                 │
   │ ──────────────────────────────►│                                 │
   │                                │                                 │
   │  402 Payment Required          │                                 │
   │  + PaymentRequirements JSON    │                                 │
   │ ◄──────────────────────────────│                                 │
   │                                │                                 │
   │  [agent signs EIP-712          │                                 │
   │   TransferWithAuthorization    │                                 │
   │   using its private key]       │                                 │
   │                                │                                 │
   │  GET /premium                  │                                 │
   │  + X-Payment: <auth sig>       │                                 │
   │ ──────────────────────────────►│                                 │
   │                                │  transferWithAuthorization()    │
   │                                │ ───────────────────────────────►│
   │                                │  tx confirmed                   │
   │                                │ ◄───────────────────────────────│
   │  200 OK + response body        │                                 │
   │ ◄──────────────────────────────│                                 │
```

### Key design decisions

| Decision | Reason |
|---|---|
| EIP-712 `TransferWithAuthorization` | Gasless for the agent — the business server submits the on-chain tx and pays gas on behalf of the agent. The agent only signs. |
| USDC `transferWithAuthorization` | Circle's USDC on Avalanche natively supports EIP-3009, which exposes `transferWithAuthorization`. No token approval step needed. |
| `validAfter` / `validBefore` window | Prevents replay attacks and enforces a short execution window (configurable via `maxTimeoutSeconds`). |
| `nonce` as random `bytes32` | Each authorisation has a unique nonce, preventing double-spend of the same signature. |
| JSON file for storage | Avoids database setup complexity during a hackathon. `lowdb` wraps a plain `data/transactions.json` file. |

---

## Data Structures

The canonical types are defined in `packages/shared/src/types.ts` and imported by every other package.

### `Transaction`
Written to `data/transactions.json` after each successful settlement. Read back by `dashboard-backend` for the UI.

### `PaymentRequirements`
Sent in the `402` response body by `paywall-middleware`. Tells the agent exactly what it needs to pay, to whom, and on which network.

### `TransferAuthorization`
Sent by the agent in the `X-Payment` request header on retry. Contains the EIP-712 signature components (`v`, `r`, `s`) plus all the parameters the USDC contract needs to call `transferWithAuthorization`.

---

## Environment Variables

See `.env.example`. The same file is used by `demo-business` and `dashboard-backend`; `demo-agent` adds its own `AGENT_PRIVATE_KEY`.

| Variable | Used by | Purpose |
|---|---|---|
| `RPC_URL` | middleware, agent-sdk | Avalanche Fuji JSON-RPC endpoint |
| `CHAIN_ID` | middleware, agent-sdk | `43113` for Fuji testnet |
| `PAYWALL_PRIVATE_KEY` | demo-business | Key that submits settlement txs and pays gas |
| `BUSINESS_WALLET_ADDRESS` | demo-business | USDC destination address for payments |
| `USDC_CONTRACT_ADDRESS` | middleware, agent-sdk | On Fuji: `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `AGENT_PRIVATE_KEY` | demo-agent | Key the agent uses to sign `TransferWithAuthorization` |

---

## Build System

| Tool | Used for |
|---|---|
| `tsup` | Builds `packages/*` — outputs CJS (`.js`), ESM (`.mjs`), and type declarations (`.d.ts`) in one pass |
| `tsx` | Runs/watches TypeScript directly in Node for `apps/demo-business`, `apps/demo-agent`, `apps/dashboard-backend` — no build step needed during development |
| `vite` | Bundles and serves `apps/dashboard` (React frontend) |
| `tsc` | Used only for type-checking; `tsup` and `vite` handle the actual transpilation |

All packages extend `tsconfig.base.json` at the root, which sets `ES2022` target, `ESNext` module format, and `Bundler` module resolution (compatible with both `tsup` and Vite).

---

## Running the Full Stack

```
Terminal 1: pnpm dev:business          # API server  → localhost:3000
Terminal 2: pnpm --filter demo-agent start  # AI agent (one-shot run)
Terminal 3: pnpm --filter dashboard-backend dev  # Dashboard API → localhost:3001
Terminal 4: pnpm dev:dashboard         # React UI   → localhost:5173
```
