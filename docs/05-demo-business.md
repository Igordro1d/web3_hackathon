# apps/demo-business

**Package name:** `demo-business`  
**Location:** `apps/demo-business/`  
**Runtime:** Node.js via `tsx watch`  
**Port:** `3000`

---

## Purpose

A minimal Express server that demonstrates how a business integrates `@web3nz/paywall-middleware`. It exposes one free endpoint and one paywalled endpoint.

The business app does not hardcode product price, recipient wallet, or network. It passes a product API key into the middleware, and the middleware resolves product config plus account-wide merchant settings from `dashboard-backend`.

---

## Entry Point

`apps/demo-business/src/server.ts`

```ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });

import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';
```

The repo-root `.env` is loaded before creating the paywall.

---

## Paywall Initialization

```ts
const productApiKey = process.env.PRODUCT_API_KEY;
if (!productApiKey) {
  throw new Error('PRODUCT_API_KEY is required');
}

const paywall = createPaywall(productApiKey);
```

The API key identifies the product configured in the dashboard.

Required `.env` values for the paywalled route:

```env
PRODUCT_API_KEY=pk_live_...
DASHBOARD_BACKEND_URL=http://localhost:3001
PAYWALL_PRIVATE_KEY=0x...
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

`BUSINESS_WALLET_ADDRESS` is no longer used by `demo-business`. The receiving wallet comes from the merchant account in `dashboard-backend` and is returned to middleware as `payTo`.

The merchant account network also comes from `dashboard-backend`, so `demo-business` does not pass a network into `createPaywall`.

---

## Routes

### `GET /free`

```ts
app.get('/free', (req, res) => {
  res.json({ message: 'This is free content' });
});
```

No middleware. Returns immediately.

### `GET /premium`

```ts
app.get('/premium', paywall.protect(), (req, res) => {
  res.json({ message: 'This is premium paid content', secret: 42 });
});
```

`paywall.protect()` runs before the route handler.

Requests without `X-Payment` receive a `402 Payment Required` response containing:

```text
product name
product description
price
network
payTo
resource
USDC asset
```

Requests with a valid payment authorization are settled on-chain before the route handler runs.

---

## Dev Command

```bash
pnpm --filter demo-business dev
```

---

## Dependency Graph

```text
demo-business
├── @web3nz/paywall-middleware
├── @web3nz/shared
├── express
├── lowdb
└── dotenv
```
