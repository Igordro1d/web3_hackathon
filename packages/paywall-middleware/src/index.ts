import type { Request, Response, NextFunction } from 'express';
import { createPublicClient, createWalletClient, http, parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import {
  NETWORKS,
  type GatewayProductConfig,
  type NetworkName,
  type PaymentRequirements,
  type Transaction,
} from '@web3nz/shared';

const DATA_FILE = resolve(__dirname, '../../..', 'data', 'transactions.json');
const DEFAULT_DASHBOARD_BACKEND_URL = 'http://localhost:3001';
const DEFAULT_PRODUCT_CACHE_TTL_MS = 30_000;

mkdirSync(dirname(DATA_FILE), { recursive: true });

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

async function getDb() {
  return JSONFilePreset<{ transactions: Transaction[] }>(DATA_FILE, {
    transactions: [],
  });
}

function getDashboardBackendUrl() {
  return process.env.DASHBOARD_BACKEND_URL || DEFAULT_DASHBOARD_BACKEND_URL;
}

function getProductCacheTtlMs() {
  const value = Number(process.env.PRODUCT_CONFIG_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PRODUCT_CACHE_TTL_MS;
}

function getFacilitatorPrivateKey() {
  const privateKey = process.env.PAYWALL_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PAYWALL_PRIVATE_KEY is required');
  }
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

  if (!response.ok) {
    throw new Error(`Product lookup failed: ${response.status}`);
  }

  const product = (await response.json()) as GatewayProductConfig;
  if (!isNetworkName(product.network)) {
    throw new Error(`Unsupported product network: ${product.network}`);
  }

  return product;
}

async function getProductConfig(apiKey: string) {
  const cached = productCache.get(apiKey);
  const now = Date.now();
  const cacheTtlMs = getProductCacheTtlMs();

  if (cached && now - cached.fetchedAt < cacheTtlMs) {
    return cached.product;
  }

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
    publicClient: createPublicClient({
      chain,
      transport: http(process.env.RPC_URL),
    }),
    walletClient: createWalletClient({
      account,
      chain,
      transport: http(process.env.RPC_URL),
    }),
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

function validateProduct(product: GatewayProductConfig, res: Response) {
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
  if (!apiKey) {
    throw new Error('createPaywall requires a product API key');
  }

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

          const tx: Transaction = {
            id: randomUUID(),
            txHash,
            from: authorization.from,
            to: authorization.to,
            amount: authorization.value,
            resource: product.resource,
            timestamp: Date.now(),
          };

          const db = await getDb();
          db.data.transactions.push(tx);
          await db.write();

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
