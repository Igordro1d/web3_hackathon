import { useEffect, useState } from 'react';
import { createPublicClient, http, isAddress } from 'viem';
import { sepolia } from 'viem/chains';

const client = createPublicClient({
  chain: sepolia,
  transport: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
});

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

async function resolve(address: string): Promise<string | null> {
  if (!isAddress(address)) return null;

  const key = address.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = client
    .getEnsName({ address: address as `0x${string}` })
    .then((name) => {
      const value = name ?? null;
      cache.set(key, value);
      inflight.delete(key);
      return value;
    })
    .catch(() => {
      cache.set(key, null);
      inflight.delete(key);
      return null;
    });

  inflight.set(key, p);
  return p;
}

export function useEnsName(address: string | undefined): string | null {
  const [name, setName] = useState<string | null>(() =>
    address ? cache.get(address.toLowerCase()) ?? null : null,
  );

  useEffect(() => {
    if (!address || !isAddress(address)) {
      setName(null);
      return;
    }

    const key = address.toLowerCase();
    setName(cache.get(key) ?? null);

    let cancelled = false;
    resolve(address).then((n) => {
      if (!cancelled) setName(n);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return name;
}
