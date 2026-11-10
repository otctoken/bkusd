import { bcs } from "@mysten/sui/bcs";
export const TypeName = bcs.struct("TypeName", { name: bcs.string() });
const Collection = bcs.struct("Collection", {
  id: bcs.Address,
  size: bcs.u64(),
});
export const VaultBcs = bcs.struct("Vault", {
  id: bcs.Address,
  vault_coin: Collection,
  lay_in_coin: Collection,
  decimals_data: Collection,
  types: bcs.vector(TypeName),
  version_delay: bcs.u64(),
  add_delay: bcs.u64(),
  version: bcs.u64(),
  redeeming: bcs.bool(),
});
export const MinterBcs = bcs.struct("Minter", {
  id: bcs.Address,
  cap: bcs.struct("TreasuryCap", {
    id: bcs.Address,
    total_supply: bcs.struct("Supply", { value: bcs.u64() }),
  }),
});
