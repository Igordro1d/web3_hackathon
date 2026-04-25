# apps/dashboard-backend

**Package name:** `dashboard-backend`  
**Location:** `apps/dashboard-backend/`  
**Runtime:** Node.js via `tsx watch`  
**Port:** `3001`

---

## Purpose

A lightweight REST API for the merchant dashboard. It stores merchant accounts and product configuration in `data/dashboard.json`, reads payment activity from `data/transactions.json`, and exposes the APIs used by the React dashboard.

The backend also exposes a gateway lookup endpoint so middleware can resolve product configuration by API key at runtime.

---

## Runtime Storage

Runtime data lives under the repo-root `data/` directory.

| File | Purpose |
|---|---|
| `data/dashboard.json` | Merchant accounts, products, API keys, wallet/settings |
| `data/transactions.json` | Payment records written after settlement |

`data/*.json` is gitignored, so these files are local runtime state. `data/.gitkeep` keeps the directory in git.

---

## Data Model

### Dashboard DB

```ts
interface DashboardDb {
  accounts: MerchantAccount[];
  products: Product[];
}
```

### Merchant Account

```ts
interface MerchantAccount {
  id: string;
  email: string;
  password: string;
  walletAddress: string;
  network: 'avalanche-fuji' | 'avalanche';
  twoFactorEnabled: boolean;
  passkeysEnabled: boolean;
  createdAt: number;
}
```

Passwords are plaintext in this demo JSON store. This is acceptable only for hackathon/local demo usage and must be replaced with proper password hashing and persistent sessions for production.

### Product

```ts
type ProductStatus = 'active' | 'inactive';

interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: string;      // USDC base units, 1 USDC = 1000000
  status: ProductStatus;
  resource: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
}
```

One product maps to one paywalled endpoint. The product `resource` is used to match transactions back to a product. The merchant account `network` is the source of truth for which chain the middleware uses across all products.

### Transaction

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

Transactions are read from `data/transactions.json`.

---

## Auth Model

Auth uses simple in-memory bearer tokens:

```text
Authorization: Bearer <token>
```

Tokens are created on login/register and stored in memory by the backend process. Restarting `dashboard-backend` invalidates active sessions.

---

## Endpoints

### Auth

#### `POST /api/auth/register`

Creates a merchant account and returns a session token.

Request:

```json
{
  "email": "merchant@example.com",
  "password": "password123",
  "walletAddress": "0x..."
}
```

Response:

```json
{
  "token": "...",
  "user": {
    "email": "merchant@example.com",
    "walletAddress": "0x...",
    "twoFactorEnabled": false,
    "passkeysEnabled": false
  }
}
```

#### `POST /api/auth/login`

Authenticates with email/password and returns the same response shape as register.

#### `POST /api/auth/forgot-password`

Demo-only password reset endpoint. Returns a generic success message.

#### `GET /api/auth/me`

Returns the current user profile for a valid bearer token.

---

### Settings

#### `GET /api/settings`

Returns the authenticated merchant settings.

#### `PUT /api/settings`

Updates:

```text
email
walletAddress
network
twoFactorEnabled
passkeysEnabled
```

The wallet field currently accepts an address or ENS-like string and stores it as-is. The network is account-wide and applies to every product owned by the merchant.

#### `POST /api/account/delete`

Deletes the authenticated account, its products, and all active in-memory sessions for that account.

---

### Products

#### `GET /api/products`

Returns products owned by the authenticated merchant, enriched with payment count and revenue derived from transaction history.

#### `POST /api/products`

Creates a new product.

Request:

```json
{
  "name": "Weather API",
  "description": "Pay-per-request weather endpoint",
  "price": "1000000",
  "status": "active"
}
```

Generated fields:

```text
id
merchantId
resource
apiKey
createdAt
updatedAt
```

The generated resource follows:

```text
/products/:id/access
```

#### `GET /api/products/:id`

Returns product detail, analytics, payment history, and integration steps.

Response shape:

```ts
{
  product: Product;
  analytics: {
    totalRevenue: string;
    revenue30d: string;
    paymentCount: number;
  };
  payments: Transaction[];
  integrationSteps: string[];
}
```

#### `PUT /api/products/:id`

Updates product name, description, price, and status.

This endpoint is how the dashboard changes service payment gateway parameters such as price. Network is managed at account settings level.

#### `POST /api/products/:id/rotate-key`

Generates and stores a new API key for the product.

#### `GET /api/products/:id/payments`

Returns transactions where:

```ts
transaction.resource === product.resource
```

---

### Dashboard Summary

#### `GET /api/dashboard/summary`

Returns overview metrics across all products owned by the authenticated merchant.

Response:

```ts
{
  totalRevenue: string;
  revenue30d: string;
  totalPayments: number;
  activeProducts: number;
  recentPayments: Array<Transaction & { productName: string }>;
}
```

Revenue values are formatted as human-readable USDC strings with 6 decimals.

---

### Gateway Lookup

#### `GET /api/gateway/products/by-key/:apiKey`

Returns runtime product configuration for middleware/API gateway use.

Response:

```ts
{
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

`payTo` is the merchant account `walletAddress`. Middleware uses `network` to select the chain and USDC asset.
`network` is the merchant account network, not a product-level setting.

---

### Compatibility Endpoints

These remain available for older dashboard/testing flows.

#### `GET /api/transactions`

Returns all transaction records from `data/transactions.json`.

#### `GET /api/stats`

Returns aggregate revenue and count across all transaction records.

---

## Validation

The backend validates:

```text
email required
password required
duplicate email rejected
product name required
description required
price required
price must be numeric USDC base units
price must be greater than 0
account network must be avalanche-fuji or avalanche
product access scoped to owning merchant
```

---

## Dev Command

```bash
pnpm --filter dashboard-backend dev
```

---

## Type Check

```bash
pnpm --filter dashboard-backend exec tsc --noEmit
```

---

## Dependency Graph

```text
dashboard-backend
├── express
├── lowdb       # JSON file read/write
├── cors
├── dotenv
└── @types/*    # TypeScript types
```
