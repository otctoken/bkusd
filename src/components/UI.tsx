import type { ReactNode } from "react";
import {
  ArrowUpRight,
  RefreshCw,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n";
import type { Asset } from "../services/vault";
import { formatAmount, normalized, percentage } from "../utils/amount";
import { shortId } from "../utils/typeName";
import { explorer } from "../config/contracts";
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
export function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function TokenIcon({
  asset,
}: {
  asset?: Pick<Asset, "logo" | "symbol">;
}) {
  return asset?.logo ? (
    <img className="token-icon" src={asset.logo} alt="" />
  ) : (
    <span className="token-icon fallback">
      {asset?.symbol.slice(0, 1) ?? "B"}
    </span>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="error-box">
      <CircleAlert size={20} />
      <div>
        <strong>{t("Unable to complete request", "暂时无法完成请求")}</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            <RefreshCw size={14} />
            {t("Try again", "重试")}
          </button>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  const { t } = useLanguage();
  return (
    <div className="loading">
      <RefreshCw className="spin" size={20} />
      {t("Reading Sui mainnet…", "正在读取 Sui 主网…")}
    </div>
  );
}
export function ObjectLink({
  id,
  full = false,
}: {
  id: string;
  full?: boolean;
}) {
  return (
    <a
      className="mono object-link"
      href={explorer("object", id)}
      target="_blank"
      rel="noreferrer"
    >
      {full ? id : shortId(id)}
      <ExternalLink size={12} />
    </a>
  );
}
export function AssetList({ assets }: { assets: Asset[] }) {
  const { t } = useLanguage();
  const total = assets.reduce(
    (s, a) => s + normalized(a.reserve, a.decimals),
    0n,
  );
  return (
    <div className="table-scroll asset-list">
      <table>
        <thead>
          <tr>
            <th>{t("Reserve asset", "储备资产")}</th>
            <th>{t("Available reserve", "可用储备")}</th>
            <th>{t("Composition", "占比")}</th>
            <th>{t("Precision", "精度")}</th>
            <th>{t("Move type", "Move 类型")}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.type}>
              <td>
                <div className="token-cell">
                  <TokenIcon asset={a} />
                  <div>
                    <strong>{a.symbol}</strong>
                    <small>{a.name}</small>
                  </div>
                </div>
              </td>
              <td
                className="number"
                data-label={t("Available reserve", "可用储备")}
              >
                <div>
                  {formatAmount(a.reserve, a.decimals)}
                  <small>{a.symbol}</small>
                </div>
              </td>
              <td data-label={t("Composition", "占比")}>
                <div className="composition">
                  <span>
                    {percentage(
                      normalized(a.reserve, a.decimals),
                      total,
                    ).toFixed(2)}
                    %
                  </span>
                  <i>
                    <b
                      style={{
                        width: `${percentage(normalized(a.reserve, a.decimals), total)}%`,
                        background: a.color,
                      }}
                    />
                  </i>
                </div>
              </td>
              <td data-label={t("Precision", "精度")}>
                <span>{a.decimals}</span>
              </td>
              <td data-label={t("Move type", "Move 类型")}>
                <span title={a.type} className="mono">
                  {shortId(a.type.split("::")[0])}::
                  {a.type.split("::").slice(1).join("::")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {assets.length === 0 && (
        <div className="empty">
          {t("No registered reserve assets", "暂无已注册储备资产")}
        </div>
      )}
    </div>
  );
}
export function ReserveChart({ assets }: { assets: Asset[] }) {
  const { t } = useLanguage();
  const total = assets.reduce(
    (s, a) => s + normalized(a.reserve, a.decimals),
    0n,
  );
  let offset = 0;
  return (
    <div className="reserve-chart">
      <div className="donut">
        <svg
          viewBox="0 0 180 180"
          role="img"
          aria-label={t("Reserve composition", "储备组成")}
        >
          <circle
            cx="90"
            cy="90"
            r="72"
            fill="none"
            stroke="#203b37"
            strokeWidth="17"
          />
          {assets.map((a) => {
            const p = percentage(normalized(a.reserve, a.decimals), total);
            const start = offset;
            offset += p;
            return (
              <circle
                key={a.type}
                cx="90"
                cy="90"
                r="72"
                pathLength="100"
                fill="none"
                stroke={a.color}
                strokeWidth="17"
                strokeDasharray={`${p} ${100 - p}`}
                strokeDashoffset={-start}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </svg>
        <div>
          <strong>{assets.length}</strong>
          <span>{t("reserve assets", "储备币种")}</span>
        </div>
      </div>
      <div className="legend">
        {assets.map((a) => (
          <div key={a.type}>
            <span>
              <i style={{ background: a.color }} />
              {a.symbol}
            </span>
            <b>
              {percentage(normalized(a.reserve, a.decimals), total).toFixed(2)}%
            </b>
          </div>
        ))}
        {total === 0n && (
          <small>
            {t(
              "Composition begins with the first deposit.",
              "首次存入资产后将显示储备组成。",
            )}
          </small>
        )}
      </div>
    </div>
  );
}
export function ActionLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-button" to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
