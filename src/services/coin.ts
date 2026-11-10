import type { Transaction } from "@mysten/sui/transactions";
import { sui } from "./suiClient";
import { u64 } from "../utils/amount";
export async function selectCoin(
  tx: Transaction,
  owner: string,
  type: string,
  amount: bigint,
) {
  if (u64(amount) === 0n)
    throw new Error("Amount must be positive / 金额必须大于零");
  const selected: { objectId: string; balance: string }[] = [];
  let total = 0n,
    cursor: string | null = null;
  do {
    const page = await sui.listCoins({ owner, coinType: type, cursor });
    for (const coin of page.objects) {
      if (BigInt(coin.balance) === 0n) continue;
      selected.push(coin);
      total += BigInt(coin.balance);
      if (total >= amount) break;
    }
    if (total >= amount || !page.hasNextPage) break;
    cursor = page.cursor;
    if (!cursor) throw new Error("Missing coin cursor");
  } while (true);
  if (total < amount)
    throw new Error("Insufficient spendable Coin balance / 可用 Coin 余额不足");
  const first = tx.object(selected[0].objectId);
  // Batch merges to avoid a single command with too many arguments.
  for (let i = 1; i < selected.length; i += 200)
    tx.mergeCoins(
      first,
      selected.slice(i, i + 200).map((c) => tx.object(c.objectId)),
    );
  return tx.splitCoins(first, [tx.pure.u64(amount)])[0];
}
