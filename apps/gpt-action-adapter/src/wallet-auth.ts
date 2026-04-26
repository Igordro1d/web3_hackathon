import { verifyMessage } from 'viem';

export function buildWalletSignInMessage(params: {
  domain: string;
  walletAddress: string;
  nonce: string;
}) {
  return [
    `${params.domain} wants you to connect your wallet to Paywall Middleware.`,
    '',
    `Wallet: ${params.walletAddress}`,
    `Nonce: ${params.nonce}`,
    'Purpose: Custom GPT action authentication',
  ].join('\n');
}

export async function verifyWalletSignature(params: {
  walletAddress: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}) {
  return verifyMessage({
    address: params.walletAddress,
    message: params.message,
    signature: params.signature,
  });
}

