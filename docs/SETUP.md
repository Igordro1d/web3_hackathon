# Setup Guide

How to get this repo running on a new machine from scratch.

---

## 1. Prerequisites

Install the following if not already present:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org or `nvm install 20` |
| pnpm | any | `npm install -g pnpm` |
| Git | any | https://git-scm.com |

Verify:
```bash
node --version   # v20.x.x or higher
pnpm --version   # any version
git --version
```

---

## 2. Clone the repo

```bash
git clone <repo-url>
cd web3nz-hackathon
```

---

## 3. Install dependencies

From the repo root:

```bash
pnpm install
```

This installs all packages and apps in one pass and links internal workspace packages (`@web3nz/shared`, etc.) automatically.

---

## 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
PAYWALL_PRIVATE_KEY=0x<your-facilitator-wallet-private-key>
BUSINESS_WALLET_ADDRESS=0x<your-business-wallet-address>
USDC_CONTRACT_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65
```

Also add this for the agent:
```env
AGENT_PRIVATE_KEY=0x<your-agent-wallet-private-key>
```

> **Never commit `.env`** — it is gitignored. The `PAYWALL_PRIVATE_KEY` and `AGENT_PRIVATE_KEY` are real Ethereum private keys. Keep them off shared machines.

---

## 5. Get Fuji testnet funds

Both the facilitator wallet and agent wallet need funds on Avalanche Fuji testnet.

**AVAX (for gas) — facilitator wallet only:**
- Faucet: https://core.app/tools/testnet-faucet

**USDC (for payments) — agent wallet:**
- Fuji USDC faucet: https://faucet.circle.com (select Avalanche testnet)
- Contract: `0x5425890298aed601595a70AB815c96711a31Bc65`

---

## 6. Build shared packages

```bash
pnpm build
```

This compiles `packages/shared`, `packages/paywall-middleware`, and `packages/agent-sdk` to `dist/`. The app servers (`demo-business`, `demo-agent`, `dashboard-backend`) use `tsx` and don't need a build step.

---

## 7. Run the stack

Open a terminal per service:

```bash
# Terminal 1
pnpm dev:business          # API server  → http://localhost:3000

# Terminal 2
pnpm --filter dashboard-backend dev   # Dashboard API → http://localhost:3001

# Terminal 3
pnpm dev:dashboard         # Frontend   → http://localhost:5173
```

To run the agent (one-shot):
```bash
pnpm --filter demo-agent start
```

---

## Troubleshooting

**`pnpm: command not found`**
```bash
npm install -g pnpm
# then open a new terminal
```

**`process is not defined` or TypeScript errors on `process.env`**
Each backend app needs `"types": ["node"]` in its `tsconfig.json` — this is already set. If the editor still shows errors, reload the TypeScript language server (`Ctrl+Shift+P` → "TypeScript: Restart TS Server" in VS Code).

**`esbuild` binary missing / `tsup` fails**
```bash
pnpm install   # re-runs esbuild postinstall
```

**Port already in use**
Kill the process using that port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**Workspace package not found (`@web3nz/shared` import error at runtime)**
```bash
pnpm --filter @web3nz/shared build
pnpm --filter @web3nz/paywall-middleware build
pnpm --filter @web3nz/agent-sdk build
```
