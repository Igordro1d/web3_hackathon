import { createWalletClient, http, parseSignature, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  NETWORKS,
  TRANSFER_WITH_AUTH_TYPES,
  getUsdcDomain,
  type NetworkName,
  type PaymentRequirements,
} from '@web3nz/shared';

export interface X402ClientConfig {
  network: NetworkName;
  privateKey: `0x${string}`;
  rpcUrl?: string;
}

export interface PaidFetchResult {
  response: Response;
  payment?: {
    network: NetworkName;
    amount: string;
    payTo: string;
    resource: string;
    responseHeader?: string;
  };
}

type PaymentChallenge = {
  accepts?: PaymentRequirements[];
};

export async function paidFetch(url: string, config: X402ClientConfig): Promise<PaidFetchResult> {
  const initialRes = await fetch(url);
  if (initialRes.status !== 402) {
    return { response: initialRes };
  }

  const challenge = (await initialRes.json()) as PaymentChallenge;
  const requirement = selectPaymentRequirement(challenge.accepts, config.network);
  const xPayment = await buildXPaymentHeader(requirement, config);
  const paidRes = await fetch(url, { headers: { 'X-Payment': xPayment } });

  return {
    response: paidRes,
    payment: {
      network: config.network,
      amount: requirement.maxAmountRequired,
      payTo: requirement.payTo,
      resource: requirement.resource,
      responseHeader: paidRes.headers.get('x-payment-response') || undefined,
    },
  };
}

function selectPaymentRequirement(requirements: PaymentRequirements[] | undefined, network: NetworkName) {
  const requirement = requirements?.find((item) => item.network === network) ?? requirements?.[0];
  if (!requirement) {
    throw new Error('No payment requirements in 402 response');
  }
  if (requirement.scheme !== 'exact') {
    throw new Error(`Unsupported payment scheme: ${requirement.scheme}`);
  }
  if (!(requirement.network in NETWORKS)) {
    throw new Error(`Unsupported payment network: ${requirement.network}`);
  }
  return requirement;
}

async function buildXPaymentHeader(requirement: PaymentRequirements, config: X402ClientConfig) {
  const network = requirement.network as NetworkName;
  const { chain, usdcAddress } = NETWORKS[network];
  const account = privateKeyToAccount(config.privateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  });

  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: requirement.payTo as `0x${string}`,
    value: BigInt(requirement.maxAmountRequired),
    validAfter: BigInt(now - 30),
    validBefore: BigInt(now + requirement.maxTimeoutSeconds),
    nonce: toHex(crypto.getRandomValues(new Uint8Array(32))) as `0x${string}`,
  };

  const signature = await walletClient.signTypedData({
    domain: getUsdcDomain(chain.id, usdcAddress),
    types: TRANSFER_WITH_AUTH_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  const { v, r, s } = parseSignature(signature);

  const payload = {
    x402Version: 1,
    scheme: 'exact',
    network,
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

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

