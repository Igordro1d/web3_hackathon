# packages/shared

**Package name:** `@web3nz/shared`  
**Location:** `packages/shared/`  
**Built with:** `tsup` → outputs CJS, ESM, and `.d.ts`

This package is the single source of truth for types, network configuration, and EIP-712 signing primitives. Every other package in the monorepo imports from here. Nothing in `shared` has runtime side-effects — it is pure data definitions and pure functions.

---

## Files

### `src/types.ts`

Defines the core data structures that flow through the entire system.

#### `Transaction`

```ts
interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;   // USDC base units (6 decimals), e.g. "10000" = $0.01
  resource: string; // the URL/path that was paid for
  timestamp: number;
}
```

Written to the Supabase `transactions` table by `paywall-middleware` after a payment settles on-chain. Read back by `dashboard-backend` and displayed in the React dashboard. `amount` is stored as a raw string in USDC's 6-decimal base units (not a float) to avoid any floating-point precision issues.

#### `PaymentRequirements`

```ts
interface PaymentRequirements {
  scheme: 'exact';
  network: 'avalanche-fuji' | 'avalanche';
  maxAmountRequired: string; // USDC base units
  resource: string;          // URL being protected
  payTo: string;             // business wallet address
  asset: string;             // USDC contract address
  maxTimeoutSeconds: number; // how long the agent has to pay
}
```

This is the JSON body the middleware sends back in a `402 Payment Required` response. The agent reads it to know: how much to authorise, which contract, which address to pay, and how long the `validBefore` window must be. `scheme: 'exact'` means the agent must authorise exactly (or at least) `maxAmountRequired` — no price negotiation.

#### `GatewayProductConfig`

```ts
interface GatewayProductConfig {
  productId: string;
  name: string;
  description: string;
  resource: string;
  price: string; // USDC base units
  network: NetworkName;
  payTo: `0x${string}`;
  status: 'active' | 'inactive';
}
```

Returned by `dashboard-backend` to `paywall-middleware` when middleware looks up a product by API key. It is the runtime contract that tells middleware the product metadata, payment amount, merchant account network, recipient wallet, resource, and active/inactive state.

#### `TransferAuthorization`

```ts
interface TransferAuthorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;        // USDC base units
  validAfter: number;   // unix timestamp — sig not valid before this
  validBefore: number;  // unix timestamp — sig not valid after this
  nonce: `0x${string}`; // random bytes32, prevents replay
  v: number;            // ECDSA recovery id (27 or 28)
  r: `0x${string}`;     // ECDSA signature component
  s: `0x${string}`;     // ECDSA signature component
}
```

Sent by the agent in the `X-Payment` header on the retry request. The middleware extracts this, calls `transferWithAuthorization` on the USDC contract (EIP-3009), and waits for confirmation before serving the response. The `nonce` field is a random `bytes32` that the agent generates fresh for every authorisation — the USDC contract records used nonces so a signature can never be replayed.

---

### `src/networks.ts`

```ts
import { avalanche, avalancheFuji } from 'viem/chains';

export const NETWORKS = {
  'avalanche-fuji': {
    chain: avalancheFuji,
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },
  'avalanche': {
    chain: avalanche,
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
} as const;

export type NetworkName = keyof typeof NETWORKS; // 'avalanche-fuji' | 'avalanche'
```

A registry that maps a human-readable network name to:
- **`chain`** — the full viem chain object (contains `id`, `rpcUrls`, `nativeCurrency`, block explorer, etc.)
- **`usdcAddress`** — the canonical USDC contract address on that network

The `as const` annotation means TypeScript infers the USDC addresses as their exact literal string types rather than generic `string`. This propagates through gateway product config and agent config types, giving compile-time guarantees that addresses are typed as `0x${string}`.

`NetworkName` is derived from the object's keys rather than being a manually-maintained union type — adding a new network entry automatically extends the union.

**USDC addresses:**
| Network | Address |
|---|---|
| Avalanche Fuji testnet | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| Avalanche mainnet | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

---

### `src/eip712.ts`

EIP-712 is the Ethereum standard for typed structured data signing. It lets a user (or agent) sign a specific on-chain action off-chain. The resulting signature can later be submitted to a smart contract to authorise that action — in this case, a USDC transfer.

#### `TRANSFER_WITH_AUTH_TYPES`

```ts
export const TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
  ],
} as const;
```

This is the EIP-712 type definition for USDC's `TransferWithAuthorization`. It matches exactly what Circle's USDC contract expects — the field names, order, and Solidity types must be byte-for-byte identical or the contract will reject the signature. This constant is passed directly to viem's `signTypedData` on the agent side and to `verifyTypedData` (or directly to the USDC contract) on the middleware side.

#### `getUsdcDomain(chainId, usdcAddress)`

```ts
export function getUsdcDomain(chainId: number, usdcAddress: `0x${string}`) {
  return {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: usdcAddress,
  };
}
```

Returns the EIP-712 domain separator for USDC on a given chain. The domain separator is hashed together with the typed message to produce a chain-specific, contract-specific signing payload. This prevents a signature generated for USDC on Fuji from being valid on mainnet, and prevents it from being replayed on a different ERC-20 token that uses the same `TransferWithAuthorization` interface.

- `name: 'USD Coin'` and `version: '2'` must match what the USDC contract was deployed with.
- `chainId` binds the signature to a specific network.
- `verifyingContract` binds it to the specific USDC deployment address.

---

### `src/index.ts`

```ts
export * from './types';
export * from './networks';
export * from './eip712';
```

Re-exports everything from the three modules as a single flat namespace. Consumers import from `@web3nz/shared` rather than from deep paths like `@web3nz/shared/networks`.

---

## How Other Packages Use This

| Consumer | Imports |
|---|---|
| `paywall-middleware` | `NetworkName`, `PaymentRequirements`, `TransferAuthorization`, `NETWORKS`, `TRANSFER_WITH_AUTH_TYPES`, `getUsdcDomain` |
| `agent-sdk` | `NetworkName`, `PaymentRequirements`, `TransferAuthorization`, `NETWORKS`, `TRANSFER_WITH_AUTH_TYPES`, `getUsdcDomain` |
| `demo-business` | `Transaction` (indirectly, via middleware) |
| `dashboard-backend` | `Transaction` (for typing the JSON read from disk) |
| `dashboard` | `Transaction` (for typing the API response in React) |
