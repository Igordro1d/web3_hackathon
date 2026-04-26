import { randomBytes, randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export interface WalletUser {
  id: string;
  walletAddress: `0x${string}`;
  network: 'avalanche-fuji' | 'avalanche';
  createdAt: number;
}

type AuthorizationCode = {
  code: string;
  user: WalletUser;
  redirectUri: string;
  createdAt: number;
};

const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, WalletUser>();

declare global {
  namespace Express {
    interface Request {
      user?: WalletUser;
    }
  }
}

export function createAuthorizationCode(user: Omit<WalletUser, 'id' | 'createdAt'>, redirectUri: string) {
  const code = randomBytes(32).toString('base64url');
  const walletUser: WalletUser = {
    id: randomUUID(),
    ...user,
    createdAt: Date.now(),
  };

  authorizationCodes.set(code, {
    code,
    user: walletUser,
    redirectUri,
    createdAt: Date.now(),
  });

  return code;
}

export function exchangeAuthorizationCode(code: string, redirectUri?: string) {
  const stored = authorizationCodes.get(code);
  if (!stored) return null;

  if (redirectUri && stored.redirectUri !== redirectUri) {
    return null;
  }

  authorizationCodes.delete(code);
  const accessToken = randomBytes(32).toString('base64url');
  accessTokens.set(accessToken, stored.user);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 60 * 60 * 24,
  };
}

export function requireOauthUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  const user = token ? accessTokens.get(token) : undefined;

  if (!user) {
    res.status(401).json({ error: 'Wallet connection required' });
    return;
  }

  req.user = user;
  next();
}

