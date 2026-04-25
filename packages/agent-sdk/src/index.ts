import type { NetworkName } from '@web3nz/shared';

export interface AgentConfig {
  network: NetworkName;
  privateKey: `0x${string}`;
}

export function createAgent(config: AgentConfig) {
  return {
    //sends the http request to /premium, and gets back with a 402. It uses PRIVATE KEY to sign the message, and attaches that signature to the X-Payment Header. DOES NOT touch C-Chain
    async payAndFetch(url: string): Promise<Response> {
      // TODO: implement 402 handling + EIP-712 signing + retry
      console.log('[agent-sdk] stub payAndFetch called', { config, url });
      return fetch(url);
    },
  };
}
