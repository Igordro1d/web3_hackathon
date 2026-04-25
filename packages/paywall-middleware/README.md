# @web3nz/paywall-middleware

Express middleware that paywalls API endpoints using the [x402 protocol](https://x402.org) — AI agents pay per request in USDC on Avalanche, settled on-chain in ~2 seconds.

## How it works

1. Create a product in the [web3nz dashboard](https://web3nz.io) and copy the API key
2. Drop `paywall.protect()` onto any Express route
3. When an agent hits your endpoint with no payment, the middleware returns `402 Payment Required` with your product's price and payment address — fetched automatically from the dashboard
4. The agent signs an EIP-712 `TransferWithAuthorization` off-chain (gasless for the agent) and retries
5. Middleware validates the signature, calls `transferWithAuthorization()` on the USDC contract
6. USDC moves directly from agent wallet → your wallet on-chain. Your handler runs.

The agent never needs AVAX for gas — your server pays gas from `PAYWALL_PRIVATE_KEY`.

## Installation

```bash
npm install @web3nz/paywall-middleware
```

## Prerequisites

- A product created in the [web3nz dashboard](https://web3nz.io) with price and receiving wallet configured
- A wallet funded with **AVAX** on Avalanche C-Chain to pay gas for settlements
- `PAYWALL_PRIVATE_KEY` and `RPC_URL` environment variables set

## Quick start

```typescript
import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';

const app = express();

// Pass your product API key from the web3nz dashboard
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);

// Free endpoint — no payment required
app.get('/free', (req, res) => {
  res.json({ message: 'free content' });
});

// Paywalled — price and recipient set in dashboard
app.get('/premium', paywall.protect(), (req, res) => {
  res.json({ message: 'premium content' });
});

app.listen(3000);
```

## API Reference

### `createPaywall(apiKey)`

Creates a paywall instance. Fetches product config (price, recipient, network) from the web3nz dashboard on first request and caches it.

| Parameter | Type | Description |
|---|---|---|
| `apiKey` | `string` | Product API key from the web3nz dashboard |

Returns an object with a `protect` method.

### `paywall.protect()`

Express middleware factory. Place before your route handler.

**Without payment** — returns `402`:
```json
{
  "x402Version": 1,
  "product": {
    "id": "prod_abc123",
    "name": "My API",
    "description": "Premium data endpoint"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "avalanche-fuji",
    "maxAmountRequired": "10000",
    "resource": "/premium",
    "payTo": "0xYourWallet",
    "asset": "0x5425890298aed601595a70AB815c96711a31Bc65",
    "maxTimeoutSeconds": 60
  }],
  "error": "X-PAYMENT header is required"
}
```

**With valid payment** — calls `next()` and sets header:
```
X-PAYMENT-RESPONSE: {"txHash":"0x...","status":"confirmed"}
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PAYWALL_PRIVATE_KEY` | Yes | Private key of wallet that submits on-chain txs (needs AVAX for gas) |
| `RPC_URL` | Yes | Avalanche JSON-RPC endpoint |
| `DASHBOARD_BACKEND_URL` | No | web3nz dashboard API base URL (default: `http://localhost:3001`) |
| `PRODUCT_CONFIG_CACHE_TTL_MS` | No | Product config cache duration in ms (default: `30000`) |

## Supported networks

| Network | Chain ID | USDC Contract |
|---|---|---|
| `avalanche-fuji` (testnet) | 43113 | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `avalanche` (mainnet) | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## License

MIT
