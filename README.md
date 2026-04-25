# Web3NZ Hackathon — x402 Payment Gateway

An x402-style payment gateway middleware enabling AI agents to pay for API access using USDC on Avalanche C-Chain, with Aave integration for business treasury yield.

## Setup

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Install

```bash
# From the repo root
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env with your Fuji testnet RPC URL and wallet keys
```

### Run

```bash
# Business API server (port 3000)
pnpm dev:business

# AI agent demo
pnpm dev:agent

# Dashboard frontend (Vite, port 5173)
pnpm dev:dashboard

# Dashboard backend API (port 3001)
pnpm --filter dashboard-backend dev
```

### Build all packages

```bash
pnpm build
```

## Structure

```
packages/
  shared/              # Types, constants, EIP-712 helpers
  paywall-middleware/  # Express middleware for 402 payment flow
  agent-sdk/           # Agent-side HTTP client with auto-pay
apps/
  demo-business/       # Example API server using paywall middleware
  demo-agent/          # Example AI agent that pays for API access
  dashboard/           # React + Vite frontend dashboard
  dashboard-backend/   # Express API serving transaction data
data/                  # JSON storage (gitignored except .gitkeep)
```
