import type { NetworkName } from './networks';

export interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string; // USDC base units (6 decimals)
  resource: string;
  timestamp: number;
}

export interface PaymentRequirements {
  scheme: 'exact';
  network: 'avalanche-fuji' | 'avalanche';
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

export interface TransferAuthorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: `0x${string}`;
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

export interface GatewayProductConfig {
  productId: string;
  name: string;
  description: string;
  resource: string;
  price: string; // USDC base units (6 decimals)
  network: NetworkName;
  payTo: `0x${string}`;
  status: 'active' | 'inactive';
}
