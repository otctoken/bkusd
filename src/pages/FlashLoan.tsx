import { useState } from "react";
import { useLanguage } from "../i18n";
import { PageTitle } from "../components/UI";
import { TradeForm } from "./Trade";
export const FLASH_DEMO = `import { Transaction } from '@mysten/sui/transactions';
// Real configuration and paginated Coin selection from this project.
import { PACKAGE, VAULT } from './config/contracts';
import { selectCoin } from './services/coin';

const tx = new Transaction();
tx.setSender(sender);
const amount = 100_000n; // base units; at least 100000
const fee = (amount / 10_000n) * 2n;
const feeCoin = await selectCoin(tx, sender, coinType, fee);
const [borrowed, receipt] = tx.moveCall({
  target: \`\${PACKAGE}::main::flash_loan_borrow\`,
  typeArguments: [coinType],
  arguments: [tx.object(VAULT), tx.pure.u64(amount)],
});
// Insert your strategy here. This demonstration immediately repays.
tx.mergeCoins(borrowed, [feeCoin]);
const change = tx.moveCall({
  target: \`\${PACKAGE}::main::flash_loan_repay\`,
  typeArguments: [coinType],
  arguments: [tx.object(VAULT), receipt, borrowed],
});
tx.transferObjects([change], sender);
// Simulate with SuiGrpcClient, then in a React component:
const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
if (result.FailedTransaction) throw new Error(result.FailedTransaction.status.error.message);
await client.waitForTransaction({ digest: result.Transaction.digest });`;
export default function FlashLoan() {
  const { t } = useLanguage();
  const [demo, setDemo] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow={t("DEVELOPER PRIMITIVES", "开发者工具")}
        title={t("Liquidity. In a single block.", "流动性，一笔交易即可。")}
        description={t(
          "Composable flash loans with an atomic borrow-and-repay lifecycle.",
          "可组合闪电贷，借款与还款在同一交易中原子完成。",
        )}
      />
      <div className="flash-intro">
        <div className="panel">
          <span className="eyebrow">{t("PROTOCOL FEE", "协议手续费")}</span>
          <h2>2 / 10,000</h2>
          <p>
            {t(
              "Integer division first. Fees accumulate separately from backing reserves.",
              "先整数除法，再乘以 2。手续费独立于储备资产累积。",
            )}
          </p>
        </div>
        <div className="panel">
          <span className="eyebrow">{t("MINIMUM BORROW", "最低借款")}</span>
          <h2>100,000</h2>
          <p>
            {t(
              "Base units of the selected asset. Repay principal plus fee in the same PTB.",
              "所选资产的最小单位。在同一 PTB 内归还本金和手续费。",
            )}
          </p>
        </div>
      </div>
      <div className="section-heading">
        <h2>{t("TypeScript integration", "TypeScript 集成示例")}</h2>
        <button className="secondary" onClick={() => setDemo(!demo)}>
          {demo
            ? t("Hide live demo", "收起真实演示")
            : t("Open live demo", "打开真实演示")}
        </button>
      </div>
      <pre className="code-block">
        <code>{FLASH_DEMO}</code>
      </pre>
      {demo && <TradeForm mode="flash" />}
    </>
  );
}
