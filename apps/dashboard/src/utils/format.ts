export function formatUSDC(baseUnits: string) {
  const value = BigInt(baseUnits || '0');
  const whole = value / 1_000_000n;
  const decimal = (value % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${decimal}`;
}

export function truncate(value: string, chars = 6) {
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
}

export function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}
