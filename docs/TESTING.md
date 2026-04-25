# Testing Guide

## Prerequisites
- Repo is set up and `pnpm install` has been run (see `SETUP.md`)
- `.env` exists at the repo root (copy from `.env.example`)

---

## Running the full stack

Open a separate terminal for each service.

```bash
# Terminal 1 — Business API (port 3000)
pnpm dev:business

# Terminal 2 — Dashboard backend (port 3001)
pnpm --filter dashboard-backend dev

# Terminal 3 — Dashboard frontend (port 5173)
pnpm dev:dashboard
```

Then open **http://localhost:5173** in your browser.

---

## Test 1 — Free endpoint (no payment)

```bash
curl http://localhost:3000/free
```

**Expected:**
```json
{ "message": "This is free content" }
```

---

## Test 2 — Premium endpoint (paywalled)

```bash
curl http://localhost:3000/premium
```

**Current behavior (stub middleware):**
```json
{ "message": "This is premium paid content", "secret": 42 }
```
Returns `200` because the middleware isn't enforcing payment yet.

**Expected behavior once middleware is implemented:**
```
HTTP 402 Payment Required
{ "scheme": "exact", "network": "avalanche-fuji", "maxAmountRequired": "10000", ... }
```

---

## Test 3 — Agent paying for premium content

In a fourth terminal, with the business server already running:

```bash
pnpm --filter demo-agent start
```

**Current behavior (stub SDK):**
```
[agent-sdk] stub payAndFetch called { config: { network: 'avalanche-fuji', ... }, url: '...' }
Agent received: { message: 'This is premium paid content', secret: 42 }
```

**Expected behavior once agent-sdk is implemented:**
```
Agent received: { message: 'This is premium paid content', secret: 42 }
```
No stub log — the agent silently handles the 402, signs the USDC authorisation, and retries.

---

## Test 4 — Dashboard data

```bash
curl http://localhost:3001/api/transactions
curl http://localhost:3001/api/stats
```

**Current behavior:**
```json
{ "transactions": [] }
{ "totalRevenue": "0", "count": 0 }
```

**Expected behavior once lowdb is wired up:**
```json
{ "transactions": [ { "id": "...", "txHash": "0x...", "amount": "10000", ... } ] }
{ "totalRevenue": "10000", "count": 1 }
```

The browser dashboard at **http://localhost:5173** will show the same data rendered as a list and chart.

---

## Test 5 — Full end-to-end (once fully implemented)

1. Start all three services (Terminals 1–3 above).
2. Run the agent: `pnpm --filter demo-agent start`
3. The agent hits `/premium`, receives a `402`, signs a USDC `TransferWithAuthorization`, retries.
4. The middleware settles the payment on Fuji testnet and writes the transaction to `data/transactions.json`.
5. Refresh **http://localhost:5173** — the transaction appears in the dashboard.

**To verify the on-chain settlement**, copy the `txHash` from the dashboard and look it up on [Snowtrace Fuji](https://testnet.snowtrace.io).

---

## What "working" looks like at each stage

| Stage | `/premium` returns | Agent output | Dashboard |
|---|---|---|---|
| Now (stubs) | `200` free content | Stub log + content | Empty |
| Middleware done | `402` challenge | Stub log + fails | Empty |
| Both packages done | `200` after payment | Content, no stub log | Transactions appear |
| Dashboard wired | same | same | Live chart + stats |
