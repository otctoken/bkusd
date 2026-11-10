import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { WalletConnect } from "../components/WalletConnect";
import { ArrowDown, ShieldCheck, Info } from "lucide-react";
import { useLanguage } from "../i18n";
import { useBalance, useVault } from "../hooks/useVault";
import { useTransaction } from "../hooks/useTransaction";
import { BKUSD } from "../config/contracts";
import {
  formatAmount,
  mintAmount,
  parseAmount,
  redeemAmount,
  percentage,
  flashFee,
} from "../utils/amount";
import { buildUserTransaction } from "../services/transaction";
import { TransactionModal } from "../components/TransactionModal";
import {
  ErrorBox,
  Loading,
  PageTitle,
  TokenIcon,
  ActionLink,
} from "../components/UI";
export function TradeForm({ mode }: { mode: "mint" | "redeem" | "flash" }) {
  const { t } = useLanguage(),
    account = useCurrentAccount(),
    q = useVault(),
    v = q.data,
    transaction = useTransaction();
  const [selected, setSelected] = useState(""),
    [input, setInput] = useState("");
  const asset = v?.assets.find((a) => a.type === selected) ?? v?.assets[0];
  const type = mode === "redeem" ? BKUSD : (asset?.type ?? BKUSD);
  const balance = useBalance(type),
    bkusd = useBalance();
  const decimals = mode === "redeem" ? 6 : (asset?.decimals ?? 6);
  let amount = 0n,
    output = 0n,
    validation = "";
  let outputs: { type: string; amount: bigint; remaining: bigint }[] = [];
  try {
    if (input) {
      amount = parseAmount(input, decimals);
      if (amount === 0n)
        throw new Error(
          t("Amount must be greater than zero", "金额必须大于零"),
        );
      if (v) {
        if (v.version !== 1n || v.redeeming)
          throw new Error(
            t(
              "Vault is currently unavailable for this operation",
              "金库当前不可执行此操作",
            ),
          );
        if (mode === "mint") output = mintAmount(amount, decimals);
        if (mode === "redeem") {
          outputs = v.assets.map((a) => ({
            type: a.type,
            amount: redeemAmount(a.reserve, amount, v.supply),
            remaining: a.reserve - redeemAmount(a.reserve, amount, v.supply),
          }));
          if (!outputs.some((o) => o.amount > 0n))
            throw new Error(
              t("Every output rounds to zero", "全部输出均舍入为零"),
            );
        }
        if (mode === "flash") {
          if (amount < 100000n || amount > (asset?.reserve ?? 0n))
            throw new Error(
              t(
                "Borrow at least 100,000 base units, within available reserves",
                "借款至少 100,000 个最小单位且不得超过可用储备",
              ),
            );
          output = flashFee(amount);
        }
        if (
          balance.data &&
          (mode === "flash" ? output : amount) > balance.data.spendable
        )
          throw new Error(
            t("Insufficient spendable Coin balance", "可用 Coin 余额不足"),
          );
      }
    }
  } catch (e) {
    validation = e instanceof Error ? e.message : String(e);
  }
  const label =
    mode === "mint"
      ? t("Mint BKUSD", "铸造 BKUSD")
      : mode === "redeem"
        ? t("Redeem BKUSD", "赎回 BKUSD")
        : t("Borrow & repay demo", "借入并归还演示");
  if (!v)
    return q.error ? (
      <ErrorBox error={q.error} retry={() => q.refetch()} />
    ) : (
      <Loading />
    );
  return (
    <div className="trade-layout">
      <section className="panel trade-card">
        <div className="panel-heading">
          <h2>{label}</h2>
          <span className="pill">Sui Mainnet</span>
        </div>
        {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
        <div className="amount-box">
          <div className="detail-row">
            <label htmlFor="amount">
              {mode === "flash"
                ? t("Borrow amount", "借入金额")
                : t("You pay", "支付金额")}
            </label>
            <span>
              {t("Coin balance", "Coin 余额")}:{" "}
              {account
                ? balance.data
                  ? formatAmount(balance.data.spendable, decimals)
                  : "…"
                : "—"}{" "}
              <button
                className="max"
                disabled={!balance.data || mode === "flash"}
                onClick={() =>
                  setInput(formatAmount(balance.data!.spendable, decimals))
                }
              >
                MAX
              </button>
            </span>
          </div>
          <div className="amount-input-row">
            <input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="token-select">
              <TokenIcon
                asset={
                  mode === "redeem"
                    ? { symbol: "BKUSD", logo: "/assets/logo.png" }
                    : asset
                }
              />
              {mode === "redeem" ? (
                <strong>BKUSD</strong>
              ) : (
                <select
                  aria-label={t("Reserve asset", "储备资产")}
                  value={asset?.type ?? ""}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setInput("");
                  }}
                >
                  {v.assets.map((a) => (
                    <option key={a.type} value={a.type}>
                      {a.symbol}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <small>
            {t("On-chain precision", "链上精度")}: {decimals} ·{" "}
            {t("Integer arithmetic", "整数计算")}
          </small>
        </div>
        <div className="swap-divider">
          <ArrowDown size={18} />
        </div>
        {mode === "redeem" ? (
          <div className="receive-box">
            <span className="muted">
              {t("Estimated assets received", "预计收到资产")}
            </span>
            {v.assets.map((a) => {
              const out = outputs.find((o) => o.type === a.type);
              return (
                <div className="redemption-row" key={a.type}>
                  <TokenIcon asset={a} />
                  <div>
                    <strong>{a.symbol}</strong>
                    <small>
                      {t("Current reserve", "当前储备")}:{" "}
                      {formatAmount(a.reserve, a.decimals)} · {a.decimals}{" "}
                      {t("decimals", "位小数")}
                    </small>
                    <small>
                      {t("Remaining reserve", "预计剩余储备")}:{" "}
                      {out ? formatAmount(out.remaining, a.decimals) : "—"}
                    </small>
                  </div>
                  <b>{out ? formatAmount(out.amount, a.decimals) : "—"}</b>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="receive-box">
            <span className="muted">
              {mode === "flash"
                ? t("Fee paid by your wallet", "钱包实际支付手续费")
                : t("You receive · estimated", "预计收到")}
            </span>
            <div className="output-value">
              <strong>
                {input && !validation
                  ? formatAmount(output, mode === "flash" ? decimals : 6)
                  : "0"}
              </strong>
              <span>
                <TokenIcon
                  asset={
                    mode === "flash"
                      ? asset
                      : { symbol: "BKUSD", logo: "/assets/logo.png" }
                  }
                />
                {mode === "flash" ? asset?.symbol : "BKUSD"}
              </span>
            </div>
          </div>
        )}
        <div className="trade-details">
          <div className="detail-row">
            <span>{t("BKUSD total supply", "BKUSD 总供应量")}</span>
            <b>{formatAmount(v.supply)} BKUSD</b>
          </div>
          <div className="detail-row">
            <span>{t("BKUSD wallet balance", "钱包 BKUSD 余额")}</span>
            <b>{bkusd.data ? formatAmount(bkusd.data.total) : "—"}</b>
          </div>
          <div className="detail-row">
            <span>
              {mode === "redeem"
                ? t("Share of total supply", "占总供应比例")
                : t("Conversion rule", "兑换规则")}
            </span>
            <b>
              {mode === "redeem"
                ? `${percentage(amount, v.supply).toFixed(4)}%`
                : mode === "flash"
                  ? "floor(amount / 10,000) × 2"
                  : t("1 nominal unit → 1 BKUSD", "1 名义单位 → 1 BKUSD")}
            </b>
          </div>
          <div className="detail-row">
            <span>{t("Estimated gas", "预计 Gas")}</span>
            <span>
              {t("Calculated in transaction preview", "交易预览时模拟计算")}
            </span>
          </div>
        </div>
        {validation && (
          <p className="validation" role="alert">
            {validation}
          </p>
        )}
        {balance.error && (
          <ErrorBox error={balance.error} retry={() => balance.refetch()} />
        )}
        {!account ? (
          <div className="connect-prompt">
            <WalletConnect />
            <small>
              {t(
                "Connect to preview and sign your transaction",
                "连接钱包后预览并签名交易",
              )}
            </small>
          </div>
        ) : (
          <button
            className="primary full"
            disabled={
              transaction.busy ||
              !input ||
              !!validation ||
              !balance.data ||
              q.isError ||
              balance.isError ||
              v.assets.length === 0
            }
            onClick={() =>
              transaction.prepare(
                () => buildUserTransaction(mode, account.address, amount, type),
                `${label} · ${formatAmount(amount, decimals)} ${mode === "redeem" ? "BKUSD" : asset?.symbol}`,
              )
            }
          >
            {transaction.busy
              ? t("Preparing…", "准备中…")
              : t("Preview transaction", "预览交易")}
            <ArrowDown size={17} />
          </button>
        )}
        <div className="secure-caption">
          <ShieldCheck size={14} />
          {t("Signed by you. Settled on Sui.", "由你签名，在 Sui 上结算。")}
        </div>
      </section>
      <aside className="trade-aside">
        <span className="eyebrow">{t("HOW IT WORKS", "运作机制")}</span>
        <h2>
          {mode === "redeem"
            ? t("Your share. Every asset.", "你的份额，每一种资产。")
            : mode === "flash"
              ? t(
                  "One transaction. Zero open debt.",
                  "一笔交易，不留未偿债务。",
                )
              : t("Stablecoins in. BKUSD out.", "存入稳定币，铸造 BKUSD。")}
        </h2>
        <p>
          {mode === "redeem"
            ? t(
                "Redeem for a proportional share of every registered reserve asset. One signature completes the whole basket.",
                "按比例赎回每一种已注册储备资产，一次签名完成全部资产提取。",
              )
            : mode === "flash"
              ? t(
                  "This live demonstration borrows and immediately repays. Your wallet pays the real protocol fee plus gas. It does not run an arbitrage strategy.",
                  "此真实演示会借入并立即归还。你的钱包实际支付协议手续费和 Gas，不执行套利策略。",
                )
              : t(
                  "Deposit a supported stablecoin into the shared vault. The contract converts its precision and mints BKUSD directly to your wallet.",
                  "将支持的稳定币存入共享金库，合约按登记精度换算，并将 BKUSD 直接发送至你的钱包。",
                )}
        </p>
        <ol className="steps">
          {(mode === "redeem"
            ? [
                t("Lock BKUSD & create ticket", "锁定 BKUSD 并创建凭据"),
                t(
                  `Process all ${v.assets.length} assets in order`,
                  `按顺序提取全部 ${v.assets.length} 种资产`,
                ),
                t("Burn BKUSD & finish atomically", "销毁 BKUSD，原子完成"),
              ]
            : mode === "flash"
              ? [
                  t("Borrow from reserve", "从储备借入"),
                  t("Add fee from your wallet", "从钱包补足手续费"),
                  t("Repay & consume receipt", "归还并消费回执"),
                ]
              : [
                  t("Choose a reserve asset", "选择储备资产"),
                  t("Preview amounts & gas", "预览金额与 Gas"),
                  t("Sign in your Sui wallet", "使用 Sui 钱包签名"),
                ]
          ).map((step, i) => (
            <li key={step}>
              <span>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className="notice">
          <Info size={17} />
          <p>
            {mode === "redeem"
              ? t(
                  "Outputs round down per asset. No on-chain minimum output is available. A failed transaction rolls back all withdrawals; gas may still be charged.",
                  "每种资产的输出向下取整，合约没有链上最低输出保护。失败时全部提款回滚，但仍可能收取 Gas。",
                )
              : mode === "mint"
                ? t(
                    "Extra precision is truncated. The full deposit enters the vault, including any rounding remainder.",
                    "超出精度的部分向下取整，全部存入金额（包括舍入余量）进入金库。",
                  )
                : t(
                    "Borrow and repay must stay in the same PTB. Fee = floor(amount / 10,000) × 2 base units.",
                    "借款和还款必须位于同一 PTB。手续费 = floor(金额 / 10,000) × 2 个最小单位。",
                  )}
          </p>
        </div>
        <ActionLink to="/docs">
          {t("Read the contract mechanics", "阅读合约机制")}
        </ActionLink>
      </aside>
      <TransactionModal transaction={transaction} />
    </div>
  );
}
export default function Trade({ mode }: { mode: "mint" | "redeem" }) {
  const { t } = useLanguage();
  return (
    <>
      <PageTitle
        eyebrow={t("THE BKUSD PROTOCOL", "BKUSD 协议")}
        title={
          mode === "mint"
            ? t("Mint your balance.", "铸造你的 BKUSD。")
            : t("Redeem your share.", "赎回你的储备份额。")
        }
        description={
          mode === "mint"
            ? t(
                "Turn supported stablecoins into a single, basket-backed asset.",
                "将支持的稳定币转换为由多元储备支持的资产。",
              )
            : t(
                "Exchange BKUSD for your proportional share of the vault.",
                "将 BKUSD 兑换为你在金库中的相应份额。",
              )
        }
      />
      <TradeForm key={mode} mode={mode} />
    </>
  );
}
