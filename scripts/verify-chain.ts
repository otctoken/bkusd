import { readVault } from "../src/services/vault";
import { readHistory } from "../src/services/events";
import { sui } from "../src/services/suiClient";
import { PACKAGE } from "../src/config/contracts";
const v = await readVault();
console.log(
  JSON.stringify(
    v,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
console.log(
  "History:",
  JSON.stringify(
    await readHistory(),
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
for (const fn of [
  "mint_bkusd",
  "retrieve_usd",
  "retrieve_one",
  "finish_retrieve",
  "flash_loan_borrow",
  "flash_loan_repay",
  "change_add_delay",
  "cancel_add_type",
  "change_add_coin_type",
  "get_fee",
  "change_add_version_delay",
  "Disable_automatic_version_downgrading",
  "public_automatic_version_downgrading",
]) {
  const result = await sui.getMoveFunction({
    packageId: PACKAGE,
    moduleName: "main",
    name: fn,
  });
  console.log("Verified public function:", fn, JSON.stringify(result));
}
