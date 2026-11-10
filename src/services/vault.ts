import { bcs } from "@mysten/sui/bcs";
import type { SuiClientTypes } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { sui } from "./suiClient";
import { TypeName, VaultBcs, MinterBcs } from "./bcs";
import { PACKAGE, VAULT, MINTER } from "../config/contracts";
import { TOKENS } from "../config/tokens";
import { fullType } from "../utils/typeName";
export interface Asset {
  type: string;
  definingName: string;
  symbol: string;
  name: string;
  logo?: string;
  color: string;
  decimals: number;
  metadataDecimals?: number;
  reserve: bigint;
  fees: bigint;
}
export interface VaultState {
  assets: Asset[];
  supply: bigint;
  version: bigint;
  versionDelay: bigint;
  addDelay: bigint;
  redeeming: boolean;
  objectVersion: string;
  fetchedAt: number;
}
export async function readField(parentId: string, name: string) {
  return (
    await sui.getDynamicField({
      parentId,
      name: {
        type: "0x1::type_name::TypeName",
        bcs: TypeName.serialize({ name }).toBytes(),
      },
    })
  ).dynamicField.value.bcs;
}
export async function readVault(): Promise<VaultState> {
  const [vr, mr] = await Promise.all([
    sui.getObject({ objectId: VAULT, include: { content: true } }),
    sui.getObject({ objectId: MINTER, include: { content: true } }),
  ]);
  if (
    normalizeStructTag(vr.object.type) !==
      normalizeStructTag(`${PACKAGE}::main::Vault`) ||
    normalizeStructTag(mr.object.type) !==
      normalizeStructTag(`${PACKAGE}::bkusd::Minter`)
  )
    throw new Error("Configured object type mismatch / 对象类型不匹配");
  const v = VaultBcs.parse(vr.object.content),
    m = MinterBcs.parse(mr.object.content);
  if (BigInt(v.vault_coin.size) !== BigInt(v.types.length))
    throw new Error("Vault registry size mismatch / 储备注册表不一致");
  const assets = await Promise.all(
    v.types.map(async ({ name }, i): Promise<Asset> => {
      const type = fullType(name);
      const [reserve, fees, decimals, metadata] = await Promise.all([
        readField(v.vault_coin.id, name),
        readField(v.lay_in_coin.id, name),
        readField(v.decimals_data.id, name),
        sui
          .getCoinMetadata({ coinType: type })
          .catch(() => ({ coinMetadata: null })),
      ]);
      const brand = TOKENS[type],
        meta = metadata.coinMetadata;
      return {
        type,
        definingName: name,
        symbol: brand?.symbol ?? meta?.symbol ?? type.split("::").at(-1)!,
        name: brand?.name ?? meta?.name ?? type,
        logo: brand?.logo ?? meta?.iconUrl ?? undefined,
        color: brand?.color ?? ["#e6c778", "#75d6b6", "#c294e8"][i % 3],
        decimals: bcs.u8().parse(decimals),
        metadataDecimals: meta?.decimals,
        reserve: BigInt(bcs.u64().parse(reserve)),
        fees: BigInt(bcs.u64().parse(fees)),
      };
    }),
  );
  return {
    assets,
    supply: BigInt(m.cap.total_supply.value),
    version: BigInt(v.version),
    versionDelay: BigInt(v.version_delay),
    addDelay: BigInt(v.add_delay),
    redeeming: v.redeeming,
    objectVersion: vr.object.version,
    fetchedAt: Date.now(),
  };
}
export async function readCaps(owner: string) {
  const owned = async (type: string) => {
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const page: SuiClientTypes.ListOwnedObjectsResponse =
        await sui.listOwnedObjects({ owner, type, cursor });
      ids.push(...page.objects.map((o) => o.objectId));
      if (!page.hasNextPage) break;
      cursor = page.cursor;
      if (!cursor) throw new Error("Missing pagination cursor");
    } while (true);
    return ids;
  };
  const [admin, temporary] = await Promise.all([
    owned(`${PACKAGE}::main::AdminCap`),
    owned(`${PACKAGE}::main::TemporaryCap`),
  ]);
  return { admin, temporary };
}
export async function readProposals(cap: string) {
  const proposals: { type: string; decimals: number }[] = [];
  let cursor: string | null = null;
  do {
    const page: SuiClientTypes.ListDynamicFieldsResponse =
      await sui.listDynamicFields({ parentId: cap, cursor });
    for (const f of page.dynamicFields) {
      if (
        normalizeStructTag(f.name.type) !==
        normalizeStructTag("0x1::type_name::TypeName")
      )
        continue;
      const name = TypeName.parse(f.name.bcs).name;
      proposals.push({
        type: fullType(name),
        decimals: bcs.u8().parse(await readField(cap, name)),
      });
    }
    if (!page.hasNextPage) break;
    cursor = page.cursor;
    if (!cursor) throw new Error("Missing pagination cursor");
  } while (true);
  return proposals;
}
