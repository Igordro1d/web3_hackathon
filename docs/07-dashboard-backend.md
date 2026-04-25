# apps/dashboard-backend

**Package name:** `dashboard-backend`
**Location:** `apps/dashboard-backend/`
**Runtime:** Node.js via `tsx watch`
**Port:** `3001`

---

## Purpose

A REST API for the merchant dashboard. Authentication is handled by Supabase
Auth (email + password, JWT sessions). Account, product, and transaction data
live in the Supabase Postgres database. The backend is a thin layer over
Supabase that enforces the wire-format contract the dashboard frontend already
expects, so the React app needed no changes.

---

## Storage

All data is in Supabase Postgres in three tables under the `public` schema:

| Table | Purpose |
|---|---|
| `accounts` | Per-user merchant settings (wallet address, network, security flags). One row per `auth.users` row, auto-created by trigger. |
| `products` | Paywalled endpoint configurations. FK → `accounts.id`. Unique `api_key`. |
| `transactions` | Settled on-chain payments. Inserted by the paywall middleware via the service role key. |

Row-level security is enabled on all three. The dashboard-backend connects
with the **service role key**, which bypasses RLS — RLS is the safety net
for any future direct-from-browser access, and the backend enforces ownership
explicitly in every query (`.eq('merchant_id', accountId)`).

There is no longer a `data/*.json` runtime store.

---

## Auth Model

Sessions are real Supabase JWTs:

```
Authorization: Bearer <supabase-access-token>
```

`/api/auth/login` and `/api/auth/register` issue these tokens; every other
authenticated endpoint runs them through `supabase.auth.getUser(token)` to
verify and extract the user id.

Passwords are hashed by Supabase Auth (bcrypt). The plaintext password store
from the previous lowdb scaffold is gone.

---

## Endpoints

The HTTP surface is unchanged from the previous version. The frontend, agent
SDK, and paywall middleware did not need updates.

### Auth

#### `POST /api/auth/register`

Creates a Supabase Auth user, seeds the `accounts` row via the
`handle_new_user` trigger, and returns a session token.

Request:

```json
{
  "email": "merchant@example.com",
  "password": "password123",
  "walletAddress": "0x...",
  "network": "avalanche-fuji"
}
```

Response:

```json
{
  "token": "<supabase-jwt>",
  "user": {
    "email": "merchant@example.com",
    "walletAddress": "0x...",
    "network": "avalanche-fuji",
    "twoFactorEnabled": false,
    "passkeysEnabled": false
  }
}
```

#### `POST /api/auth/login`

Authenticates with email/password via `supabase.auth.signInWithPassword` and
returns the same response shape.

#### `POST /api/auth/forgot-password`

Calls `supabase.auth.resetPasswordForEmail` and returns a generic success
message regardless of whether the address exists.

#### `GET /api/auth/me`

Returns the current user profile if the bearer token is valid.

---

### Settings

#### `GET /api/settings`
#### `PUT /api/settings`

Email changes go through `auth.admin.updateUserById`. Wallet address, network,
2FA, and passkey flags are stored in the `accounts` row.

#### `POST /api/account/delete`

Calls `auth.admin.deleteUser`. The `ON DELETE CASCADE` from
`accounts.id → auth.users.id` and from `products.merchant_id → accounts.id`
cleans up everything.

---

### Products

Same shapes as before. All queries scope to the authenticated merchant via
`.eq('merchant_id', accountId)`.

```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
POST   /api/products/:id/rotate-key
GET    /api/products/:id/payments
```

The `resource` for new products is `/products/<uuid>/access`. The `api_key`
is `pk_live_<32 hex>`.

---

### Dashboard Summary

#### `GET /api/dashboard/summary`

Aggregates transactions whose `resource` is one of the merchant's products.

---

### Gateway Lookup

#### `GET /api/gateway/products/by-key/:apiKey`

Returns runtime product config for the paywall middleware. This endpoint is
intentionally unauthenticated — knowledge of the product API key is the
credential. The service role key is used to read the product and the matching
account row in one round trip.

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

---

### Compatibility Endpoints

#### `GET /api/transactions`
#### `GET /api/stats`

Read-only aggregates over all transactions. Kept for the older dashboard
scaffold and ad-hoc curl testing.

---

## Environment

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The service role key bypasses RLS. Server-only. Never include it in a browser
bundle.

---

## Dev

```bash
pnpm --filter dashboard-backend dev
```

---

## Dependencies

```text
dashboard-backend
├── @web3nz/shared        # supabase factories, types
├── express
├── cors
└── dotenv
```
