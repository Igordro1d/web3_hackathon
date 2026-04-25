# apps/dashboard

**Package name:** `dashboard`  
**Location:** `apps/dashboard/`  
**Bundler:** Vite 5 with `@vitejs/plugin-react`  
**Dev port:** `5173`

---

## Purpose

A React merchant console for the x402 payment gateway. Merchants can register or log in, configure payable products, manage API keys, update account settings, and monitor payment activity across all products.

The dashboard calls `dashboard-backend` on port `3001` and keeps the existing dark operational UI style: gray panels, compact tables, green revenue accents, blue count/status accents, and monospace wallet/API-key values.

---

## Routes

The app uses lightweight client-side routing based on `window.location.pathname`.

| Route | Purpose |
|---|---|
| `/` | Login |
| `/register` | Register merchant account |
| `/forgot-password` | Demo password reset flow |
| `/dashboard` | Activity summary across all products |
| `/dashboard/products` | Product list |
| `/dashboard/products/new` | Create product |
| `/dashboard/products/:id` | Product detail, analytics, API key, payment history |
| `/dashboard/products/:id/edit` | Edit product parameters, including price |
| `/dashboard/settings` | Wallet, email, 2FA/passkey flags, delete account |

The auth token is stored in `localStorage` under `dashboard_token`.

Redirect behavior:

```text
Unauthenticated /dashboard* requests -> /
Authenticated auth-page requests -> /dashboard
```

---

## File Structure

```text
apps/dashboard/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── api.ts
    ├── types.ts
    ├── components/
    │   ├── AppShell.tsx
    │   ├── PaymentTable.tsx
    │   ├── ProductForm.tsx
    │   └── StatCard.tsx
    ├── pages/
    │   ├── DashboardPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── LoginPage.tsx
    │   ├── ProductDetailPage.tsx
    │   ├── ProductEditPage.tsx
    │   ├── ProductNewPage.tsx
    │   ├── ProductsPage.tsx
    │   ├── RegisterPage.tsx
    │   └── SettingsPage.tsx
    └── utils/
        └── format.ts
```

---

## Key Files

### `src/App.tsx`

Owns app-level session and route orchestration:

- Reads/writes the `dashboard_token` localStorage value.
- Calls `GET /api/auth/me` to restore an existing session.
- Pushes browser history for route changes.
- Renders auth pages when logged out.
- Wraps authenticated pages in `AppShell`.

Page-specific UI and data fetching live in `src/pages/*`.

### `src/api.ts`

Shared fetch helper for backend calls:

- Prefixes requests with `http://localhost:3001`.
- Adds `Content-Type: application/json` when a body is present.
- Adds `Authorization: Bearer <token>` when a token is passed.
- Throws `ApiError` with the backend error message for non-2xx responses.

### `src/types.ts`

Shared frontend types for:

```text
UserProfile
Transaction
Product
DashboardSummary
ProductAnalytics
ProductDetails
AuthResponse
```

### `src/components/AppShell.tsx`

Authenticated dashboard shell. It renders:

- Product name/header: `x402 Payment Gateway`
- Signed-in merchant email
- Navigation for Overview, Products, Settings, and Logout
- A spaced grouped nav bar that wraps on small screens

### `src/components/PaymentTable.tsx`

Reusable payment table used by the overview and product detail pages. It keeps wallet/tx values monospace and links transaction hashes to Snowtrace Fuji.

### `src/components/ProductForm.tsx`

Shared form used by create and edit product pages. It captures:

```text
Product name
Description
Price per access in USDC base units
Status
```

### `src/utils/format.ts`

Formatting helpers:

```text
formatUSDC(baseUnits)
truncate(value)
formatDateTime(timestamp)
formatTime(timestamp)
```

---

## Pages

### Auth Pages

`LoginPage`, `RegisterPage`, and `ForgotPasswordPage` call:

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
```

The login form is prefilled for the local demo account when present:

```text
merchant@example.com
password123
```

### `DashboardPage`

Fetches `GET /api/dashboard/summary` every 3 seconds.

Displays:

```text
Total revenue
Revenue, last 30 days
Total payments
Active products
Recent revenue chart
Recent payments table
```

### `ProductsPage`

Fetches `GET /api/products`.

Displays a table of product configurations:

```text
Name
Price
Status
API key preview
Payment count
Revenue
```

Clicking a row opens the product detail route.

### `ProductNewPage`

Calls `POST /api/products` and navigates to the new product detail route after creation.

### `ProductDetailPage`

Fetches `GET /api/products/:id`.

Displays:

```text
Product name and description
Price per access
Total revenue
Revenue, last 30 days
Payment count
Status
Resource path
API key
Integration steps
Payment history
```

Also supports API key rotation with:

```text
POST /api/products/:id/rotate-key
```

### `ProductEditPage`

Loads `GET /api/products/:id`, then saves changes with:

```text
PUT /api/products/:id
```

This is where merchants can change gateway parameters such as the product price.

### `SettingsPage`

Reads and updates:

```text
GET /api/settings
PUT /api/settings
POST /api/account/delete
```

Settings include receiving wallet address, email, two-factor authentication flag, passkeys flag, and account deletion.

---

## Styling Notes

The dashboard intentionally follows the existing scaffold style:

- `bg-gray-950` page background
- `bg-gray-800` panels
- `border-gray-700/800` separators
- `text-green-400` for revenue/API-key accents
- `text-blue-400` for count/price accents
- rounded panels and compact tables
- monospace tx hashes, wallet addresses, resource paths, and API keys

Keep future pages in this same visual language unless the design system changes intentionally.

---

## Build

```bash
pnpm --filter dashboard build
```

This runs TypeScript project references and `vite build`.

---

## Dependency Graph

```text
dashboard
├── react
├── react-dom
├── recharts      # overview revenue chart
├── viem          # available for future browser-side chain reads
├── @vitejs/plugin-react
├── tailwindcss
├── postcss
├── autoprefixer
└── vite
```
