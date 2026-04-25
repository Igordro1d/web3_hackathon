import type { Request, Response, NextFunction } from 'express';
import type { NetworkName } from '@web3nz/shared';

export interface PaywallConfig {
  network: NetworkName;
  recipientAddress: `0x${string}`;
  facilitatorPrivateKey: `0x${string}`;
}

export interface ProtectOptions {
  price: string; // human-readable USDC, e.g. "0.01"
}

//Logic for accepting the signed form from AgentSDK and verifies the validity of the signature. Submits to the C-Chain using transferWithAuthorization(), waits for receipt then stores the transaction into the json. 
export function createPaywall(config: PaywallConfig) {
  return {
    protect(options: ProtectOptions) {
      return async (req: Request, res: Response, next: NextFunction) => {
        // TODO: implement 402 response, signature validation, settlement
        console.log('[paywall] stub middleware called', { config, options });
        next();
      };
    },
  };
}
