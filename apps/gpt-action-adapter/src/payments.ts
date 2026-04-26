import { getAdapterNetwork, getEnv, getOptionalEnv } from './config';
import { paidFetch, type PaidFetchResult } from './x402-client';

export async function paidBusinessGet(path: string, params: Record<string, string | number>) {
  const url = new URL(path, getEnv('DEMO_BUSINESS_URL', 'http://localhost:3000'));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const result = await paidFetch(url.toString(), {
    network: getAdapterNetwork(),
    privateKey: getEnv('GPT_ACTION_PAYMENT_PRIVATE_KEY') as `0x${string}`,
    rpcUrl: getOptionalEnv('RPC_URL'),
  });

  return parsePaidJson(result);
}

async function parsePaidJson(result: PaidFetchResult) {
  let body: unknown = null;
  const text = await result.response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!result.response.ok) {
    const error = new Error(`Paid business request failed: ${result.response.status}`);
    Object.assign(error, { status: result.response.status, body });
    throw error;
  }

  return {
    data: body,
    payment: result.payment,
  };
}

