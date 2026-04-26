# Welcome to Glyde

Glyde is an Express SDK for turning API routes into pay-per-request endpoints.

It uses the x402 payment flow so AI agents and automated clients can pay for API access with USDC on Avalanche. Your server returns a `402 Payment Required` challenge, the client signs a payment authorization, and the middleware settles the payment on-chain before your route handler runs.

Use Glyde when you want to sell access to an API without building subscriptions, invoices, or per-customer billing logic. Product pricing, merchant settings, and API keys are managed in the [Glyde dashboard](https://glyde-seven.vercel.app); your Express app only needs the product API key.

## How It Works

1. Create a product in the [Glyde dashboard](https://glyde-seven.vercel.app).
2. Copy the product API key into your API server.
3. Add `paywall.protect()` to the Express route you want to monetize.
4. An unpaid request receives a `402 Payment Required` response with payment requirements.
5. The client signs a USDC payment authorization and retries with `X-Payment`.
6. The middleware validates and settles the transfer on-chain.
7. Your route handler runs and returns the paid content.

The paying agent wallet needs USDC. Your server's facilitator wallet pays AVAX gas for settlement.

## Start Here

- [Quickstart](./quickstart.md) shows the fastest path from installation to a protected Express route.
- [API Reference](./api-reference.md) documents `createPaywall`, `paywall.protect()`, response shapes, and runtime errors.
- [Configuration](./configuration.md) explains environment variables, dashboard product config, wallet roles, and supported networks.
- [Payment Protocol](./payment-protocol.md) walks through the 402 challenge, `X-Payment` retry, settlement, and dashboard payment records.
- [Troubleshooting](./troubleshooting.md) maps common errors to likely fixes.

## Install

Install the SDK from npm:

```bash
npm install @web3nz/glyde
```

Import it into your Express app:

```ts
import { createPaywall } from '@web3nz/glyde';
```

Create a paywall from your dashboard product API key, then place `paywall.protect()` before the handler for any paid route.

```ts
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);

app.get('/premium', paywall.protect(), (_req, res) => {
  res.json({ message: 'paid content' });
});
```
