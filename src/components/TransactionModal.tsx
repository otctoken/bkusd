import {
  X,
  Check,
  LoaderCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../i18n";
import type { useTransaction } from "../hooks/useTransaction";
import { explorer } from "../config/contracts";
import { formatAmount } from "../utils/amount";
import { useVault } from "../hooks/useVault";
import { ErrorBox } from "./UI";
export function TransactionModal({
  transaction,
}: {
  transaction: ReturnType<typeof useTransaction>;
}) {
  const { state: s, confirm, close, busy, recheck } = transaction;
  const { t } = useLanguage(),
    vault = useVault();
  if (s.phase === "idle") return null;
  const titles = {
    simulating: t("Simulating transaction", "正在模拟交易"),
    review: t("Review transaction", "确认交易详情"),
    signing: t("Confirm in your wallet", "请在钱包中确认"),
    confirming: t("Waiting for finality", "等待链上确认"),
    success: t("Transaction complete", "交易已完成"),
    error: t("Transaction not completed", "交易未完成"),
    unknown: t("Check transaction status", "请核实交易状态"),
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-title"
      >
        <button
          className="close"
          aria-label={t("Close", "关闭")}
          onClick={close}
          disabled={busy}
        >
          <X size={20} />
        </button>
        <div className={`modal-icon ${s.phase === "success" ? "success" : ""}`}>
          {busy ? (
            <LoaderCircle className="spin" />
          ) : s.phase === "success" ? (
            <Check />
          ) : (
            <ShieldCheck />
          )}
        </div>
        <h2 id="tx-title">{titles[s.phase]}</h2>
        <p>{s.label}</p>
        {s.gas !== undefined && (
          <div className="detail-row">
            <span>{t("Estimated net gas", "预计净 Gas")}</span>
            <b>{formatAmount(s.gas, 9)} SUI</b>
          </div>
        )}
        {s.phase === "review" && (
          <>
            <p className="notice">
              {t(
                "Simulation passed. Outputs may change before execution. No on-chain minimum-output protection. Review expires in 60 seconds.",
                "模拟通过。执行前输出可能变化，合约没有最低输出保护。此预览 60 秒后过期。",
              )}
            </p>
            <button className="primary full" onClick={confirm}>
              {t("Sign & execute", "签名并执行")}
            </button>
          </>
        )}
        {s.error && <ErrorBox error={s.error} />}{" "}
        {s.phase === "unknown" && (
          <>
            <p>
              {t(
                "Do not resubmit until this digest is resolved.",
                "核实此交易 Digest 之前，请勿重复提交。",
              )}
            </p>
            <button className="secondary" onClick={recheck}>
              {t("Check on-chain result", "查询链上结果")}
            </button>
          </>
        )}
        {!!s.events?.length && (
          <p className="muted">
            {s.phase === "review"
              ? t("Simulated outputs", "模拟输出")
              : t("Executed on-chain events", "实际链上事件")}
          </p>
        )}
        {s.events?.map((e, i) => {
          const a = vault.data?.assets.find((a) => a.type === e.type);
          return (
            <div className="detail-row" key={i}>
              <span>{e.name}</span>
              <b>
                {e.minted !== undefined
                  ? `${formatAmount(e.minted)} BKUSD`
                  : e.amount !== undefined
                    ? `${formatAmount(e.amount, e.name === "Brun_bkusd" ? 6 : (a?.decimals ?? 0))} ${a?.symbol ?? (e.name === "Brun_bkusd" ? "BKUSD" : "base units")}`
                    : s.phase === "review"
                      ? t("Simulated", "已模拟")
                      : t("Confirmed", "已确认")}
                {e.fee !== undefined && (
                  <small>
                    {t("Fee", "手续费")}:{" "}
                    {formatAmount(e.fee, a?.decimals ?? 0)}{" "}
                    {a?.symbol ?? t("base units", "最小单位")}
                  </small>
                )}
              </b>
            </div>
          );
        })}
        {s.digest && (
          <a
            className="digest"
            href={explorer("tx", s.digest)}
            target="_blank"
            rel="noreferrer"
          >
            {s.digest}
            <ExternalLink size={14} />
          </a>
        )}
      </section>
    </div>
  );
}
