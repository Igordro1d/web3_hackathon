# API Reference

## `createPaywall(apiKey: string)`

Creates a paywall instance for one dashboard product.

```ts
import { createPaywall } from '@web3nz/glyde';

const paywall = createPaywall(process.env.PRODUCT_API_KEY!);
```

### Parameters

| Name     | Type     | Required | Description                                      |
| -------- | -------- | -------- | ------------------------------------------------ |
| `apiKey` | `string` | Yes      | Product API key copied from the Glyde dashboard. |

### Returns

An object with:

| Name      | Type                           | Description                              |
| --------- | ------------------------------ | ---------------------------------------- |
| `protect` | `() => express.RequestHandler` | Creates middleware for protected routes. |

### Throws

`createPaywall` throws immediately if `apiKey` is empty.

```text
createPaywall requires a product API key
```

## `paywall.protect()`

Returns Express middleware. Place it before the route handler that should only run after payment settles.

```ts
app.get('/premium', paywall.protect(), (_req, res) => {
  res.json({ data: 'paid content' });
});
```

### Request Without Payment

If `X-Payment` is missing, the middleware responds with `402`.

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

`maxAmountRequired` uses USDC base units. USDC has 6 decimals, so `10000` is `0.01` USDC and `1000000` is `1` USDC.

### Request With Valid Payment

If payment is valid and settlement confirms on-chain:

- Glyde records the settled payment for dashboard history and analytics.
- The middleware sets `X-PAYMENT-RESPONSE`.
- The middleware calls `next()`.

```http
X-PAYMENT-RESPONSE: {"txHash":"0x...","status":"confirmed"}
```

### Runtime Errors

| Status | Body                                                            | Cause                                                                     |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `402`  | `{ "error": "Product is inactive" }`                            | Dashboard product status is not active.                                   |
| `402`  | `{ "error": "Product payment recipient is invalid" }`           | Dashboard returned an invalid `payTo` address.                            |
| `402`  | `{ "error": "Invalid payment recipient" }`                      | Authorization pays a different address than the dashboard product.        |
| `402`  | `{ "error": "Insufficient payment amount" }`                    | Authorization value is below the product price.                           |
| `402`  | `{ "error": "Payment authorization expired or not yet valid" }` | Authorization validity window does not include the current time.          |
| `402`  | `{ "error": "Payment settlement failed" }`                      | On-chain settlement failed or the payment payload could not be processed. |
| `503`  | `{ "error": "Product configuration unavailable" }`              | Product lookup from Glyde failed.                                         |

## Type Shapes

```ts
type NetworkName = 'avalanche-fuji' | 'avalanche';

interface GatewayProductConfig {
  productId: string;
  name: string;
  description: string;
  resource: string;
  price: string;
  network: NetworkName;
  payTo: `0x${string}`;
  status: 'active' | 'inactive';
}

interface PaymentRequirements {
  scheme: 'exact';
  network: NetworkName;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}
```
