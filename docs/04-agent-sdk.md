# packages/agent-sdk

**Package name:** `@web3nz/agent-sdk`  
**Location:** `packages/agent-sdk/`  
**Built with:** `tsup` → outputs CJS, ESM, and `.d.ts`  
**Status:** Scaffold (stub) — the public API is in place; 402 handling and signing are TODOs

---

## Purpose

This is the client-side half of the payment protocol. An AI agent (or any automated HTTP client) uses this SDK to make requests to paywall-protected APIs. The SDK transparently handles the 402 challenge-response cycle so the caller's code looks like a normal `fetch` call.

---

## Public API

### `createAgent(config: AgentConfig)`

Factory function. Call once with the agent's identity (network + private key), get back an object with a `payAndFetch` method.

```ts
import { createAgent } from '@web3nz/agent-sdk';

const agent = createAgent({
  network: 'avalanche-fuji',
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
});
```

#### `AgentConfig`

```ts
interface AgentConfig {
  network: NetworkName;           // 'avalanche-fuji' | 'avalanche'
  privateKey: `0x${string}`;      // agent's ECDSA key — used to sign authorisations
}
```

- **`network`** — used to look up the correct chain and USDC address from `NETWORKS` in `@web3nz/shared` when constructing the EIP-712 domain for signing.
- **`privateKey`** — the agent's Ethereum private key. The corresponding address must hold enough USDC on the specified network to cover the payment. The agent signs but does not submit — it never needs AVAX for gas.

---

### `agent.payAndFetch(url: string): Promise<Response>`

Mirrors the standard `fetch(url)` signature. Returns a `Promise<Response>` — the same type that native `fetch` returns — so it's a drop-in replacement.

```ts
const res = await agent.payAndFetch('http://localhost:3000/premium');
const data = await res.json();
```

---

## Current State (Stub)

```ts
async payAndFetch(url: string): Promise<Response> {
  // TODO: implement 402 handling + EIP-712 signing + retry
  console.log('[agent-sdk] stub payAndFetch called', { config, url });
  return fetch(url); // plain fetch, no payment logic
}
```

Currently does a plain `fetch` with no payment handling. If the server returns a `402`, it will surface as a regular response object with `status === 402` — the caller would see the `PaymentRequirements` JSON rather than the paid content. This is intentional during development — it allows the agent to run without any USDC funds.

---

## Intended Implementation (what goes in the TODO)

The full `payAndFetch` needs to implement a two-attempt cycle:

### Attempt 1 — Optimistic request

```ts
const firstResponse = await fetch(url);
if (firstResponse.status !== 402) {
  return firstResponse; // free endpoint or already-paid session
}
```

### Parse the 402 challenge

```ts
const requirements: PaymentRequirements = await firstResponse.json();
```

Validate that `requirements.network` matches `config.network` and that `requirements.scheme === 'exact'`.

### Build the EIP-712 authorisation

```ts
import { createWalletClient, http, parseUnits, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, TRANSFER_WITH_AUTH_TYPES, getUsdcDomain } from '@web3nz/shared';

const { chain, usdcAddress } = NETWORKS[config.network];
const account = privateKeyToAccount(config.privateKey);
const now = Math.floor(Date.now() / 1000);

const authorization = {
  from:        account.address,
  to:          requirements.payTo as `0x${string}`,
  value:       BigInt(requirements.maxAmountRequired),
  validAfter:  BigInt(now - 10),       // small buffer for clock skew
  validBefore: BigInt(now + requirements.maxTimeoutSeconds),
  nonce:       toHex(crypto.getRandomValues(new Uint8Array(32))), // random bytes32
};
```

Sign it with EIP-712:

```ts
const walletClient = createWalletClient({ account, chain, transport: http() });

const signature = await walletClient.signTypedData({
  domain: getUsdcDomain(chain.id, usdcAddress),
  types:  TRANSFER_WITH_AUTH_TYPES,
  primaryType: 'TransferWithAuthorization',
  message: authorization,
});

// Decompose the 65-byte signature into v, r, s
const v = Number('0x' + signature.slice(130, 132));
const r = signature.slice(0, 66) as `0x${string}`;
const s = ('0x' + signature.slice(66, 130)) as `0x${string}`;
```

### Attempt 2 — Retry with payment header

```ts
const transferAuth: TransferAuthorization = {
  from:        authorization.from,
  to:          authorization.to,
  value:       authorization.value.toString(),
  validAfter:  Number(authorization.validAfter),
  validBefore: Number(authorization.validBefore),
  nonce:       authorization.nonce,
  v, r, s,
};

return fetch(url, {
  headers: { 'X-Payment': JSON.stringify(transferAuth) },
});
```

The server receives the header, submits the on-chain transfer, and (if confirmed) returns the real response.

---

## Why EIP-712 Instead of a Regular Transfer

A regular `transfer()` call requires the agent to submit an on-chain transaction itself — meaning it needs AVAX for gas and the latency of waiting for confirmation before even sending the HTTP request. EIP-712 `TransferWithAuthorization` (EIP-3009) flips this: the agent signs off-chain (instant, free) and the server submits the transaction. The agent only needs USDC; the server covers gas.

---

## Dependency Graph

```
@web3nz/agent-sdk
├── @web3nz/shared  (workspace:*)  — types, network config, EIP-712 helpers
└── viem            (^2.21.0)      — wallet client, signing, address utilities
```
