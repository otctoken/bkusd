export const U64_MAX = (1n << 64n) - 1n;
export function u64(n: bigint) {
  if (n < 0n || n > U64_MAX)
    throw new Error("Amount outside u64 range / 金额超出 u64 范围");
  return n;
}
export function parseAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255)
    throw new Error("Invalid decimals");
  if (!/^\d+(\.\d*)?$/.test(value.trim()))
    throw new Error("Enter a positive decimal amount / 请输入有效金额");
  const [whole, fraction = ""] = value.trim().split(".");
  if (fraction.length > decimals)
    throw new Error(`Maximum ${decimals} decimals / 最多 ${decimals} 位小数`);
  return u64(
    BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0") || "0"),
  );
}
export function formatAmount(n: bigint, decimals = 6, precision = decimals) {
  const negative = n < 0n;
  const s = (negative ? -n : n).toString().padStart(decimals + 1, "0");
  const whole = decimals ? s.slice(0, -decimals) : s;
  const fraction = decimals
    ? s.slice(-decimals).slice(0, precision).replace(/0+$/, "")
    : "";
  return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
}
export function mintAmount(n: bigint, decimals: number) {
  u64(n);
  if (decimals > 25)
    throw new Error("1001: Decimal gap too large / 精度差过大");
  const result =
    decimals > 6
      ? n / 10n ** BigInt(decimals - 6)
      : n * 10n ** BigInt(6 - decimals);
  if (result === 0n)
    throw new Error("1002: Mint rounds to zero / 铸造结果为零");
  return u64(result);
}
export function redeemAmount(reserve: bigint, amount: bigint, supply: bigint) {
  if (supply <= 0n || amount <= 0n || amount > supply)
    throw new Error("8: Invalid redemption amount / 无效赎回金额");
  return u64((u64(reserve) * u64(amount)) / u64(supply));
}
export const flashFee = (amount: bigint) => (u64(amount) / 10000n) * 2n;
export const percentage = (part: bigint, total: bigint) =>
  total > 0n ? Number((part * 10000n) / total) / 100 : 0;
// Fixed common precision for composition; a nominal token unit, never a market USD price.
export const normalized = (value: bigint, decimals: number) =>
  value * 10n ** BigInt(255 - decimals);
