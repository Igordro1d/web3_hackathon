export const TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export function getUsdcDomain(chainId: number, usdcAddress: `0x${string}`) {
  return {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: usdcAddress,
  };
}
