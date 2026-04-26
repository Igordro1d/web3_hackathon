import type { NetworkName } from '@web3nz/shared';

export function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name] || undefined;
}

export function getPort() {
  return Number(process.env.GPT_ACTION_ADAPTER_PORT || 3003);
}

export function getAdapterNetwork(): NetworkName {
  const value = process.env.GPT_ACTION_PAYMENT_NETWORK || 'avalanche-fuji';
  if (value !== 'avalanche-fuji' && value !== 'avalanche') {
    throw new Error(`Unsupported GPT_ACTION_PAYMENT_NETWORK: ${value}`);
  }
  return value;
}

export function getAllowedRedirectUris() {
  return (process.env.GPT_ACTION_REDIRECT_URIS || '')
    .split(',')
    .map((uri) => uri.trim())
    .filter(Boolean);
}

export function assertRedirectUriAllowed(redirectUri: string) {
  const allowed = getAllowedRedirectUris();
  if (allowed.length === 0) return;

  if (!allowed.includes(redirectUri)) {
    throw new Error('redirect_uri is not allowed');
  }
}

