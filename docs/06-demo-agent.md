# apps/demo-agent

**Package name:** `demo-agent`  
**Location:** `apps/demo-agent/`  
**Runtime:** Node.js via `tsx` (no compile step)  
**Mode:** One-shot script — runs, prints result, exits

---

## Purpose

A minimal script that demonstrates how an AI agent would use `@web3nz/agent-sdk` to call a paywall-protected API. It simulates the agent side of the payment flow: attempt to fetch a premium resource, handle the 402 challenge (once the SDK is fully implemented), and print what it receives.

This is intentionally kept as a standalone script rather than a long-running service, making it easy to run repeatedly during development to test the full round-trip.

---

## Entry Point: `src/index.ts`

### Imports and agent creation

```ts
import 'dotenv/config';
import { createAgent } from '@web3nz/agent-sdk';
```

`dotenv/config` loads `.env` from the project root, which must contain `AGENT_PRIVATE_KEY` for the real payment flow to work.

```ts
const agent = createAgent({
  network: 'avalanche-fuji',
  privateKey: (process.env.AGENT_PRIVATE_KEY || '0x0') as `0x${string}`,
});
```

`'0x0'` is a nonsense private key used as a fallback so the script can run without a real key during development. Once the SDK is fully implemented, a `'0x0'` key would produce an invalid signature and the server would reject the payment.

### The fetch call

```ts
const res = await agent.payAndFetch('http://localhost:3000/premium');
const data = await res.json();
console.log('Agent received:', data);
```

`payAndFetch` is designed to be a drop-in for `fetch`. With the stub SDK, this is equivalent to:

```ts
const res = await fetch('http://localhost:3000/premium');
```

With the full SDK, it will:
1. Attempt the request.
2. On `402`, parse `PaymentRequirements`, sign a `TransferAuthorization`, retry with `X-Payment` header.
3. Return the final `Response`.

### Error handling

```ts
main().catch(console.error);
```

Unhandled errors (e.g. network failures because `demo-business` isn't running) print to stderr and exit with code 1. This is expected and intentional — the agent is a demo script, not a production service.

---

## Running

```bash
# One-shot run
pnpm --filter demo-agent start
# runs: tsx src/index.ts

# Watch mode (re-runs on file save)
pnpm --filter demo-agent dev
# runs: tsx watch src/index.ts
```

**Expected output with stub (no business server running):**
```
[agent-sdk] stub payAndFetch called { config: { network: 'avalanche-fuji', privateKey: '0x0' }, url: 'http://localhost:3000/premium' }
TypeError: fetch failed
  ...
  code: 'ECONNREFUSED'
```

**Expected output with business server running (stub middleware):**
```
[agent-sdk] stub payAndFetch called { ... }
Agent received: { message: 'This is premium paid content', secret: 42 }
```

**Expected output once fully implemented:**
```
Agent received: { message: 'This is premium paid content', secret: 42 }
```

---

## Dependency Graph

```
demo-agent
├── @web3nz/agent-sdk  (workspace:*)
├── @web3nz/shared     (workspace:*)
└── dotenv             (^16.4.0)
```

`@web3nz/shared` is listed explicitly even though `agent-sdk` already depends on it. This makes the types available for any code added directly to this app (e.g. manually constructing a `TransferAuthorization` for debugging).
