import { createWalletClient, http, parseSignature, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  NETWORKS,
  type NetworkName,
  type PaymentRequirements,
  TRANSFER_WITH_AUTH_TYPES,
  getUsdcDomain,
} from '@web3nz/shared';

export interface AgentConfig {
  network: NetworkName;
  privateKey: `0x${string}`;
}

export function createAgent(config: AgentConfig) {
  const { chain, usdcAddress } = NETWORKS[config.network];
  const account = privateKeyToAccount(config.privateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  return {
    // Signs EIP-712 TransferWithAuthorization and retries with X-Payment header.
    // Does NOT submit anything on-chain — the business server handles settlement.
    async payAndFetch(url: string): Promise<Response> {
      console.log(`[agent-sdk] → GET ${url}`);
      const initialRes = await fetch(url);

      if (initialRes.status !== 402) {
        console.log(`[agent-sdk] ✓ ${initialRes.status} — no payment required`);
        return initialRes;
      }

      const body = await initialRes.json() as { accepts: PaymentRequirements[] };
      const req = body.accepts[0];
      console.log(`[agent-sdk] ← 402 Payment Required`);
      console.log(`[agent-sdk]   amount : ${Number(req.maxAmountRequired) / 1_000_000} USDC`);
      console.log(`[agent-sdk]   payTo  : ${req.payTo}`);
      console.log(`[agent-sdk]   network: ${req.network}`);

      if (!req) {
        throw new Error('No payment requirements in 402 response');
      }

      const now = Math.floor(Date.now() / 1000);
      const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));

      const authorization = {
        from: account.address,
        to: req.payTo as `0x${string}`,
        value: BigInt(req.maxAmountRequired),
        validAfter: BigInt(now - 30),
        validBefore: BigInt(now + req.maxTimeoutSeconds),
        nonce: nonce as `0x${string}`,
      };

      console.log(`[agent-sdk] ✍  Signing EIP-712 TransferWithAuthorization...`);
      const signature = await walletClient.signTypedData({
        domain: getUsdcDomain(chain.id, usdcAddress),
        types: TRANSFER_WITH_AUTH_TYPES,
        primaryType: 'TransferWithAuthorization',
        message: authorization,
      });
      console.log(`[agent-sdk] ✓  Signed — ${signature.slice(0, 20)}...`);

      const { v, r, s } = parseSignature(signature);

      const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: config.network,
        payload: {
          signature,
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce,
            v: Number(v),
            r,
            s,
          },
        },
      };

      const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
      console.log(`[agent-sdk] → Retrying with X-PAYMENT header...`);

      const paidRes = await fetch(url, { headers: { 'X-PAYMENT': encoded } });
      console.log(`[agent-sdk] ← ${paidRes.status} — access granted`);
      return paidRes;
    },
  };
}
