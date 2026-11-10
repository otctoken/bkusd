import {
  Transaction,
  type TransactionArgument,
} from "@mysten/sui/transactions";
import { BKUSD, PACKAGE, MINTER, VAULT, CLOCK } from "../config/contracts";
import { readVault, type VaultState } from "./vault";
import { selectCoin } from "./coin";
import { mintAmount, redeemAmount, flashFee, u64 } from "../utils/amount";
export const target = (fn: string) =>
  `${PACKAGE}::main::${fn}` as `${string}::${string}::${string}`;
export function appendRedeem(
  tx: Transaction,
  coin: TransactionArgument,
  types: string[],
) {
  let ticket = tx.moveCall({
    target: target("retrieve_usd"),
    arguments: [coin, tx.object(MINTER), tx.object(VAULT)],
  });
  for (const type of types)
    ticket = tx.moveCall({
      target: target("retrieve_one"),
      typeArguments: [type],
      arguments: [tx.object(VAULT), ticket],
    });
  tx.moveCall({
    target: target("finish_retrieve"),
    arguments: [tx.object(VAULT), tx.object(MINTER), ticket],
  });
}
export async function buildUserTransaction(
  kind: "mint" | "redeem" | "flash",
  owner: string,
  amount: bigint,
  type: string,
) {
  const v = await readVault();
  assertActive(v);
  u64(amount);
  if (amount <= 0n) throw new Error("Amount must be positive");
  const tx = new Transaction();
  tx.setSender(owner);
  if (kind === "redeem") {
    if (!v.assets.some((a) => redeemAmount(a.reserve, amount, v.supply) > 0n))
      throw new Error("All outputs round to zero / 所有赎回输出均为零");
    appendRedeem(
      tx,
      await selectCoin(tx, owner, BKUSD, amount),
      v.assets.map((a) => a.type),
    );
  } else {
    const asset = v.assets.find((a) => a.type === type);
    if (!asset) throw new Error("Unsupported asset / 不支持的币种");
    if (kind === "mint") {
      const minted = mintAmount(amount, asset.decimals);
      u64(v.supply + minted);
      u64(asset.reserve + amount);
      tx.moveCall({
        target: target("mint_bkusd"),
        typeArguments: [type],
        arguments: [
          await selectCoin(tx, owner, type, amount),
          tx.object(MINTER),
          tx.object(VAULT),
        ],
      });
    } else {
      if (amount < 100000n || amount > asset.reserve)
        throw new Error(
          "Flash amount must be ≥100000 base units and ≤reserve / 借款超出范围",
        );
      const fee = flashFee(amount);
      u64(amount + fee);
      u64(asset.fees + fee);
      const feeCoin = await selectCoin(tx, owner, type, fee);
      const [borrowed, receipt] = tx.moveCall({
        target: target("flash_loan_borrow"),
        typeArguments: [type],
        arguments: [tx.object(VAULT), tx.pure.u64(amount)],
      });
      tx.mergeCoins(borrowed, [feeCoin]);
      const change = tx.moveCall({
        target: target("flash_loan_repay"),
        typeArguments: [type],
        arguments: [tx.object(VAULT), receipt, borrowed],
      });
      tx.transferObjects([change], owner);
    }
  }
  return tx;
}
function assertActive(v: VaultState) {
  if (v.version !== 1n)
    throw new Error("2: Vault version is not 1 / 金库版本不兼容");
  if (v.redeeming) throw new Error("5: Vault is busy / 金库正在赎回");
}
export type AdminAction =
  | "change_add_delay"
  | "change_add_coin_type"
  | "cancel_add_type"
  | "change_add_version_delay"
  | "Disable_automatic_version_downgrading"
  | "public_automatic_version_downgrading"
  | "get_fee";
export function buildAdminTransaction(
  owner: string,
  cap: string,
  action: AdminAction,
  type?: string,
  amount?: bigint,
  decimals?: number,
) {
  const tx = new Transaction();
  tx.setSender(owner);
  const c = tx.object(cap),
    v = tx.object(VAULT),
    clock = tx.object(CLOCK);
  if (action === "get_fee") {
    const balance = tx.moveCall({
      target: target(action),
      typeArguments: [type!],
      arguments: [c, tx.pure.u64(u64(amount!)), v],
    });
    const coin = tx.moveCall({
      target: "0x2::coin::from_balance",
      typeArguments: [type!],
      arguments: [balance],
    });
    tx.transferObjects([coin], owner);
  } else if (action === "change_add_delay")
    tx.moveCall({
      target: target(action),
      typeArguments: [type!],
      arguments: [c, v, tx.pure.u8(decimals!), clock],
    });
  else if (action === "change_add_coin_type" || action === "cancel_add_type")
    tx.moveCall({
      target: target(action),
      typeArguments: [type!],
      arguments: [c, v, clock],
    });
  else
    tx.moveCall({
      target: target(action),
      arguments:
        action === "public_automatic_version_downgrading"
          ? [v, clock]
          : [c, v, clock],
    });
  return tx;
}
