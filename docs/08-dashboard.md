# apps/dashboard

**Package name:** `dashboard`  
**Location:** `apps/dashboard/`  
**Bundler:** Vite 5 with `@vitejs/plugin-react`  
**Dev port:** `5173` (Vite default)

---

## Purpose

A React frontend that displays the payment activity recorded by the system. Connects to `dashboard-backend` on port `3001` to retrieve transaction history and stats, then renders them in a dark-themed UI using Tailwind CSS. Recharts is available for charts and visualisations.

---

## File Structure

```
apps/dashboard/
├── index.html          # HTML entry point Vite injects the JS bundle into
├── vite.config.ts      # Vite config — enables React plugin
├── tailwind.config.js  # Tailwind content paths
├── postcss.config.js   # PostCSS pipeline: Tailwind + Autoprefixer
├── tsconfig.json       # References tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json   # TypeScript config for src/ (browser code)
├── tsconfig.node.json  # TypeScript config for vite.config.ts (Node code)
└── src/
    ├── main.tsx        # React DOM mount point
    ├── index.css       # Tailwind directives
    └── App.tsx         # Root component — fetches + renders transactions
```

---

## `index.html`

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Vite serves this file at `/`. It is a standard single-page app shell — the `#root` div is where React mounts, and the `<script type="module">` loads the entry point. Vite performs HMR (hot module replacement) during development by injecting its own client script.

---

## `src/main.tsx`

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

The React 18 entry point. `createRoot` replaces the legacy `ReactDOM.render`. `StrictMode` double-invokes effects in development to surface unintentional side-effects — it has no effect in production builds.

The `!` non-null assertion on `getElementById('root')` is safe because `index.html` always contains that element.

---

## `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

The three Tailwind directives. PostCSS processes this file through Tailwind's JIT engine, which scans `src/**/*.{js,ts,jsx,tsx}` (as configured in `tailwind.config.js`) and emits only the CSS classes that are actually used in the source. This keeps the production CSS bundle small.

---

## `src/App.tsx`

The only component in the current scaffold.

### Local type

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

Mirrors `Transaction` from `@web3nz/shared`. It is redeclared locally here to avoid importing a Node-built package into Vite's browser bundle — `@web3nz/shared` builds with `tsup` which produces separate CJS/ESM artifacts, but Vite resolves workspace packages via their source directly using the `module` field. Either approach works; the local redeclaration avoids any potential build-graph complexity during early development.

### State

```ts
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [error, setError] = useState<string | null>(null);
```

Two pieces of state: the fetched transaction list and a string error message shown if the backend is unreachable.

### Data fetching

```ts
useEffect(() => {
  fetch('http://localhost:3001/api/transactions')
    .then((res) => res.json())
    .then((data) => setTransactions(data.transactions))
    .catch(() => setError('Could not connect to dashboard backend'));
}, []);
```

The empty dependency array `[]` means this runs once on mount — equivalent to `componentDidMount`. No loading state is shown during the fetch; adding a `loading` boolean would be a natural next step.

The URL is hardcoded to `localhost:3001`. For a deployed version this would read from `import.meta.env.VITE_API_URL` (Vite's environment variable convention for browser-exposed vars).

### Render

```tsx
<div className="min-h-screen bg-gray-950 text-gray-100 p-8">
  <h1 className="text-3xl font-bold mb-6">Hackathon Dashboard</h1>
  {error && <p className="text-red-400 mb-4">{error}</p>}
  {transactions.length === 0 ? (
    <p className="text-gray-400">No transactions yet.</p>
  ) : (
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li key={tx.id} className="bg-gray-800 rounded p-4 font-mono text-sm">
          <span className="text-green-400">{tx.txHash}</span> — {tx.amount} USDC
        </li>
      ))}
    </ul>
  )}
</div>
```

- Dark background (`bg-gray-950`) with light text (`text-gray-100`).
- Error shown in red if backend is unreachable.
- Empty state message when no transactions exist.
- Each transaction shows its on-chain hash (green, monospace) and amount.

`tx.amount` is in USDC base units (e.g. `10000` = $0.01). The display should format this as human-readable dollars — dividing by `1_000_000` and using `toFixed(2)` — which is a natural next step alongside adding Recharts visualisations.

---

## Build configuration

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

Minimal config. `@vitejs/plugin-react` enables:
- JSX/TSX transform using the React 17+ automatic JSX runtime (no `import React` needed).
- Fast Refresh (HMR that preserves component state across hot reloads).

### TypeScript split config

The dashboard uses two `tsconfig` files rather than one because Vite projects contain two distinct TypeScript environments:

| File | Scope | Key difference |
|---|---|---|
| `tsconfig.app.json` | `src/` | `"lib": ["ES2020", "DOM", "DOM.Iterable"]` — browser globals available; `"noEmit": true` because Vite handles transpilation |
| `tsconfig.node.json` | `vite.config.ts` | `"lib": ["ES2023"]` — no DOM globals; config file runs in Node, not the browser |

`tsconfig.json` at the root is a "solution" config — it just references both and emits nothing itself.

### `tailwind.config.js`

```js
content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
```

Tells Tailwind's scanner which files to inspect for class names. Only classes found in these files will appear in the compiled CSS. The `index.html` entry is needed because class names can appear in the HTML template too.

---

## Planned additions

The scaffold is minimal by design. Likely next steps:

- **Stats bar** — fetch `/api/stats`, show total revenue and transaction count in header cards.
- **Recharts bar/area chart** — plot transaction volume over time using the `timestamp` field.
- **Amount formatting** — `(BigInt(tx.amount) / 1_000_000n).toString()` with decimal handling for display.
- **Auto-refresh** — poll `/api/transactions` every few seconds (or use SSE) so the dashboard updates live as payments come in.
- **Environment variable** for the API base URL so the frontend can be deployed separately from the backend.

---

## Dependency Graph

```
dashboard
├── react             (^18.3.1)
├── react-dom         (^18.3.1)
├── recharts          (^2.13.0)   — charting, not yet used
├── viem              (^2.21.0)   — available for any on-chain reads from the browser
├── @vitejs/plugin-react (dev)
├── tailwindcss       (dev)
├── postcss           (dev)
├── autoprefixer      (dev)
└── vite              (dev)
```
