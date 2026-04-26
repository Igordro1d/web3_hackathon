# packages/paywall-middleware

**Package name:** `@web3nz/glyde`  
**Location:** `packages/paywall-middleware/`  
**Built with:** `tsup` -> CJS, ESM, and `.d.ts`

---

## Purpose

Express middleware that protects a route with x402 payment. Product configuration is not hardcoded in the business API. Instead, the middleware receives a product API key and periodically fetches the product runtime config from `dashboard-backend`.

The dashboard product config is the source of truth for:

```text
name
description
price
payTo
network
resource
status
```

---

## Public API

### `createPaywall(apiKey: string)`

Factory function. Call once at server startup with the product API key.

```ts
import { createPaywall } from '@web3nz/glyde';

const paywall = createPaywall(process.env.PRODUCT_API_KEY!);

app.get('/premium', paywall.protect(), (req, res) => {
  res.json({ data: 'paid content' });
});
```

`createPaywall` no longer accepts `network`, `recipientAddress`, static route price, dashboard URL, or facilitator private key. Product-specific configuration and account-wide merchant settings come from `dashboard-backend`; operational settings come from environment variables.

Required environment variables:

```env
DASHBOARD_BACKEND_URL=http://localhost:3001
PAYWALL_PRIVATE_KEY=0x...
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

Optional environment variable:

```env
PRODUCT_CONFIG_CACHE_TTL_MS=30000
```

### `paywall.protect()`

Returns an Express middleware function.

The protected route only runs after the middleware verifies payment and settles the USDC transfer on-chain.

---

## Product Lookup

The middleware fetches product configuration from:

```text
GET /api/gateway/products/by-key/:apiKey
```

Expected response:

```ts
interface GatewayProductConfig {
  productId: string;
  name: string;
  description: string;
  resource: string;
  price: string;
  network: 'avalanche-fuji' | 'avalanche';
  payTo: `0x${string}`;
  status: 'active' | 'inactive';
}
```

`price` is USDC base units. For example, `1000000` is `1.000000` USDC.

---

## Product Cache

The middleware does not ping `dashboard-backend` on every request. It caches product config by API key.

Default TTL:

```text
30000 ms
```

Flow:

```text
first request -> fetch product config from dashboard-backend
subsequent requests within TTL -> use cached product config
after TTL expires -> fetch fresh product config and replace cache
```

If refresh fails, the middleware fails closed instead of accepting a stale cached price/status. This avoids accepting underpayment after a merchant raises a price or disables a product.

---

## Payment Flow

### 1. Fetch Product Config

The middleware retrieves or refreshes cached product config using the API key passed to `createPaywall`.

Inactive products or products with invalid `payTo` values are rejected before a payment challenge is created.

### 2. Issue 402 Challenge

If the request has no `X-Payment` header, the middleware returns:

```ts
const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: product.network,
  maxAmountRequired: product.price,
  resource: product.resource,
  payTo: product.payTo,
  asset: NETWORKS[product.network].usdcAddress,
  maxTimeoutSeconds: 60,
};
```

The response also includes product metadata:

```json
{
  "x402Version": 1,
  "product": {
    "id": "...",
    "name": "...",
    "description": "..."
  },
  "accepts": ["..."]
}
```

### 3. Validate Payment

When `X-Payment` is present, the middleware validates:

```text
product.status === active
authorization.to === product.payTo
authorization.value >= product.price
authorization is within validAfter/validBefore
```

`product.network` is the merchant account network returned by `dashboard-backend`; it selects the chain and USDC contract from `NETWORKS`.

### 4. Settle On-Chain

The middleware uses `PAYWALL_PRIVATE_KEY` as the facilitator wallet and calls USDC `transferWithAuthorization` on the merchant account network.

The facilitator wallet pays gas and does not need to hold USDC.

### 5. Persist Transaction

After settlement, the middleware inserts a `Transaction` into:

```text
public.transactions (Supabase)
```

The logged `resource` is `product.resource`, not the Express route path. This lets the dashboard match payments back to products.

---

## Dependency Graph

```text
@web3nz/glyde
├── @web3nz/shared    # GatewayProductConfig, PaymentRequirements, NETWORKS
├── viem              # on-chain interaction
├── @supabase/supabase-js (via @web3nz/shared) # transaction persistence
└── express           # Request / Response / NextFunction types
```
