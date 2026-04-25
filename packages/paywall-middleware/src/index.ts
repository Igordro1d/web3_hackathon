import type { Request, Response, NextFunction } from 'express';
import { createPublicClient, createWalletClient, http, parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NETWORKS, type NetworkName, type PaymentRequirements, type Transaction } from '@web3nz/shared';

const DATA_FILE = resolve(process.cwd(), 'data', 'transactions.json');
mkdirSync(dirname(DATA_FILE), { recursive: true });

export interface PaywallConfig {
  network: NetworkName;
  recipientAddress: `0x${string}`;
  facilitatorPrivateKey: `0x${string}`;
}

export interface ProtectOptions {
  price: string; // human-readable USDC, e.g. "0.01"
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

async function getDb() {
  return JSONFilePreset<{ transactions: Transaction[] }>(DATA_FILE, {
    transactions: [],
  });
}

export function createPaywall(config: PaywallConfig) {
  const { chain, usdcAddress } = NETWORKS[config.network];

  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL),
  });

  const account = privateKeyToAccount(config.facilitatorPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  return {
    protect(options: ProtectOptions) {
      const priceInBaseUnits = BigInt(Math.round(parseFloat(options.price) * 1_000_000));

      return async (req: Request, res: Response, next: NextFunction) => {
        const xPayment = req.headers['x-payment'] as string | undefined;

        if (!xPayment) {
          const requirements: PaymentRequirements = {
            scheme: 'exact',
            network: config.network,
            maxAmountRequired: priceInBaseUnits.toString(),
            resource: req.path,
            payTo: config.recipientAddress,
            asset: usdcAddress,
            maxTimeoutSeconds: 60,
          };
          res.status(402).json({
            x402Version: 1,
            accepts: [requirements],
            error: 'X-PAYMENT header is required',
          });
          return;
        }

        try {
          const decoded = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf8'));
          const { authorization, signature } = decoded.payload;

          if (authorization.to.toLowerCase() !== config.recipientAddress.toLowerCase()) {
            res.status(402).json({ error: 'Invalid payment recipient' });
            return;
          }
          if (BigInt(authorization.value) < priceInBaseUnits) {
            res.status(402).json({ error: 'Insufficient payment amount' });
            return;
          }
          const now = Math.floor(Date.now() / 1000);
          if (now < Number(authorization.validAfter) || now > Number(authorization.validBefore)) {
            res.status(402).json({ error: 'Payment authorization expired or not yet valid' });
            return;
          }

          const { v, r, s } = parseSignature(signature as `0x${string}`);

          const txHash = await walletClient.writeContract({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
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
            resource: req.path,
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
