import type { Request, Response, NextFunction } from 'express';
import { createPublicClient, createWalletClient, http, parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  NETWORKS,
  createSupabaseAdmin,
  type GatewayProductConfig,
  type NetworkName,
  type PaymentRequirements,
  type TypedSupabaseClient,
} from '@web3nz/shared';

const DEFAULT_DASHBOARD_BACKEND_URL = 'http://localhost:3001';
const DEFAULT_PRODUCT_CACHE_TTL_MS = 30_000;

type ProductCacheEntry = {
  product: GatewayProductConfig;
  fetchedAt: number;
};

type ChainClients = {
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  account: ReturnType<typeof privateKeyToAccount>;
  chain: (typeof NETWORKS)[NetworkName]['chain'];
  usdcAddress: (typeof NETWORKS)[NetworkName]['usdcAddress'];
};

const productCache = new Map<string, ProductCacheEntry>();
const chainClients = new Map<NetworkName, ChainClients>();

// Lazy — we don't want createSupabaseAdmin() throwing at import time if env
// vars haven't loaded yet (the demo-business app loads dotenv before importing).
let supabase: TypedSupabaseClient | null = null;
function getSupabase(): TypedSupabaseClient {
  if (!supabase) supabase = createSupabaseAdmin();
  return supabase;
}

const USDC_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

function getDashboardBackendUrl(): string {
  return process.env.DASHBOARD_BACKEND_URL || DEFAULT_DASHBOARD_BACKEND_URL;
}

function getProductCacheTtlMs(): number {
  const value = Number(process.env.PRODUCT_CONFIG_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PRODUCT_CACHE_TTL_MS;
}

function getFacilitatorPrivateKey(): `0x${string}` {
  const privateKey = process.env.PAYWALL_PRIVATE_KEY;
  if (!privateKey) throw new Error('PAYWALL_PRIVATE_KEY is required');
  return privateKey as `0x${string}`;
}

function isNetworkName(value: string): value is NetworkName {
  return value in NETWORKS;
}

async function fetchProductConfig(apiKey: string): Promise<GatewayProductConfig> {
  const url = new URL(
    `/api/gateway/products/by-key/${encodeURIComponent(apiKey)}`,
    getDashboardBackendUrl(),
  );
  const response = await fetch(url);

  if (!response.ok) throw new Error(`Product lookup failed: ${response.status}`);

  const product = (await response.json()) as GatewayProductConfig;
  if (!isNetworkName(product.network)) {
    throw new Error(`Unsupported product network: ${product.network}`);
  }
  return product;
}

async function getProductConfig(apiKey: string): Promise<GatewayProductConfig> {
  const cached = productCache.get(apiKey);
  const now = Date.now();
  const cacheTtlMs = getProductCacheTtlMs();

  if (cached && now - cached.fetchedAt < cacheTtlMs) return cached.product;

  // Fail closed: don't fall back to a stale entry on refresh failure.
  // A merchant raising the price or disabling a product should take effect
  // within the cache TTL window, never longer.
  const product = await fetchProductConfig(apiKey);
  productCache.set(apiKey, { product, fetchedAt: now });
  return product;
}

function getChainClients(network: NetworkName): ChainClients {
  const cached = chainClients.get(network);
  if (cached) return cached;

  const { chain, usdcAddress } = NETWORKS[network];
  const account = privateKeyToAccount(getFacilitatorPrivateKey());
  const clients = {
    publicClient: createPublicClient({ chain, transport: http(process.env.RPC_URL) }),
    walletClient: createWalletClient({ account, chain, transport: http(process.env.RPC_URL) }),
    account,
    chain,
    usdcAddress,
  };

  chainClients.set(network, clients);
  return clients;
}

function buildPaymentRequirements(product: GatewayProductConfig): PaymentRequirements {
  const { usdcAddress } = NETWORKS[product.network];
  return {
    scheme: 'exact',
    network: product.network,
    maxAmountRequired: product.price,
    resource: product.resource,
    payTo: product.payTo,
    asset: usdcAddress,
    maxTimeoutSeconds: 60,
  };
}

function validateProduct(product: GatewayProductConfig, res: Response): boolean {
  if (product.status !== 'active') {
    res.status(402).json({ error: 'Product is inactive' });
    return false;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(product.payTo)) {
    res.status(402).json({ error: 'Product payment recipient is invalid' });
    return false;
  }
  return true;
}

export function createPaywall(apiKey: string) {
  if (!apiKey) throw new Error('createPaywall requires a product API key');

  return {
    protect() {
      return async (req: Request, res: Response, next: NextFunction) => {
        let product: GatewayProductConfig;
        try {
          product = await getProductConfig(apiKey);
        } catch (err) {
          console.error('[paywall] product lookup error:', err);
          res.status(503).json({ error: 'Product configuration unavailable' });
          return;
        }

        if (!validateProduct(product, res)) return;

        const requirements = buildPaymentRequirements(product);
        const xPayment = req.headers['x-payment'] as string | undefined;

        if (!xPayment) {
          res.status(402).json({
            x402Version: 1,
            product: {
              id: product.productId,
              name: product.name,
              description: product.description,
            },
            accepts: [requirements],
            error: 'X-PAYMENT header is required',
          });
          return;
        }

        try {
          const decoded = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf8'));
          const { authorization, signature } = decoded.payload;

          if (authorization.to.toLowerCase() !== product.payTo.toLowerCase()) {
            res.status(402).json({ error: 'Invalid payment recipient' });
            return;
          }
          if (BigInt(authorization.value) < BigInt(product.price)) {
            res.status(402).json({ error: 'Insufficient payment amount' });
            return;
          }
          const now = Math.floor(Date.now() / 1000);
          if (now < Number(authorization.validAfter) || now > Number(authorization.validBefore)) {
            res.status(402).json({ error: 'Payment authorization expired or not yet valid' });
            return;
          }

          const { walletClient, publicClient, account, chain, usdcAddress } = getChainClients(
            product.network,
          );
          const { v, r, s } = parseSignature(signature as `0x${string}`);

          const txHash = await walletClient.writeContract({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
            account,
            chain,
            args: [
              authorization.from as `0x${string}`,
              authorization.to as `0x${string}`,
              BigInt(authorization.value),
              BigInt(authorization.validAfter),
              BigInt(authorization.validBefore),
              authorization.nonce as `0x${string}`,
              Number(v),
              r,
              s,
            ],
          });

          await publicClient.waitForTransactionReceipt({ hash: txHash });

          // Persist to Supabase. The service role key bypasses RLS — required
          // because the paywall has no authenticated user session, only the
          // product API key.
          const { error: insertError } = await getSupabase()
            .from('transactions')
            .insert({
              tx_hash: txHash,
              from_address: authorization.from,
              to_address: authorization.to,
              amount: authorization.value,
              resource: product.resource,
            });

          if (insertError) {
            // The on-chain payment succeeded, so we don't roll back. Just log
            // and keep going — the dashboard will be missing this row, which
            // is recoverable from chain history.
            console.error('[paywall] failed to record transaction:', insertError);
          }

          res.setHeader('X-PAYMENT-RESPONSE', JSON.stringify({ txHash, status: 'confirmed' }));
          next();
        } catch (err) {
          console.error('[paywall] settlement error:', err);
          res.status(402).json({ error: 'Payment settlement failed' });
        }
      };
    },
  };
}
