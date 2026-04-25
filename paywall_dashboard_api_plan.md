# Paywall Middleware Dashboard API Integration Plan

## Goal

Update the paywall flow so product configuration lives in `dashboard-backend`, and `paywall-middleware` retrieves product information from that API at request time using a product API key.

This lets merchants change product name, description, price, status, receiving wallet, and account network in the dashboard without rebuilding or redeploying the business API.

The dashboard backend should own the merchant account network. The middleware should learn which chain to use from dashboard-backend instead of receiving `network` in `createPaywall`.

Do not implement this plan until explicitly instructed.

---

## Current State

### Dashboard Backend

`apps/dashboard-backend/src/server.ts` stores merchant/product data in:

```text
data/dashboard.json
```

It already has product concepts:

```ts
interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: string;
  status: 'active' | 'inactive';
  resource: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
}
```

It also exposes a gateway lookup endpoint:

```text
GET /api/gateway/products/by-key/:apiKey
```

That endpoint should become the stable runtime contract used by middleware.

### Paywall Middleware

`packages/paywall-middleware/src/index.ts` currently receives static route pricing:

```ts
paywall.protect({ price: '0.01' })
```

The middleware calculates base units locally and validates payment against that static value.

### Demo Business App

`apps/demo-business/src/server.ts` currently hardcodes:

```ts
app.get('/premium', paywall.protect({ price: '0.01' }), handler);
```

This should become API-key driven at middleware creation time:

```ts
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);
app.get('/premium', paywall.protect(), handler);
```

---

## Target Architecture

Keep the repo structure as-is:

```text
apps/dashboard-backend      owns merchant/product config
packages/paywall-middleware reusable middleware, fetches config over HTTP
apps/demo-business          passes product API key to middleware
packages/shared             shared TypeScript contracts
```

The middleware must not read `data/dashboard.json` directly and must not import dashboard-backend internals. The API boundary should be HTTP.

---

## Phase 1: Add Shared Runtime Contract

Update `packages/shared/src/types.ts` with a shared gateway product type.

```ts
export interface GatewayProductConfig {
  productId: string;
  name: string;
  description: string;
  resource: string;
  price: string; // USDC base units
  network: NetworkName;
  payTo: `0x${string}`;
  status: 'active' | 'inactive';
}
```

Reason:

```text
dashboard-backend and paywall-middleware should agree on one response shape
price stays in base units to avoid float rounding
network comes from the merchant account in dashboard-backend
payTo comes from merchant wallet settings in dashboard-backend
status lets middleware reject inactive products
name/description are available for richer payment metadata or UI
```

---

## Phase 2: Expose Product Runtime Data From Dashboard Backend

Update `apps/dashboard-backend/src/server.ts`.

Endpoint:

```text
GET /api/gateway/products/by-key/:apiKey
```

Response:

```ts
GatewayProductConfig
```

Example:

```json
{
  "productId": "321ab425-527c-48c0-801e-bb9250b620f8",
  "name": "Basic weather",
  "description": "Simple weather endpoint",
  "resource": "/products/321ab425-527c-48c0-801e-bb9250b620f8/access",
  "price": "1000000",
  "network": "avalanche-fuji",
  "payTo": "0x1234567890abcdef1234567890abcdef12345678",
  "status": "active"
}
```

Validation:

```text
404 if API key does not match a product
404 if product's merchant account does not exist
409 or 422 if merchant wallet address is missing
payTo must be populated from the merchant's walletAddress
network must be populated from the merchant account and be a supported `NetworkName`
return inactive products with status inactive, or reject them explicitly
```

Recommendation:

Return inactive products with `status: 'inactive'` and let middleware produce the payment rejection. That keeps the endpoint descriptive and lets middleware control runtime behavior.

Security note:

This endpoint is intentionally accessible by API key. Treat product API keys as credentials. Do not expose merchant email, password, 2FA flags, or internal account data.

---

## Phase 3: Update Middleware Public API

Update `packages/paywall-middleware/src/index.ts`.

Current:

```ts
export interface PaywallConfig {
  network: NetworkName;
  recipientAddress: `0x${string}`;
  facilitatorPrivateKey: `0x${string}`;
}

export interface ProtectOptions {
  price: string;
}
```

Target:

```ts
export function createPaywall(apiKey: string) {
  return {
    protect() {
      // middleware
    },
  };
}
```

Remove `network`, `recipientAddress`, static `price`, `facilitatorPrivateKey`, `dashboardBackendUrl`, and `productCacheTtlMs` from `createPaywall` arguments.

Runtime settings that are not product-specific should come from environment variables:

```env
DASHBOARD_BACKEND_URL=http://localhost:3001
PAYWALL_PRIVATE_KEY=0x...
PRODUCT_CONFIG_CACHE_TTL_MS=30000
```

The product-specific settings and account-level merchant settings should come from dashboard-backend:

```text
price
payTo
network
resource
name
description
status
```

Recommendation:

Use the breaking change for clarity. `createPaywall` should only accept an API key, and `protect` should not accept route-level product config. Dashboard-backend should be the single source of truth for product payment amount/resource/metadata and account recipient address/network.

---

## Phase 4: Add Middleware Product Lookup Helper

Add product lookup helpers inside `packages/paywall-middleware/src/index.ts` or a new local file if the middleware grows.

The middleware should not ping `dashboard-backend` on every request. It should cache product config by API key and refresh periodically after a TTL expires.

Recommended default:

```ts
const DEFAULT_PRODUCT_CACHE_TTL_MS = 30_000;
```

Cache shape:

```ts
type ProductCacheEntry = {
  product: GatewayProductConfig;
  fetchedAt: number;
};

const productCache = new Map<string, ProductCacheEntry>();
```

Network fetch helper:

```ts
async function fetchProductConfig(
  apiKey: string,
): Promise<GatewayProductConfig> {
  const dashboardBackendUrl = process.env.DASHBOARD_BACKEND_URL || 'http://localhost:3001';
  const url = new URL(`/api/gateway/products/by-key/${encodeURIComponent(apiKey)}`, dashboardBackendUrl);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Product lookup failed: ${res.status}`);
  }

  return res.json() as Promise<GatewayProductConfig>;
}
```

Cached lookup helper:

```ts
async function getProductConfig(
  apiKey: string,
): Promise<GatewayProductConfig> {
  const cacheTtlMs = Number(process.env.PRODUCT_CONFIG_CACHE_TTL_MS ?? DEFAULT_PRODUCT_CACHE_TTL_MS);
  const cached = productCache.get(apiKey);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < cacheTtlMs) {
    return cached.product;
  }

  const product = await fetchProductConfig(apiKey);
  productCache.set(apiKey, { product, fetchedAt: now });
  return product;
}
```

Behavior:

```text
first request for an apiKey fetches from dashboard-backend
subsequent requests use cache until TTL expires
after TTL expires, middleware refreshes from dashboard-backend and replaces cache
uses dashboard URL from `DASHBOARD_BACKEND_URL`
uses apiKey from `createPaywall(apiKey)`
uses TTL from `PRODUCT_CONFIG_CACHE_TTL_MS`, defaulting to 30000
```

Refresh failure behavior:

```text
if no cache exists and dashboard-backend is unavailable, fail closed and return a 402/503-style error
if stale cache exists and refresh fails, prefer fail closed for payment correctness
```

Recommendation:

Fail closed when refresh fails. A stale cached price could allow underpayment after a merchant raises a price or disables a product. If availability matters more later, add an explicit `allowStaleProductConfigOnError` option with a bounded stale window.

---

## Phase 5: Update 402 Payment Requirements

Middleware should use product data from dashboard backend:

```ts
const product = await getProductConfig(apiKey);
```

For requests without `X-Payment`, build requirements using:

```ts
maxAmountRequired: product.price
network: product.network
resource: product.resource
payTo: product.payTo
asset: NETWORKS[product.network].usdcAddress
```

Also include product metadata in the response where useful:

```json
{
  "x402Version": 1,
  "product": {
    "id": "...",
    "name": "...",
    "description": "..."
  },
  "accepts": [...]
}
```

Reject before returning requirements if:

```text
product.status !== 'active'
product.payTo is missing or invalid
returned network is unsupported
```

---

## Phase 6: Update Payment Validation

When `X-Payment` is present, middleware should fetch the same product config and validate:

```text
product.status === 'active'
authorization.to === product.payTo
BigInt(authorization.value) >= BigInt(product.price)
authorization validAfter/validBefore window is valid
the returned account network is used to select chain and USDC asset
```

The middleware should create or reuse viem clients based on the returned account network:

```ts
const { chain, usdcAddress } = NETWORKS[product.network];
```

The facilitator private key should come from `PAYWALL_PRIVATE_KEY`, not from `createPaywall`.

Resource validation decision:

The current middleware logs `resource: req.path`. Once product config is API-driven, prefer logging:

```ts
resource: product.resource
```

Also consider validating that the current route matches product resource.

Two viable approaches:

1. Product resource equals actual route path, such as `/premium`.
2. Product resource is an abstract product path, such as `/products/:id/access`, and the API key is the source of truth.

Recommendation:

For the current repo, use the API key as the source of truth and log `product.resource`. This avoids forcing demo-business routes to mirror dashboard-generated product resource paths.

Future improvement:

Allow merchants to set product resource manually in the dashboard so the stored product resource can match the business API route.

---

## Phase 7: Update Transaction Logging

Currently transactions are logged with:

```ts
resource: req.path
```

Change to:

```ts
resource: product.resource
```

Reason:

The dashboard matches product payments by:

```ts
transaction.resource === product.resource
```

If middleware logs `req.path` while products store generated resource paths, product payment history will not match.

Optional future improvement:

Extend `Transaction` with:

```ts
productId?: string;
productName?: string;
```

Do not do this immediately unless dashboard matching needs to become more reliable than resource string matching.

---

## Phase 8: Update Demo Business App

Update `apps/demo-business/src/server.ts`.

Current:

```ts
const paywall = createPaywall({
  network: 'avalanche-fuji',
  recipientAddress: process.env.BUSINESS_WALLET_ADDRESS as `0x${string}`,
  facilitatorPrivateKey: process.env.PAYWALL_PRIVATE_KEY as `0x${string}`,
});

app.get('/premium', paywall.protect({ price: '0.01' }), handler);
```

Target:

```ts
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);

app.get('/premium', paywall.protect(), handler);
```

Add env vars:

```env
DASHBOARD_BACKEND_URL=http://localhost:3001
PRODUCT_API_KEY=pk_live_...
PAYWALL_PRIVATE_KEY=0x...
PRODUCT_CONFIG_CACHE_TTL_MS=30000
```

Remove this env var from `demo-business` usage:

```env
BUSINESS_WALLET_ADDRESS
```

The payment recipient now comes from the merchant wallet stored in dashboard-backend and returned as `payTo`. The network comes from the merchant account stored in dashboard-backend and is returned as `network`.

---

## Phase 9: Update Docs

Update relevant docs:

```text
docs/03-paywall-middleware.md
docs/05-demo-business.md
docs/07-dashboard-backend.md
docs/SETUP.md
docs/TESTING.md
```

Docs should explain:

```text
product config is owned by dashboard-backend
middleware fetches product config by API key
price is stored in USDC base units
network is stored on the dashboard merchant account and returned to middleware
merchant wallet becomes the payment recipient
transactions are logged with product.resource
demo-business requires PRODUCT_API_KEY
```

---

## Open Decisions

### Should product resource equal the business route?

Current recommendation:

Use API key as the source of truth and log `product.resource`.

Longer-term:

Allow merchants to configure the resource path in the dashboard so it can match actual business API routes like `/premium`.

### Should inactive products return 404 from dashboard backend?

Current recommendation:

Return the product with `status: 'inactive'`. Middleware can return a clear runtime error.

Longer-term:

Consider `403 Product inactive` if API consumers should not receive inactive product details.
