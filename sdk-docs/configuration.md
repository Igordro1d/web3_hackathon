# Configuration

The SDK uses a product API key at construction time and environment variables for runtime operation.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PAYWALL_PRIVATE_KEY` | Yes | None | Facilitator wallet private key. This wallet submits USDC settlement transactions and needs AVAX for gas. |
| `RPC_URL` | Yes | None | Avalanche JSON-RPC URL used by viem clients. |
| `DASHBOARD_BACKEND_URL` | No | `http://localhost:3001` | Dashboard backend base URL used to fetch product config. |
| `PRODUCT_CONFIG_CACHE_TTL_MS` | No | `30000` | Product config cache duration in milliseconds. Must be a positive number. |

Your application typically stores the dashboard product API key separately:

```env
PRODUCT_API_KEY=...
```

Then passes it to the SDK:

```ts
const paywall = createPaywall(process.env.PRODUCT_API_KEY!);
```

## Dashboard Product Contract

The middleware fetches runtime product configuration from:

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
- `resource` is logged with each transaction so the dashboard can match payments back to products.
- `status` must be `active` before the middleware will issue a payment challenge.

## Product Config Cache

Product config is cached by API key.

```text
first request -> fetch from dashboard backend
within TTL -> use cached config
after TTL -> fetch fresh config
```

If refresh fails, the middleware responds with `503` instead of accepting stale product config. This avoids accepting underpayment after a merchant changes price or disables a product.

## Supported Networks

| Network | Chain ID | USDC Contract |
| --- | --- | --- |
| `avalanche-fuji` | `43113` | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| `avalanche` | `43114` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

## Wallet Roles

| Wallet | Holds | Used for |
| --- | --- | --- |
| Agent wallet | USDC | Signs the payment authorization. |
| Merchant wallet | Receives USDC | Stored as `payTo` in dashboard settings. |
| Facilitator wallet | AVAX for gas | Configured as `PAYWALL_PRIVATE_KEY`; submits settlement transactions. |

