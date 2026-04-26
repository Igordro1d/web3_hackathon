# Quickstart

This guide adds the paywall middleware to an Express API.

## Prerequisites

- Node.js project with Express 4 or newer.
- A product created in the web3nz dashboard.
- The product API key from that dashboard product.
- A merchant receiving wallet configured in dashboard settings.
- A facilitator wallet private key with AVAX for gas on the selected network.
- An Avalanche RPC URL.

The paying agent wallet needs USDC. The agent does not need AVAX because your server submits the settlement transaction.

## Install

```bash
npm install @web3nz/paywall-middleware
```

## Configure Environment

```env
PRODUCT_API_KEY=product_api_key_from_dashboard
DASHBOARD_BACKEND_URL=http://localhost:3001
PAYWALL_PRIVATE_KEY=0x...
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRODUCT_CONFIG_CACHE_TTL_MS=30000
```

`PRODUCT_API_KEY` is read by your app. The middleware reads the other variables directly.

## Protect a Route

```ts
import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';

const app = express();
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/premium', paywall.protect(), (_req, res) => {
  res.json({
    message: 'paid content',
    generatedAt: new Date().toISOString(),
  });
});

app.listen(3000, () => {
  console.log('API listening on http://localhost:3000');
});
```

## Try the Flow

Request the protected endpoint without payment:

```bash
curl -i http://localhost:3000/premium
```

Expected response:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
```

```json
{
  "x402Version": 1,
  "product": {
    "id": "prod_abc123",
    "name": "Premium API",
    "description": "Paid API access"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "avalanche-fuji",
      "maxAmountRequired": "10000",
      "resource": "/premium",
      "payTo": "0xYourMerchantWallet",
      "asset": "0x5425890298aed601595a70AB815c96711a31Bc65",
      "maxTimeoutSeconds": 60
    }
  ],
  "error": "X-PAYMENT header is required"
}
```

Use `@web3nz/agent-sdk` or another x402-compatible client to sign the payment and retry with the `X-Payment` header.

