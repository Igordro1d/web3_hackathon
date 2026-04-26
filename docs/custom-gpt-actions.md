# Custom GPT Actions Adapter Plan

This planning doc outlines the changes needed to let a Custom GPT interact with `apps/demo-business` after a user connects a wallet.

## Goal

Build a Custom GPT that can:

1. Ask the user to connect a wallet.
2. Use that wallet identity for authenticated requests.
3. Call the demo business market-data API.
4. Pay the API through the x402 flow before returning paid data to the user.

## Important Constraint

Do not point the Custom GPT action directly at `demo-business`.

`demo-business` expects x402 clients to:

1. Call a paid route.
2. Receive `402 Payment Required`.
3. Sign a USDC `TransferWithAuthorization`.
4. Retry the same route with an `X-Payment` header.

Custom GPT Actions are configured with an OpenAPI schema and standard action authentication. They are not a browser wallet runtime and should not be expected to open a wallet extension, hold a user private key, or manually orchestrate custom x402 retry headers from the GPT itself. OpenAI's production notes also state that custom headers are not supported for Actions, so the GPT should not be responsible for sending `X-Payment` to `demo-business`.

Instead, add a small HTTPS adapter API between the Custom GPT and `demo-business`.

## Recommended Architecture

```text
User
  |
  | ChatGPT conversation
  v
Custom GPT
  |
  | GPT Action, OAuth bearer token
  v
GPT Action Adapter API
  |
  | verifies user session / wallet identity
  | performs x402 payment flow
  v
demo-business API
  |
  | paywall.protect()
  v
@web3nz/paywall-middleware
```

The Custom GPT only talks to the adapter. The adapter talks to `demo-business` and handles the payment retry.

## Required Changes

### 1. Add a Wallet Connection Web App

Create a small public web page where the user can connect an EVM wallet.

Recommended flow:

1. User clicks "Sign in" from the Custom GPT OAuth flow.
2. Your auth page opens.
3. User connects a wallet.
4. User signs a Sign-In with Ethereum style message proving wallet ownership.
5. Your backend creates a user session tied to that wallet address.
6. Your OAuth token endpoint returns an access token to ChatGPT.

The access token should identify the wallet user, not expose the wallet private key.

### 2. Add an OAuth Server for the Custom GPT

Custom GPT Actions support OAuth for per-user authentication. Use OAuth so each ChatGPT user connects their own wallet-backed account.

Add endpoints like:

```text
GET  /oauth/authorize
POST /oauth/token
```

The OAuth account should map to:

```ts
interface WalletUser {
  id: string;
  walletAddress: `0x${string}`;
  network: 'avalanche-fuji' | 'avalanche';
  createdAt: number;
}
```

The GPT Action adapter should require:

```http
Authorization: Bearer <user_access_token>
```

### 3. Add a GPT Action Adapter API

Create a new service, for example:

```text
apps/gpt-action-adapter/
```

This service exposes GPT-friendly endpoints that do not require the GPT to know about x402 internals.

Recommended endpoints:

```text
GET /api/wallet
GET /api/market/price?symbol=BTCUSDT
GET /api/market/stats?symbol=BTCUSDT
GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=24
```

The adapter should:

1. Validate the OAuth bearer token.
2. Resolve the connected wallet/user.
3. Call the matching `demo-business` endpoint.
4. If `demo-business` returns `402`, complete the x402 payment flow.
5. Return clean JSON to the Custom GPT.

### 4. Add Adapter-Local x402 Payment Logic

Implement the x402 client flow inside `apps/gpt-action-adapter` instead of importing or changing `@web3nz/agent-sdk`.

The adapter should have its own payment module that:

1. Calls the target `demo-business` URL.
2. Reads the `402` payment requirements.
3. Selects a supported requirement.
4. Signs a USDC `TransferWithAuthorization` payload.
5. Retries with `X-Payment`.
6. Returns the paid response and transaction metadata to the adapter route.

This keeps the existing agent SDK stable for agent/client use cases while the GPT adapter can evolve independently for OAuth, connected-wallet sessions, spending limits, and Custom GPT response shaping.

Non-goals for this branch:

- Do not change `packages/agent-sdk/src/index.ts`.
- Do not add GPT/OAuth behavior to `@web3nz/agent-sdk`.
- Do not make `apps/gpt-action-adapter` import `@web3nz/agent-sdk`.
- Do not change the `@web3nz/agent-sdk` public API to satisfy Custom GPT behavior.

The adapter can reuse protocol primitives from `@web3nz/shared`, such as:

```ts
import {
  NETWORKS,
  TRANSFER_WITH_AUTH_TYPES,
  getUsdcDomain,
  type PaymentRequirements,
} from '@web3nz/shared';
```

It should not depend on:

```ts
import { createAgent } from '@web3nz/agent-sdk';
```

### 5. Decide How Payments Are Signed

The adapter-local x402 client still needs access to a signing capability. A Custom GPT cannot safely hold or use the user's wallet private key, so you need one of these payment models.

#### Option A: Server-Controlled Demo Wallet

Use one funded demo wallet for all GPT requests.

This is the fastest path for a hackathon demo:

- The user connects a wallet for identity only.
- The adapter pays from a server-controlled wallet using its own adapter-local x402 payment module.
- The response can show both the connected wallet and the payment transaction hash.

Tradeoff: the connected user wallet is not the wallet paying USDC.

#### Option B: User-Delegated Session Wallet

Create or connect a limited session wallet for each user.

Flow:

1. User connects their wallet.
2. User funds or authorizes a session wallet.
3. Adapter stores only the session wallet key or signing capability.
4. Adapter uses that session wallet to sign x402 payments.

Tradeoff: more implementation work, but closer to the desired "user wallet pays" model.

Add spending controls:

- Network allowlist.
- Per-request max USDC.
- Daily or session max USDC.
- Product/resource allowlist.
- Revocation support.

#### Option C: Manual Approval Per Payment

Send the user to a payment approval page each time a paid request is needed.

Flow:

1. GPT calls adapter.
2. Adapter receives `402` from `demo-business`.
3. Adapter creates a pending payment session.
4. GPT tells the user to open an approval URL.
5. User signs in the web app.
6. Adapter completes the x402 retry.
7. GPT calls a status/result endpoint.

Tradeoff: safest for explicit consent, but clunky in conversation.

## Recommended Hackathon Path

For the current repo, implement Option A first:

```text
Custom GPT OAuth wallet connection
        +
adapter-local x402 client pays with server demo wallet
        +
demo-business keeps existing paywall middleware unchanged
```

This proves the end-to-end product:

- Users connect a wallet in the GPT flow.
- The GPT can identify the connected wallet.
- The GPT can request premium data.
- The adapter performs x402 payment.
- `demo-business` receives a valid `X-Payment`.
- The dashboard records the settled transaction.
- `packages/agent-sdk` remains unchanged.

After the demo works, replace the server demo wallet with delegated user session wallets.

## Adapter Implementation Outline

The adapter should implement its own x402 HTTP client in `apps/gpt-action-adapter/src/payments.ts`.

Suggested module split:

```text
apps/gpt-action-adapter/src/payments.ts
  paidFetch()
  buildAuthorization()
  signAuthorization()
  encodeXPayment()
```

The code can mirror the protocol used by `@web3nz/agent-sdk`, but it should live in the adapter. If common protocol code becomes useful later, extract it into `@web3nz/shared` instead of changing the agent SDK's public behavior.

```ts
import { createWalletClient, http, parseSignature, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  NETWORKS,
  TRANSFER_WITH_AUTH_TYPES,
  getUsdcDomain,
  type NetworkName,
  type PaymentRequirements,
} from '@web3nz/shared';

interface AdapterPaymentConfig {
  network: NetworkName;
  privateKey: `0x${string}`;
}

const paymentConfig: AdapterPaymentConfig = {
  network: 'avalanche-fuji',
  privateKey: process.env.GPT_ACTION_PAYMENT_PRIVATE_KEY as `0x${string}`,
};

const account = privateKeyToAccount(paymentConfig.privateKey);

async function paidGet(path: string) {
  const url = new URL(path, process.env.DEMO_BUSINESS_URL);
  const response = await paidFetch(url.toString(), paymentConfig);

  if (!response.ok) {
    throw new Error(`Paid request failed: ${response.status}`);
  }

  return response.json();
}

async function paidFetch(url: string, config: AdapterPaymentConfig) {
  const initialRes = await fetch(url);
  if (initialRes.status !== 402) return initialRes;

  const body = (await initialRes.json()) as { accepts: PaymentRequirements[] };
  const requirement = body.accepts[0];
  if (!requirement) {
    throw new Error('No payment requirements in 402 response');
  }

  const { chain, usdcAddress } = NETWORKS[config.network];
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: requirement.payTo as `0x${string}`,
    value: BigInt(requirement.maxAmountRequired),
    validAfter: BigInt(now - 30),
    validBefore: BigInt(now + requirement.maxTimeoutSeconds),
    nonce: toHex(crypto.getRandomValues(new Uint8Array(32))) as `0x${string}`,
  };

  const signature = await walletClient.signTypedData({
    domain: getUsdcDomain(chain.id, usdcAddress),
    types: TRANSFER_WITH_AUTH_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });

  const { v, r, s } = parseSignature(signature);
  const xPayment = Buffer.from(
    JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: config.network,
      payload: {
        signature,
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value.toString(),
          validAfter: authorization.validAfter.toString(),
          validBefore: authorization.validBefore.toString(),
          nonce: authorization.nonce,
          v: Number(v),
          r,
          s,
        },
      },
    }),
  ).toString('base64');

  return fetch(url, { headers: { 'X-Payment': xPayment } });
}
```

Example route:

```ts
app.get('/api/market/price', requireOauthUser, async (req, res) => {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const data = await paidGet(`/premium?symbol=${encodeURIComponent(symbol)}`);

  res.json({
    connectedWallet: req.user.walletAddress,
    paidBy: 'server-demo-wallet',
    data,
  });
});
```

## OpenAPI Schema for the Custom GPT

Expose the adapter, not `demo-business`, in your GPT Action schema.

```yaml
openapi: 3.1.0
info:
  title: Paywall Demo Market Data
  description: Access paid crypto market data through the paywall middleware demo after the user connects a wallet.
  version: 1.0.0
servers:
  - url: https://YOUR_PUBLIC_ADAPTER_DOMAIN
paths:
  /api/wallet:
    get:
      operationId: getConnectedWallet
      summary: Get the wallet connected to this ChatGPT user.
      responses:
        '200':
          description: Connected wallet.
          content:
            application/json:
              schema:
                type: object
                properties:
                  walletAddress:
                    type: string
                  network:
                    type: string
                    enum: [avalanche-fuji, avalanche]
  /api/market/price:
    get:
      operationId: getCryptoSpotPrice
      summary: Get the latest paid spot price for a crypto trading pair.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
          description: Binance trading pair symbol, such as BTCUSDT or AVAXUSDT.
      responses:
        '200':
          description: Paid spot price response.
          content:
            application/json:
              schema:
                type: object
  /api/market/stats:
    get:
      operationId: getCrypto24hStats
      summary: Get paid 24-hour price and volume stats for a crypto trading pair.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
          description: Binance trading pair symbol, such as BTCUSDT or AVAXUSDT.
      responses:
        '200':
          description: Paid 24-hour stats response.
          content:
            application/json:
              schema:
                type: object
  /api/market/klines:
    get:
      operationId: getCryptoKlines
      summary: Get paid candlestick data for a crypto trading pair.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
          description: Binance trading pair symbol, such as BTCUSDT or AVAXUSDT.
        - name: interval
          in: query
          required: false
          schema:
            type: string
            default: 1h
          description: Candlestick interval, such as 1m, 5m, 1h, 4h, or 1d.
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 24
            maximum: 100
          description: Number of candles to return, up to 100.
      responses:
        '200':
          description: Paid candlestick response.
          content:
            application/json:
              schema:
                type: object
```

Configure the GPT Action authentication as OAuth and point it at your adapter's OAuth endpoints.

## Suggested Custom GPT Instructions

```text
You help users retrieve paid crypto market data through the Paywall Middleware demo.

Before calling market data actions, make sure the user has connected a wallet. If no wallet is connected, call getConnectedWallet or ask the user to sign in/connect their wallet through the action authentication flow.

Use getCryptoSpotPrice for latest price questions.
Use getCrypto24hStats for performance, volume, high, low, or volatility questions.
Use getCryptoKlines for trend, candle, or historical interval questions.

Tell the user that paid API access may trigger an x402 USDC payment handled by the connected service. Do not claim that ChatGPT directly signs wallet transactions.
```

## Production Requirements

Before using this outside a local demo:

- Serve the adapter over HTTPS on port 443 with a valid certificate.
- Keep OAuth authorization, token, and API endpoints on the same domain as the action server unless an OpenAI-supported exception applies.
- Keep OpenAPI operation summaries and parameter descriptions concise enough for GPT Action schema limits.
- Keep request and response bodies small and text/JSON-only.
- Add rate limiting and return `429` when appropriate.
- Add spending limits before any server-side or delegated wallet signs payments.
- Log each paid request with user ID, connected wallet, product resource, amount, transaction hash, and timestamp.
- Never expose private keys or raw session signing material to ChatGPT.
- Validate all symbols, intervals, and limits before forwarding to `demo-business`.
- Return clear errors when the wallet is not connected or payment fails.

## Files You Will Likely Add

```text
apps/gpt-action-adapter/
  src/server.ts
  src/oauth.ts
  src/wallet-auth.ts
  src/payments.ts       # route-facing payment orchestration
  src/x402-client.ts
  package.json
  tsconfig.json
```

The adapter package should depend on `@web3nz/shared`, `viem`, `express`, and OAuth/session helpers as needed. It should not depend on `@web3nz/agent-sdk`.

Optional shared types:

```text
packages/shared/src/gpt-actions.ts
```

## Files You Can Leave Unchanged Initially

```text
apps/demo-business/src/server.ts
packages/paywall-middleware/src/index.ts
packages/agent-sdk/src/index.ts
```

The adapter should make the existing demo API usable from a Custom GPT without changing the core paywall middleware contract or the existing agent SDK implementation.

## References

- [OpenAI GPT Actions authentication](https://platform.openai.com/docs/actions/authentication)
- [OpenAI GPT Actions getting started](https://platform.openai.com/docs/actions/getting-started/getting-started)
- [OpenAI GPT Actions production notes](https://platform.openai.com/docs/actions/production)
- [OpenAI Help: configuring actions in GPTs](https://help.openai.com/en/articles/9442513-configuring-actions-in-gpts)
