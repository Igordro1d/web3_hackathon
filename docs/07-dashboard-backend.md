# apps/dashboard-backend

**Package name:** `dashboard-backend`  
**Location:** `apps/dashboard-backend/`  
**Runtime:** Node.js via `tsx watch`  
**Port:** `3001`

---

## Purpose

A lightweight REST API server that sits between the JSON transaction log (`data/transactions.json`) and the React dashboard frontend. The frontend cannot read files from disk directly — it runs in the browser — so this server reads the data and exposes it over HTTP.

This separation also means the dashboard can be hosted separately from the business server. The business server writes transactions; this server reads them.

---

## Entry Point: `src/server.ts`

### Setup

```ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
```

`cors()` with no arguments enables cross-origin requests from any origin. This is intentional — the React dev server runs on `localhost:5173` and calls this server on `localhost:3001`. In production you would lock this down to the specific frontend origin.

### Endpoints

#### `GET /api/transactions`

```ts
app.get('/api/transactions', (req, res) => {
  // TODO: read from data/transactions.json via lowdb
  res.json({ transactions: [] });
});
```

Returns the full list of `Transaction` records. Currently returns an empty array.

**Intended implementation:** Use `lowdb` with a `JSONFileSync` adapter pointing to `../../data/transactions.json` (relative to the running process). On each request, `lowdb` reads and parses the JSON file. Because the file is written by `paywall-middleware` (which runs inside `demo-business`), this server only ever reads it.

```ts
// Planned implementation sketch
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

interface DbSchema { transactions: Transaction[] }
const db = new Low<DbSchema>(new JSONFileSync('../../data/transactions.json'), { transactions: [] });

app.get('/api/transactions', (req, res) => {
  db.read();
  res.json({ transactions: db.data.transactions });
});
```

The response shape `{ transactions: Transaction[] }` is intentional — wrapping the array in an object makes it easier to add pagination metadata (`{ transactions, total, page }`) later without a breaking API change.

#### `GET /api/stats`

```ts
app.get('/api/stats', (req, res) => {
  // TODO: aggregate revenue, count, etc.
  res.json({ totalRevenue: '0', count: 0 });
});
```

Returns aggregated summary data for the dashboard's stat cards.

**Intended implementation:** Read all transactions from the file and reduce them:

```ts
app.get('/api/stats', (req, res) => {
  db.read();
  const txs = db.data.transactions;
  const totalRevenue = txs
    .reduce((sum, tx) => sum + BigInt(tx.amount), 0n)
    .toString();
  res.json({ totalRevenue, count: txs.length });
});
```

`totalRevenue` is kept as a string (USDC base units) rather than a float for the same precision reason as in the `Transaction` type.

### Server start

```ts
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});
```

---

## Dev command

```bash
pnpm --filter dashboard-backend dev
# runs: tsx watch src/server.ts
```

---

## Data file location

`data/transactions.json` lives at the repo root, two directories above `apps/dashboard-backend/`. Both `demo-business` (writer) and `dashboard-backend` (reader) must agree on this path. The file is created automatically by `lowdb` on first write if it doesn't exist; `data/.gitkeep` ensures the `data/` directory itself is tracked by git.

The `data/*.json` pattern in `.gitignore` ensures the actual transaction data is never committed — important because it will contain real wallet addresses from testnet runs.

---

## Dependency Graph

```
dashboard-backend
├── @web3nz/shared  (workspace:*)  — Transaction type for typing db reads
├── express         (^4.21.0)
├── lowdb           (^7.0.1)       — JSON file read/write
├── cors            (^2.8.5)
└── dotenv          (^16.4.0)
```
