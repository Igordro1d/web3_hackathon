# Configuration

Glyde uses a product API key at construction time and environment variables for runtime operation.

## Environment Variables

| Variable                      | Required | Default                          | Description                                                                                              |
| ----------------------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `PAYWALL_PRIVATE_KEY`         | Yes      | None                             | Facilitator wallet private key. This wallet submits USDC settlement transactions and needs AVAX for gas. |
| `RPC_URL`                     | Yes      | None                             | Avalanche JSON-RPC URL used by viem clients.                                                             |
| `DASHBOARD_BACKEND_URL`       | No       | `https://glyde-seven.vercel.app` | Glyde dashboard API base URL. Set this only for local development or self-hosted deployments.            |
| `PRODUCT_CONFIG_CACHE_TTL_MS` | No       | `30000`                          | Product config cache duration in milliseconds. Must be a positive number.                                |

Your application typically stores the dashboard product API key separately:

```env
PRODUCT_API_KEY=...
```

Then passes it to Glyde:

```ts
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);
```

## Dashboard Product Contract

Create and manage products in the [Glyde dashboard](https://glyde-seven.vercel.app). At runtime, the middleware fetches product configuration from:

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

Important details:

- `price` is USDC base units with 6 decimals.
- `payTo` is the merchant receiving wallet from dashboard account settings.
- `network` is the merchant account network from dashboard settings.
- `resource` is recorded with each payment so the dashboard can match payments back to products.
- `status` must be `active` before the middleware will issue a payment challenge.

## Product Config Cache

Product config is cached by API key.

```text
first request -> fetch from Glyde
within TTL -> use cached config
after TTL -> fetch fresh config
```

If refresh fails, the middleware responds with `503` instead of accepting stale product config. This avoids accepting underpayment after a merchant changes price or disables a product.

## Supported Networks

| Network          | Chain ID | USDC Contract                                |
| ---------------- | -------- | -------------------------------------------- |
| `avalanche-fuji` | `43113`  | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `avalanche`      | `43114`  | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## Wallet Roles

| Wallet             | Holds         | Used for                                                              |
| ------------------ | ------------- | --------------------------------------------------------------------- |
| Agent wallet       | USDC          | Signs the payment authorization.                                      |
| Merchant wallet    | Receives USDC | Stored as `payTo` in dashboard settings.                              |
| Facilitator wallet | AVAX for gas  | Configured as `PAYWALL_PRIVATE_KEY`; submits settlement transactions. |

## Payment Records

After an on-chain settlement confirms, Glyde records the payment for dashboard history and product revenue reporting. Developers do not need to configure or manage storage for payment records.
