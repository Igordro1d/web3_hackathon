# Root Repository Configuration

This document covers every configuration file that lives at the repo root and affects all packages and apps.

---

## `package.json` (workspace root)

```json
{
  "name": "web3nz-hackathon",
  "private": true,
  "scripts": { ... },
  "pnpm": { "onlyBuiltDependencies": ["esbuild"] },
  "devDependencies": { ... }
}
```

### `private: true`

Prevents accidental `npm publish` of the root package. The root is not a publishable package — it is only a workspace container.

### Scripts

| Script | What it runs |
|---|---|
| `pnpm build` | `pnpm -r build` — runs the `build` script in every workspace package recursively |
| `pnpm dev:business` | `pnpm --filter demo-business dev` — starts the business API server |
| `pnpm dev:agent` | `pnpm --filter demo-agent dev` — runs the agent in watch mode |
| `pnpm dev:dashboard` | `pnpm --filter dashboard dev` — starts the Vite frontend |
| `pnpm format` | `prettier --write .` — formats every file in the repo |

`--filter <name>` selects a workspace by its `name` field in `package.json`. Filter names must match exactly.

### `pnpm.onlyBuiltDependencies`

```json
"pnpm": {
  "onlyBuiltDependencies": ["esbuild"]
}
```

pnpm v10 changed the default behaviour for `postinstall` scripts: by default, no package is allowed to run build scripts unless explicitly listed here. `esbuild` needs its `postinstall` script to download the correct platform binary. Without this entry, `tsup` and Vite would fail with a missing `esbuild` binary error.

### `devDependencies` at root

These tools are available to all workspaces via hoisting:

| Package | Purpose |
|---|---|
| `typescript` | The TypeScript compiler (`tsc`). Used directly by `demo-business` build script and for type-checking. |
| `tsx` | Runs `.ts` files directly in Node without a separate compile step. Used by all backend dev scripts. |
| `tsup` | Bundles packages in `packages/*` to CJS + ESM + `.d.ts`. |
| `prettier` | Code formatter. Run via `pnpm format`. |
| `@types/node` | TypeScript types for Node.js built-ins (`process`, `Buffer`, `fs`, etc.). |

---

## `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

Declares which directories contain workspace packages. Any directory matching these globs that contains a `package.json` is treated as a workspace member. pnpm:
- Hoists their `node_modules` to the root where possible.
- Resolves `"workspace:*"` references between them to the local directory.
- Includes them in recursive commands (`pnpm -r build`, `pnpm --filter`).

---

## `tsconfig.base.json`

Shared TypeScript compiler options inherited by every package and app via `"extends": "../../tsconfig.base.json"` (or `"../tsconfig.base.json"` at one level deep).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

| Option | Effect |
|---|---|
| `target: ES2022` | Emits modern JS — async/await as-is, optional chaining, etc. No polyfills for older runtimes. Node 20+ and modern browsers support ES2022 natively. |
| `module: ESNext` | Uses `import`/`export` syntax in output. Required for tree-shaking and for `tsup` to produce clean ESM output. |
| `moduleResolution: Bundler` | The resolver behaviour introduced in TypeScript 5 for bundler-based projects. Allows `import './foo'` to resolve `./foo.ts` without a `.js` extension, matching how Vite and `tsup` actually resolve files. |
| `strict: true` | Enables the full strict suite: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc. |
| `esModuleInterop: true` | Allows `import express from 'express'` (default import) for CommonJS modules that don't have a default export. |
| `skipLibCheck: true` | Skips type-checking of `.d.ts` files in `node_modules`. Significantly speeds up `tsc` and avoids errors from type declaration packages that have internal inconsistencies. |
| `resolveJsonModule: true` | Allows `import data from './data.json'` with full type inference. |
| `declaration: true` | Emits `.d.ts` files alongside JS output. Required for `@web3nz/shared`, `@web3nz/paywall-middleware`, and `@web3nz/agent-sdk` to expose types to consumers. (For apps this is a no-op since their `tsconfig.json` sets `noEmit: true` or doesn't run `tsc` directly.) |
| `isolatedModules: true` | Requires every file to be a module (have at least one `import` or `export`). Ensures compatibility with single-file transpilers like `esbuild` and `tsx` that don't do cross-file analysis. |
| `forceConsistentCasingInFileNames: true` | Prevents import casing bugs on case-insensitive filesystems (macOS, Windows) that would silently break on case-sensitive Linux CI. |

---

## `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

| Option | Effect |
|---|---|
| `semi: true` | Always emit semicolons. |
| `singleQuote: true` | Use `'single'` quotes instead of `"double"` in JS/TS. |
| `trailingComma: "all"` | Add trailing commas wherever valid in ES5+, including function parameters. Makes git diffs cleaner when adding new items to multi-line lists. |
| `printWidth: 100` | Wrap lines at 100 characters. Slightly wider than the 80-char default, appropriate for a TypeScript project with longer type annotations. |

---

## `.gitignore`

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
data/*.json
!data/.gitkeep
.vite/
.turbo/
```

| Entry | Reason |
|---|---|
| `node_modules/` | Installed dependencies — never committed |
| `dist/` | Build artifacts from `tsup` — regenerated on `pnpm build` |
| `.env` / `.env.local` | Local secrets (private keys, RPC URLs) |
| `*.log` | npm/pnpm error logs |
| `.DS_Store` | macOS filesystem metadata |
| `data/*.json` | Runtime dashboard/transaction data — contains wallet addresses from testnet runs |
| `!data/.gitkeep` | Exception: keep the `.gitkeep` file so the `data/` directory itself is tracked |
| `.vite/` | Vite's internal cache directory |
| `.turbo/` | Turborepo cache (not used yet, but reserved) |

---

## `.env.example`

A committed template showing every required environment variable with placeholder values. New team members copy this to `.env` and fill in real values.

```
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
PAYWALL_PRIVATE_KEY=0x...
DASHBOARD_BACKEND_URL=http://localhost:3001
PRODUCT_API_KEY=pk_live_...
PRODUCT_CONFIG_CACHE_TTL_MS=30000
USDC_CONTRACT_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65
```

`AGENT_PRIVATE_KEY` (used by `demo-agent`) is not in this file — it would typically go in a separate `.env` inside `apps/demo-agent/` in a real project, but for hackathon simplicity it can be added to the root `.env`.
