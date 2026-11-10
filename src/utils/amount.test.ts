import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  mintAmount,
  redeemAmount,
  flashFee,
  formatAmount,
  U64_MAX,
} from "./amount";
test("preserves amounts above Number.MAX_SAFE_INTEGER exactly", () => {
  const n = parseAmount("9007199254.740993", 6);
  assert.equal(n, 9007199254740993n);
  assert.equal(formatAmount(n, 6), "9007199254.740993");
});
test("rejects scientific notation, negative and excessive decimals", () => {
  for (const s of ["1e6", "-1", "NaN", ".1", "1.0000001"])
    assert.throws(() => parseAmount(s, 6));
});
test("u64 boundary is exact", () => {
  assert.equal(parseAmount("18446744073709.551615", 6), U64_MAX);
  assert.throws(() => parseAmount("18446744073709.551616", 6));
});
test("mint matches the Move multiply / divide branches", () => {
  assert.equal(mintAmount(1234567890n, 9), 1234567n);
  assert.equal(mintAmount(123n, 2), 1230000n);
  assert.equal(mintAmount(123n, 6), 123n);
});
test("zero mint, decimal gap and multiplication overflow abort", () => {
  assert.throws(() => mintAmount(999n, 9));
  assert.throws(() => mintAmount(1n, 26));
  assert.throws(() => mintAmount(U64_MAX, 5));
});
test("redeem uses widened intermediates and floors each asset", () => {
  assert.equal(redeemAmount(U64_MAX, U64_MAX, U64_MAX), U64_MAX);
  assert.equal(redeemAmount(10n, 1n, 3n), 3n);
  assert.equal(redeemAmount(0n, 1n, 3n), 0n);
  assert.throws(() => redeemAmount(1n, 0n, 0n));
  assert.throws(() => redeemAmount(10n, 4n, 3n));
});
test("flash fee divides BEFORE multiplying", () => {
  assert.equal(flashFee(109999n), 20n);
  assert.notEqual(flashFee(109999n), (109999n * 2n) / 10000n);
});
test("formatting handles zero decimals and tiny units", () => {
  assert.equal(formatAmount(10n, 0), "10");
  assert.equal(formatAmount(1n, 9), "0.000000001");
  assert.equal(formatAmount(-123n, 2), "-1.23");
});
