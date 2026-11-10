import { bcs } from "@mysten/sui/bcs";
import type { SuiClientTypes } from "@mysten/sui/client";
import { TypeName } from "./bcs";
import { PACKAGE, VAULT } from "../config/contracts";
import { graphql } from "./suiClient";
import { fullType } from "../utils/typeName";
const schemas = {
  Minting_tokens: bcs.struct("Minting_tokens", {
    coin_type: TypeName,
    amount: bcs.u64(),
    bkusd: bcs.u64(),
  }),
  Redemption_tokens: bcs.struct("Redemption_tokens", {
    coin_type: TypeName,
    amount: bcs.u64(),
  }),
  Brun_bkusd: bcs.struct("Brun_bkusd", { amount: bcs.u64() }),
  Flash_loan_e: bcs.struct("Flash_loan_e", {
    coin_type: TypeName,
    amount: bcs.u64(),
    fee: bcs.u64(),
  }),
  Add_coin_type: bcs.struct("Add_coin_type", { coin_type: TypeName }),
  Update_Contract: bcs.struct("Update_Contract", {
    time: bcs.u64(),
    version: bcs.u64(),
  }),
};
export function decodeEvent(e: SuiClientTypes.Event) {
  if (!e.eventType.startsWith(`${PACKAGE}::main::`)) return null;
  const name = e.eventType.split("::").at(-1)!;
  if (!(name in schemas)) return null;
  const d = schemas[name as keyof typeof schemas].parse(e.bcs);
  return {
    name,
    type: "coin_type" in d ? fullType(d.coin_type.name) : undefined,
    amount: "amount" in d ? BigInt(String(d.amount)) : undefined,
    minted: "bkusd" in d ? BigInt(String(d.bkusd)) : undefined,
    fee: "fee" in d ? BigInt(String(d.fee)) : undefined,
  };
}
export type DecodedEvent = NonNullable<ReturnType<typeof decodeEvent>>;
export async function readHistory(before?: string | null) {
  const page = await graphql.listEvents({
    filter: { emitModule: `${PACKAGE}::main` },
    order: "descending",
    before,
    limit: 50,
  });
  const digests = [...new Set(page.events.map((e) => e.transactionDigest))];
  const transactions = await Promise.all(
    digests.map(async (digest) => {
      const r = await graphql.getTransaction({
        digest,
        include: { effects: true },
      });
      return r.Transaction ?? r.FailedTransaction;
    }),
  );
  const valid = new Map(
    transactions
      .filter(
        (t) =>
          t.status.success &&
          t.effects.changedObjects.some((o) => o.objectId === VAULT),
      )
      .map((t) => [t.digest, t]),
  );
  const rows = page.events.flatMap((e) => {
    const d = decodeEvent(e),
      tx = valid.get(e.transactionDigest);
    return d && tx
      ? [
          {
            ...d,
            digest: e.transactionDigest,
            index: e.eventIndex,
            checkpoint: e.checkpoint,
            time: tx.timestampMs,
          },
        ]
      : [];
  });
  return { rows, hasNextPage: page.hasNextPage, cursor: page.endCursor };
}
