# packages/paywall-middleware

**Package name:** `@web3nz/paywall-middleware`  
**Location:** `packages/paywall-middleware/`  
**Built with:** `tsup` → outputs CJS, ESM, and `.d.ts`  
**Status:** Scaffold (stub) — the public API and types are in place; on-chain logic is a TODO

---

## Purpose

This is the server-side half of the payment protocol. It is an Express middleware factory. A business wraps any Express route with `paywall.protect(...)` and the middleware takes over:

1. Checks whether the incoming request carries a valid payment authorisation.
2. If not → responds with `402 Payment Required` and a JSON `PaymentRequirements` body.
3. If yes → verifies the EIP-712 signature, submits the on-chain `transferWithAuthorization` call, waits for confirmation, writes the `Transaction` record, then calls `next()` to pass control to the actual route handler.

---

## Public API

### `createPaywall(config: PaywallConfig)`

Factory function. Call once at server startup, reuse the result for multiple routes.

```ts
import { createPaywall } from '@web3nz/paywall-middleware';

const paywall = createPaywall({
  network: 'avalanche-fuji',
  recipientAddress: '0xYourBusinessWallet',
  facilitatorPrivateKey: '0xYourSettlementKey',
});
```

Returns an object with a single method: `protect`.

#### `PaywallConfig`

```ts
interface PaywallConfig {
  network: NetworkName;               // 'avalanche-fuji' | 'avalanche'
  recipientAddress: `0x${string}`;    // USDC destination (business wallet)
  facilitatorPrivateKey: `0x${string}`; // key that submits on-chain txs + pays gas
}
```

- **`network`** — selects the chain and USDC address from `NETWORKS` in `@web3nz/shared`.
- **`recipientAddress`** — where collected USDC lands. In a real deployment this would be a smart contract treasury, not an EOA.
- **`facilitatorPrivateKey`** — the private key used to call `transferWithAuthorization` on-chain. This wallet must hold AVAX for gas. It does NOT need to hold USDC — it only relays the agent's pre-signed authorisation.

---

### `paywall.protect(options: ProtectOptions)`

Returns an Express middleware function `(req, res, next) => Promise<void>`.

```ts
app.get('/premium', paywall.protect({ price: '0.01' }), (req, res) => {
  res.json({ data: '...' });
});
```

#### `ProtectOptions`

```ts
interface ProtectOptions {
  price: string; // human-readable USDC, e.g. "0.01" = 1 cent
}
```

`price` is specified in human-readable USDC (dollars and cents), not base units. The middleware is responsible for converting it to 6-decimal base units before embedding it in `PaymentRequirements.maxAmountRequired`.

---

## Current State (Stub)

```ts
protect(options: ProtectOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // TODO: implement 402 response, signature validation, settlement
    console.log('[paywall] stub middleware called', { config, options });
    next(); // passes through unconditionally — nothing is checked or charged
  };
}
```

Currently calls `next()` immediately, meaning all requests pass through without payment. This lets `demo-business` run end-to-end during development while the real logic is being built.

---

## Intended Implementation (what goes in the TODO)

The full middleware needs to do the following in sequence:

### Step 1 — Check for a payment header

Look for `X-Payment` in the request headers. If absent, skip to step 2. If present, parse it as JSON into a `TransferAuthorization` object.

### Step 2 — Issue a 402 challenge (if no payment header)

```ts
const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: config.network,
  maxAmountRequired: parseUnits(options.price, 6).toString(), // viem helper
  resource: req.originalUrl,
  payTo: config.recipientAddress,
  asset: NETWORKS[config.network].usdcAddress,
  maxTimeoutSeconds: 300,
};
res.status(402).json(requirements);
return;
```

The agent reads this and comes back with a signature.

### Step 3 — Validate the signature

Use viem's `verifyTypedData` with `TRANSFER_WITH_AUTH_TYPES` and `getUsdcDomain(chainId, usdcAddress)` from `@web3nz/shared`. Confirm:
- The recovered signer address matches `authorization.from`.
- `authorization.to` matches `config.recipientAddress`.
- `authorization.value` is at least `maxAmountRequired`.
- `authorization.validBefore` is far enough in the future (not already expired).

### Step 4 — Submit the on-chain transaction

Create a viem `walletClient` using `config.facilitatorPrivateKey` and the chain from `NETWORKS[config.network].chain`. Call:

```ts
await walletClient.writeContract({
  address: NETWORKS[config.network].usdcAddress,
  abi: usdcAbi,             // ERC-3009 ABI fragment
  functionName: 'transferWithAuthorization',
  args: [
    authorization.from,
    authorization.to,
    BigInt(authorization.value),
    BigInt(authorization.validAfter),
    BigInt(authorization.validBefore),
    authorization.nonce,
    authorization.v,
    authorization.r,
    authorization.s,
  ],
});
```

Wait for the transaction receipt using `publicClient.waitForTransactionReceipt`.

### Step 5 — Persist the transaction record

Append a `Transaction` record to `data/transactions.json` via `lowdb`. This is what the dashboard reads.

### Step 6 — Call `next()`

Pass control to the actual route handler. The route response is the "paid content".

---

## Dependency Graph

```
@web3nz/paywall-middleware
├── @web3nz/shared    (workspace:*)  — types, network config, EIP-712 helpers
├── viem              (^2.21.0)      — on-chain interaction
└── express           (^4.21.0)      — Request / Response / NextFunction types only
```

Express is listed as a `dependency` rather than `peerDependency` to keep the install simple for a hackathon. In a production library it would be a peer dependency.
