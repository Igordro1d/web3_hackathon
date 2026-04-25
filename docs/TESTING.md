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

The dashboard now requires a merchant session. Register in the UI, or use the local demo credentials when `data/dashboard.json` is seeded:

```text
merchant@example.com
password123
```

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

This route now uses `PRODUCT_API_KEY` to fetch product configuration from `dashboard-backend`. Start `dashboard-backend` first and make sure `.env` contains a product API key copied from the dashboard.

**Expected without `X-Payment`:**
```
HTTP 402 Payment Required
{ "product": { "name": "..." }, "accepts": [{ "network": "avalanche-fuji", "maxAmountRequired": "1000000", ... }] }
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

## Test 4 — Dashboard merchant API

```bash
curl http://localhost:3001/api/transactions
curl http://localhost:3001/api/stats
```

Compatibility endpoints still return raw transaction data and aggregate stats:
```json
{ "transactions": [] }
{ "totalRevenue": "0.000000", "count": 0 }
```

To test authenticated merchant APIs, log in first:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"merchant@example.com","password":"password123"}'
```

Use the returned token:

```bash
curl http://localhost:3001/api/dashboard/summary \
  -H "Authorization: Bearer <token>"

curl http://localhost:3001/api/products \
  -H "Authorization: Bearer <token>"
```

Create a product:

```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Weather API","description":"Pay-per-request endpoint","price":"1000000","status":"active"}'
```

Copy the returned product `apiKey` into `.env` as `PRODUCT_API_KEY`. Set the merchant payment network in dashboard settings. The browser dashboard at **http://localhost:5173** shows the same merchant product and payment data.

**Expected transaction behavior after payments settle:**
```json
{ "transactions": [ { "id": "...", "txHash": "0x...", "amount": "10000", ... } ] }
{ "totalRevenue": "0.010000", "count": 1 }
```

---

## Test 5 — Full end-to-end (once fully implemented)

1. Start all three services (Terminals 1–3 above).
2. Run the agent: `pnpm --filter demo-agent start`
3. The agent hits `/premium`; middleware fetches cached product config by API key, returns a `402`, signs a USDC `TransferWithAuthorization`, retries.
4. The middleware settles the payment on Fuji testnet and writes the transaction to `data/transactions.json`.
5. Refresh **http://localhost:5173** — the transaction appears in dashboard payment history when its `resource` matches a merchant product.

**To verify the on-chain settlement**, copy the `txHash` from the dashboard and look it up on [Snowtrace Fuji](https://testnet.snowtrace.io).

---

## What "working" looks like at each stage

| Stage | `/premium` returns | Agent output | Dashboard |
|---|---|---|---|
| Now (stubs) | `200` free content | Stub log + content | Empty |
| Middleware done | `402` challenge | Stub log + fails | Empty |
| Both packages done | `200` after payment | Content, no stub log | Transactions appear |
| Dashboard wired | same | same | Merchant login, products, API keys, payment history, live summary |
