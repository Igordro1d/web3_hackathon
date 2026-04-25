import { avalanche, avalancheFuji } from 'viem/chains';

export const NETWORKS = {
  'avalanche-fuji': {
    chain: avalancheFuji,
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65' as const,
  },
  'avalanche': {
    chain: avalanche,
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as const,
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;
