# Payment Protocol

The middleware implements an x402-style challenge and retry flow using USDC `transferWithAuthorization`.

## 1. Product Lookup

On a protected route, the middleware resolves the product API key passed to `createPaywall`.

```text
GET {DASHBOARD_BACKEND_URL}/api/gateway/products/by-key/{apiKey}
```

The returned product config controls the price, recipient, resource, network, and active status.

## 2. 402 Challenge

When the request does not include `X-Payment`, the middleware returns `402 Payment Required`.

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

The client should select one entry from `accepts`, sign a payment authorization, encode it as base64 JSON, and retry.

## 3. `X-Payment` Header

The SDK expects `X-Payment` to be base64-encoded JSON containing a payment payload with an EIP-3009 authorization and signature.

```ts
interface XPaymentPayload {
  x402Version: 1;
  scheme: 'exact';
  network: 'avalanche-fuji' | 'avalanche';
  payload: {
    authorization: {
      from: `0x${string}`;
      to: `0x${string}`;
      value: string;
      validAfter: number;
      validBefore: number;
      nonce: `0x${string}`;
    };
    signature: `0x${string}`;
  };
}
```

The middleware validates:

- `authorization.to` matches the dashboard product `payTo`.
- `authorization.value` is greater than or equal to the dashboard product `price`.
- The current time is inside `validAfter` and `validBefore`.
- The product is still active.

## 4. Settlement

After validation, the facilitator wallet calls USDC:

```text
transferWithAuthorization(
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
  v,
  r,
  s
)
```

The middleware waits for the transaction receipt before granting access. The route handler only runs after settlement confirms.

## 5. Success Response Header

On success, the downstream route receives the request and the HTTP response includes:

```http
X-PAYMENT-RESPONSE: {"txHash":"0x...","status":"confirmed"}
```

## 6. Transaction Log

Settled payments are appended to:

```text
data/transactions.json
```

Logged transaction shape:

```ts
interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  timestamp: number;
}
```

`resource` comes from dashboard product config, not from the Express route path. This keeps dashboard payment history aligned with product records.

