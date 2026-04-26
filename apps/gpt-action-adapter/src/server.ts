import { randomBytes } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });

import express from 'express';
import {
  assertRedirectUriAllowed,
  getAdapterNetwork,
  getEnv,
  getOptionalEnv,
  getPort,
} from './config';
import { createAuthorizationCode, exchangeAuthorizationCode, requireOauthUser } from './oauth';
import { buildWalletSignInMessage, verifyWalletSignature } from './wallet-auth';
import { paidBusinessGet } from './payments';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const signInNonces = new Map<string, { message: string; expiresAt: number }>();

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gpt-action-adapter' });
});

app.get('/.well-known/openapi.yaml', (req, res) => {
  res.type('text/yaml').send(buildOpenApiSchema(getPublicBaseUrl(req)));
});

app.get('/oauth/authorize', (req, res) => {
  const redirectUri = String(req.query.redirect_uri || '');
  const state = typeof req.query.state === 'string' ? req.query.state : '';

  try {
    if (!redirectUri) throw new Error('redirect_uri is required');
    assertRedirectUriAllowed(redirectUri);
  } catch (err) {
    res.status(400).send(String(err));
    return;
  }

  res.type('html').send(renderWalletConnectPage({ redirectUri, state }));
});

app.post('/oauth/wallet-message', (req, res) => {
  const walletAddress = normalizeWallet(req.body.walletAddress);
  if (!walletAddress) {
    res.status(400).json({ error: 'walletAddress is required' });
    return;
  }

  const nonce = randomBytes(16).toString('hex');
  const domain = getOptionalEnv('GPT_ACTION_AUTH_DOMAIN') || req.hostname;
  const message = buildWalletSignInMessage({ domain, walletAddress, nonce });
  signInNonces.set(nonce, { message, expiresAt: Date.now() + 5 * 60_000 });
  res.json({ message, nonce });
});

app.post('/oauth/connect', async (req, res) => {
  const walletAddress = normalizeWallet(req.body.walletAddress);
  const signature = normalizeHex(req.body.signature);
  const message = typeof req.body.message === 'string' ? req.body.message : '';
  const redirectUri = typeof req.body.redirectUri === 'string' ? req.body.redirectUri : '';
  const state = typeof req.body.state === 'string' ? req.body.state : '';
  const nonce = extractNonce(message);

  try {
    if (!walletAddress) throw new Error('walletAddress is required');
    if (!signature) throw new Error('signature is required');
    if (!redirectUri) throw new Error('redirectUri is required');
    assertRedirectUriAllowed(redirectUri);

    if (!nonce) throw new Error('Sign-in message is missing nonce');
    const stored = signInNonces.get(nonce);
    if (!stored || stored.expiresAt < Date.now() || stored.message !== message) {
      throw new Error('Sign-in message expired or invalid');
    }

    const valid = await verifyWalletSignature({ walletAddress, message, signature });
    if (!valid) throw new Error('Wallet signature is invalid');

    signInNonces.delete(nonce);
    const code = createAuthorizationCode(
      { walletAddress, network: getAdapterNetwork() },
      redirectUri,
    );
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    res.json({ redirectUrl: redirectUrl.toString() });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/oauth/token', (req, res) => {
  const grantType = req.body.grant_type;
  const code = req.body.code;
  const redirectUri = req.body.redirect_uri;

  if (grantType !== 'authorization_code' || typeof code !== 'string') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  const token = exchangeAuthorizationCode(
    code,
    typeof redirectUri === 'string' ? redirectUri : undefined,
  );
  if (!token) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }

  res.json(token);
});

app.get('/api/wallet', requireOauthUser, (req, res) => {
  res.json({
    walletAddress: req.user!.walletAddress,
    network: req.user!.network,
  });
});

app.get('/api/market/price', requireOauthUser, async (req, res) => {
  try {
    await handlePaidRoute(req, res, '/premium', {
      symbol: getSymbol(req.query.symbol),
    });
  } catch (err) {
    respondBadRequest(res, err);
  }
});

app.get('/api/market/stats', requireOauthUser, async (req, res) => {
  try {
    await handlePaidRoute(req, res, '/premium/stats', {
      symbol: getSymbol(req.query.symbol),
    });
  } catch (err) {
    respondBadRequest(res, err);
  }
});

app.get('/api/market/klines', requireOauthUser, async (req, res) => {
  try {
    await handlePaidRoute(req, res, '/premium/klines', {
      symbol: getSymbol(req.query.symbol),
      interval: getInterval(req.query.interval),
      limit: getLimit(req.query.limit),
    });
  } catch (err) {
    respondBadRequest(res, err);
  }
});

async function handlePaidRoute(
  req: express.Request,
  res: express.Response,
  path: string,
  params: Record<string, string | number>,
) {
  try {
    const result = await paidBusinessGet(path, params);
    res.json({
      connectedWallet: req.user!.walletAddress,
      paidBy: 'gpt-action-adapter',
      ...result,
    });
  } catch (err) {
    const status = typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 502;
    res.status(status).json({
      error: err instanceof Error ? err.message : String(err),
      body: (err as { body?: unknown }).body,
    });
  }
}

function respondBadRequest(res: express.Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
}

function getSymbol(value: unknown) {
  const symbol = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'BTCUSDT';
  if (!/^[A-Z0-9]{3,20}$/.test(symbol)) {
    throw new Error('Invalid symbol');
  }
  return symbol;
}

function getInterval(value: unknown) {
  const interval = typeof value === 'string' ? value : '1h';
  const allowed = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);
  if (!allowed.has(interval)) {
    throw new Error('Invalid interval');
  }
  return interval;
}

function getLimit(value: unknown) {
  const parsed = Number(value || 24);
  if (!Number.isInteger(parsed) || parsed < 1) return 24;
  return Math.min(parsed, 100);
}

function normalizeWallet(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as `0x${string}`;
}

function normalizeHex(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !value.startsWith('0x')) return null;
  return value as `0x${string}`;
}

function extractNonce(message: string) {
  const match = message.match(/^Nonce: ([a-f0-9]+)$/m);
  return match?.[1];
}

function getPublicBaseUrl(req: express.Request) {
  return getOptionalEnv('GPT_ACTION_ADAPTER_PUBLIC_URL') || `${req.protocol}://${req.get('host')}`;
}

function renderWalletConnectPage(params: { redirectUri: string; state: string }) {
  const payload = JSON.stringify(params).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Wallet</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 520px; margin: 48px auto; padding: 0 20px; color: #111827; }
      button { background: #111827; color: white; border: 0; border-radius: 8px; padding: 12px 16px; font-size: 16px; cursor: pointer; }
      pre { white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>Connect Wallet</h1>
    <p>Connect and sign a message to authorize this Custom GPT action.</p>
    <button id="connect">Connect wallet</button>
    <pre id="status"></pre>
    <script>
      const params = ${payload};
      const status = document.getElementById('status');
      document.getElementById('connect').onclick = async () => {
        try {
          if (!window.ethereum) throw new Error('No EVM wallet found.');
          const [walletAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const messageRes = await fetch('/oauth/wallet-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress }),
          });
          const { message, error } = await messageRes.json();
          if (error) throw new Error(error);
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress],
          });
          const connectRes = await fetch('/oauth/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, signature, message, redirectUri: params.redirectUri, state: params.state }),
          });
          const result = await connectRes.json();
          if (result.error) throw new Error(result.error);
          window.location.href = result.redirectUrl;
        } catch (err) {
          status.textContent = String(err.message || err);
        }
      };
    </script>
  </body>
</html>`;
}

function buildOpenApiSchema(baseUrl: string) {
  return `openapi: 3.1.0
info:
  title: Paywall Demo Market Data
  description: Access paid crypto market data through Paywall Middleware after connecting a wallet.
  version: 1.0.0
servers:
  - url: ${baseUrl}
paths:
  /api/wallet:
    get:
      operationId: getConnectedWallet
      summary: Get the connected wallet.
      responses:
        '200':
          description: Connected wallet.
  /api/market/price:
    get:
      operationId: getCryptoSpotPrice
      summary: Get the latest paid spot price.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
      responses:
        '200':
          description: Paid spot price response.
  /api/market/stats:
    get:
      operationId: getCrypto24hStats
      summary: Get paid 24-hour market stats.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
      responses:
        '200':
          description: Paid 24-hour stats response.
  /api/market/klines:
    get:
      operationId: getCryptoKlines
      summary: Get paid candlestick data.
      parameters:
        - name: symbol
          in: query
          required: false
          schema:
            type: string
            default: BTCUSDT
        - name: interval
          in: query
          required: false
          schema:
            type: string
            enum: [1m, 5m, 15m, 1h, 4h, 1d]
            default: 1h
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 24
            maximum: 100
      responses:
        '200':
          description: Paid candlestick response.
`;
}

const PORT = getPort();
app.listen(PORT, () => {
  console.log(`GPT action adapter running on http://localhost:${PORT}`);
});
