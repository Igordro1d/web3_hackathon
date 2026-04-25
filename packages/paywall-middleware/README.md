# @web3nz/paywall-middleware

Express middleware that paywalls API endpoints using the [x402 protocol](https://x402.org) — AI agents pay per request in USDC on Avalanche, settled on-chain in ~2 seconds.

## How it works

1. Agent hits your endpoint with no payment → middleware returns `402 Payment Required` with payment details
2. Agent signs an EIP-712 `TransferWithAuthorization` off-chain (gasless for the agent)
3. Agent retries with `X-Payment` header containing the signature
4. Middleware validates the signature, calls `transferWithAuthorization()` on the USDC contract
5. USDC moves directly from agent wallet → your wallet on-chain
6. Your handler runs and serves the response

The agent never needs AVAX for gas — your server pays gas, the agent only needs USDC.

## Installation

```bash
npm install @web3nz/paywall-middleware
```

## Prerequisites

- A wallet with **AVAX** on Avalanche C-Chain (to pay gas for settlements)
- `RPC_URL` environment variable pointing to an Avalanche JSON-RPC endpoint

**Fuji testnet (development):**
```
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

**Mainnet:**
```
RPC_URL=https://api.avax.network/ext/bc/C/rpc
```

## Quick start

```typescript
import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';

const app = express();

const paywall = createPaywall({
  network: 'avalanche-fuji',           // or 'avalanche' for mainnet
  recipientAddress: '0xYourWallet',    // where USDC lands after payment
  facilitatorPrivateKey: '0x...',      // your server's private key — pays gas
});

// Free endpoint
app.get('/free', (req, res) => {
  res.json({ message: 'free content' });
});

// Paywalled endpoint — 0.01 USDC per request
app.get('/premium', paywall.protect({ price: '0.01' }), (req, res) => {
  res.json({ message: 'premium content' });
});

app.listen(3000);
```

## API Reference

### `createPaywall(config)`

Creates a paywall instance.

| Parameter | Type | Description |
|---|---|---|
| `config.network` | `'avalanche-fuji' \| 'avalanche'` | Blockchain network |
| `config.recipientAddress` | `0x${string}` | Your wallet address — receives USDC |
| `config.facilitatorPrivateKey` | `0x${string}` | Private key of wallet that submits txs (needs AVAX for gas) |

Returns an object with a `protect` method.

### `paywall.protect(options)`

Express middleware factory. Place before your route handler.

| Parameter | Type | Description |
|---|---|---|
| `options.price` | `string` | Human-readable USDC amount, e.g. `'0.01'` |

**Without payment** — returns `402`:
```json
{
  "x402Version": 1,
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

**With valid payment** — calls `next()` and adds header:
```
X-PAYMENT-RESPONSE: {"txHash":"0x...","status":"confirmed"}
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RPC_URL` | Yes | Avalanche JSON-RPC endpoint |

## Supported networks

| Network | Chain ID | USDC Contract |
|---|---|---|
| `avalanche-fuji` (testnet) | 43113 | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `avalanche` (mainnet) | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## Transaction log

Settled transactions are written to `data/transactions.json` in your project root. Each entry:

```json
{
  "id": "uuid",
  "txHash": "0x...",
  "from": "0xAgentWallet",
  "to": "0xYourWallet",
  "amount": "10000",
  "resource": "/premium",
  "timestamp": 1234567890
}
```

## License

MIT
