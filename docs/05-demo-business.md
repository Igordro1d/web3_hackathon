# apps/demo-business

**Package name:** `demo-business`  
**Location:** `apps/demo-business/`  
**Runtime:** Node.js via `tsx watch` (no compile step in dev)  
**Port:** `3000`

---

## Purpose

A minimal Express server that demonstrates how a real business would integrate `@web3nz/paywall-middleware`. It exposes two endpoints — one free and one paywalled — to show the contrast between open and protected routes.

In the full system this server represents any API provider: a data feed, an AI inference endpoint, a file storage service, or any HTTP resource that wants to monetise access without requiring user accounts or subscriptions.

---

## Entry Point: `src/server.ts`

### Imports and setup

```ts
import 'dotenv/config';
import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';
```

`dotenv/config` is a side-effect import — it reads `.env` from the project root and populates `process.env` before any other code runs. This must be the first import.

### Paywall initialisation

```ts
const paywall = createPaywall({
  network: 'avalanche-fuji',
  recipientAddress: (process.env.BUSINESS_WALLET_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  facilitatorPrivateKey: (process.env.PAYWALL_PRIVATE_KEY || '0x0') as `0x${string}`,
});
```

`createPaywall` is called once at startup, not per-request. The returned `paywall` object holds the config in closure — it is not stateful beyond that.

The zero-address fallback (`0x000...000`) and `'0x0'` key fallback mean the server can start and accept requests without `.env` being populated. Once the real middleware logic is implemented, a missing key would cause the settlement transaction to fail, but the server would still boot cleanly.

### Routes

#### `GET /free`

```ts
app.get('/free', (req, res) => {
  res.json({ message: 'This is free content' });
});
```

No middleware. Returns immediately. Used to verify the server is up and to contrast with the paywalled route.

#### `GET /premium`

```ts
app.get('/premium', paywall.protect({ price: '0.01' }), (req, res) => {
  res.json({ message: 'This is premium paid content', secret: 42 });
});
```

`paywall.protect({ price: '0.01' })` is inserted as a middleware in the Express chain before the route handler. Express calls middleware left-to-right; the route handler only runs if the middleware calls `next()`.

With the current stub middleware, `next()` is always called so both routes return their payloads freely. Once the real middleware is in place:
- Requests without `X-Payment` → `402` with `PaymentRequirements` JSON.
- Requests with a valid, settled `X-Payment` → `200` with `{ message, secret }`.

`price: '0.01'` means 1 US cent in USDC. The middleware converts this to `10000` in base units (USDC has 6 decimals: `0.01 * 10^6 = 10000`).

### Server start

```ts
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Demo business running on http://localhost:${PORT}`);
});
```

Port is hardcoded. In a real deployment this would read from `process.env.PORT`.

---

## Dev command

```bash
pnpm --filter demo-business dev
# runs: tsx watch src/server.ts
```

`tsx watch` restarts the process automatically on file save. No separate TypeScript compilation step — `tsx` compiles and runs on the fly.

---

## Dependency Graph

```
demo-business
├── @web3nz/paywall-middleware  (workspace:*)
├── @web3nz/shared              (workspace:*)
├── express                     (^4.21.0)
├── lowdb                       (^7.0.1)   — available but not yet wired up
└── dotenv                      (^16.4.0)
```

`lowdb` is listed as a dependency in anticipation of the middleware writing `Transaction` records to `data/transactions.json`. The demo-business server itself won't write directly — the middleware will — but listing it here keeps the dependency resolution straightforward.
