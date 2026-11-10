import type { SuiClientTypes } from "@mysten/sui/client";
import { PACKAGE } from "../config/contracts";
export const ABORTS: Record<string, [string, string]> = {
  "0": [
    "Administrative precondition failed; check proposal and delay.",
    "管理操作条件不满足，请检查提案与等待时间。",
  ],
  "1": [
    "Coin registration mismatch, or rollback delay not elapsed.",
    "币种注册状态不匹配，或回退等待时间未结束。",
  ],
  "2": [
    "Vault version is incompatible with this package.",
    "金库版本与此合约不兼容。",
  ],
  "3": [
    "Flash repayment is less than principal plus fee.",
    "闪电贷还款不足本金加手续费。",
  ],
  "4": [
    "Minimum flash loan is 100,000 base units.",
    "闪电贷最低为 100,000 个最小单位。",
  ],
  "5": [
    "Vault redemption lock is in an unexpected state.",
    "金库赎回锁状态不正确。",
  ],
  "6": [
    "Reserve type or redemption order mismatch.",
    "储备币种或赎回顺序不匹配。",
  ],
  "7": ["Not every reserve asset was processed.", "尚未处理全部储备资产。"],
  "8": [
    "Invalid amount, all outputs round to zero, or supply changed.",
    "金额无效、全部输出为零，或供应量已变化。",
  ],
  "9": [
    "Redemption ticket belongs to another vault.",
    "赎回凭据属于另一金库。",
  ],
  "1001": ["Decimal gap exceeds 19.", "精度差超过 19。"],
  "1002": ["Mint output rounds to zero.", "铸造输出舍入后为零。"],
};
export function executionError(error: SuiClientTypes.ExecutionError) {
  const abort = error.$kind === "MoveAbort" ? error.MoveAbort : undefined;
  const entry =
    abort?.location?.module === "main" && abort.location.package === PACKAGE
      ? ABORTS[abort.abortCode]
      : undefined;
  return new Error(
    entry
      ? `${entry[0]} ${entry[1]} (${abort!.abortCode})\n${error.message}`
      : error.message,
  );
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
