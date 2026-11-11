import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useLanguage } from "../i18n";
import { useVault } from "../hooks/useVault";
import { readHistory } from "../services/events";
import { formatAmount, percentage, normalized } from "../utils/amount";
import { explorer } from "../config/contracts";
import { shortId } from "../utils/typeName";
import {
  PageTitle,
  ErrorBox,
  Loading,
  StatCard,
  ReserveChart,
} from "../components/UI";
export default function Analytics() {
  const { t } = useLanguage(),
    vault = useVault();
  const q = useInfiniteQuery({
    queryKey: ["history"],
    queryFn: ({ pageParam }) => readHistory(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => (p.hasNextPage ? p.cursor : undefined),
    staleTime: 30000,
  });
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (q.data?.pages.flatMap((p) => p.rows) ?? []).filter((r) => {
      const k = `${r.digest}:${r.index}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [q.data]);
  const minted = rows.reduce((s, r) => s + (r.minted ?? 0n), 0n),
    burned = rows.reduce(
      (s, r) => s + (r.name === "Brun_bkusd" ? (r.amount ?? 0n) : 0n),
      0n,
    ),
    flashes = rows.filter((r) => r.name === "Flash_loan_e");
  // Only build absolute histories from an exhaustive event scan; otherwise report net flows.
  const complete = !!q.data && !q.hasNextPage;
  const chronological = [...rows].reverse();
  let supply = 0n;
  const reserves = new Map<string, bigint>();
  const points = chronological.flatMap((r, i) => {
    if (r.name === "Minting_tokens") {
      supply += r.minted ?? 0n;
      if (r.type)
        reserves.set(r.type, (reserves.get(r.type) ?? 0n) + (r.amount ?? 0n));
    }
    if (r.name === "Brun_bkusd") supply -= r.amount ?? 0n;
    if (r.name === "Redemption_tokens" && r.type)
      reserves.set(r.type, (reserves.get(r.type) ?? 0n) - (r.amount ?? 0n));
    return chronological[i + 1]?.digest !== r.digest
      ? [{ supply, time: r.time, reserves: new Map(reserves) }]
      : [];
  });
  const consistent =
    complete &&
    !!vault.data &&
    vault.data.supply === supply &&
    vault.data.assets.every(
      (a) => a.reserve === (reserves.get(a.type) ?? 0n),
    ) &&
    points.every(
      (p) => p.supply >= 0n && [...p.reserves.values()].every((n) => n >= 0n),
    );
  const max = points.reduce((s, p) => (p.supply > s ? p.supply : s), 1n);
  return (
    <>
      <PageTitle
        eyebrow={t("ON-CHAIN INTELLIGENCE", "链上数据")}
        title={t("See the whole picture.", "看见完整储备。")}
        description={t(
          "Real protocol events, queried through Sui GraphQL.",
          "通过 Sui GraphQL 查询真实协议事件。",
        )}
      />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {q.isPending ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label={t("Minted · loaded events", "铸造量 · 已加载事件")}
              value={formatAmount(minted)}
              detail="BKUSD"
            />
            <StatCard
              label={t("Burned · loaded events", "销毁量 · 已加载事件")}
              value={formatAmount(burned)}
              detail="BKUSD"
            />
            <StatCard
              label={t("Flash loans", "闪电贷次数")}
              value={String(flashes.length)}
              detail={t("In loaded event window", "在已加载事件范围内")}
            />
            <StatCard
              label={t("Protocol events", "协议事件")}
              value={String(rows.length)}
              detail={
                complete
                  ? t(
                      "Available index history loaded",
                      "已加载索引提供的全部历史",
                    )
                  : t(
                      "Partial history · load more below",
                      "部分历史 · 可继续加载",
                    )
              }
            />
          </div>
          <div className="notice">
            {t("History coverage", "历史覆盖")}:{" "}
            {rows.length
              ? `${chronological[0].time ? new Date(chronological[0].time).toLocaleString() : `checkpoint ${chronological[0].checkpoint}`} → ${rows[0].time ? new Date(rows[0].time).toLocaleString() : `checkpoint ${rows[0].checkpoint}`}`
              : t("No events returned yet.", "尚未返回事件。")}{" "}
            ·{" "}
            {t(
              "Public index retention and indexing lag can limit completeness. Counts cover only this configured vault.",
              "公共索引保留期与索引延迟可能影响完整性。统计仅包含配置的金库。",
            )}
          </div>
          <div className="overview-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>{t("BKUSD supply history", "BKUSD 供应量历史")}</h2>
                <span className="pill">{t("Event-derived", "事件推导")}</span>
              </div>
              {consistent && points.length > 1 ? (
                <>
                  <svg
                    className="history-chart"
                    viewBox="0 0 700 200"
                    role="img"
                    aria-label={t(
                      "Historical BKUSD supply",
                      "历史 BKUSD 供应量",
                    )}
                  >
                    <defs>
                      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                        <stop stopColor="#5ce6bb" stopOpacity=".25" />
                        <stop offset="1" stopColor="#5ce6bb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M0 190 ${points.map((p, i) => `L${(i / (points.length - 1)) * 700} ${190 - percentage(p.supply, max) * 1.7}`).join(" ")} L700 190 Z`}
                      fill="url(#area)"
                    />
                    <polyline
                      points={points
                        .map(
                          (p, i) =>
                            `${(i / (points.length - 1)) * 700},${190 - percentage(p.supply, max) * 1.7}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#5ce6bb"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="detail-row">
                    <small>{t("Oldest loaded event", "最早事件")}</small>
                    <small>{formatAmount(max)} BKUSD</small>
                    <small>{t("Latest loaded event", "最近事件")}</small>
                  </div>
                </>
              ) : (
                <div className="empty chart-empty">
                  <span>↗</span>
                  <h3>
                    {t("History starts with activity", "历史随链上活动产生")}
                  </h3>
                  <p>
                    {t(
                      "A supply chart appears when complete, consistent indexed history contains at least two supply observations.",
                      "当完整且一致的索引历史包含至少两个供应量观察点时，将显示图表。",
                    )}
                  </p>
                </div>
              )}
            </section>
            <section className="panel">
              <h2>{t("Current reserve composition", "当前储备组成")}</h2>
              {vault.data ? (
                <ReserveChart assets={vault.data.assets} />
              ) : vault.error ? (
                <ErrorBox error={vault.error} />
              ) : (
                <Loading />
              )}
            </section>
          </div>
          <section className="panel">
            <h2>{t("Reserve history & composition", "储备变化与历史占比")}</h2>
            {consistent && points.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Time", "时间")}</th>
                      {vault.data?.assets.map((a) => (
                        <th key={a.type}>{a.symbol}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {points
                      .slice(-20)
                      .reverse()
                      .map((p, i) => {
                        const total =
                          vault.data?.assets.reduce(
                            (s, a) =>
                              s +
                              normalized(
                                p.reserves.get(a.type) ?? 0n,
                                a.decimals,
                              ),
                            0n,
                          ) ?? 0n;
                        return (
                          <tr key={i}>
                            <td>
                              {p.time ? new Date(p.time).toLocaleString() : "—"}
                            </td>
                            {vault.data?.assets.map((a) => (
                              <td key={a.type}>
                                {formatAmount(
                                  p.reserves.get(a.type) ?? 0n,
                                  a.decimals,
                                )}
                                <small>
                                  {percentage(
                                    normalized(
                                      p.reserves.get(a.type) ?? 0n,
                                      a.decimals,
                                    ),
                                    total,
                                  ).toFixed(2)}
                                  %
                                </small>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">
                {t(
                  "No complete reserve history to display. Load remaining events if available.",
                  "暂无完整储备历史。如有更多事件，请继续加载。",
                )}
              </p>
            )}
            <small className="muted">
              {t(
                "Last 20 event observations. Nominal units, not market USD valuations.",
                "最近 20 个事件观察点，单位为名义数量，不是美元市值。",
              )}
            </small>
          </section>
          <section className="panel">
            <h2>{t("Transaction activity", "历史交易记录")}</h2>
            <div className="notice">
              {t(
                "Flash volume / fees by asset (loaded events)",
                "各资产闪电贷总量 / 手续费（已加载事件）",
              )}
              :{" "}
              {vault.data?.assets
                .map((a) => {
                  const matching = flashes.filter((e) => e.type === a.type);
                  return `${a.symbol}: ${formatAmount(
                    matching.reduce((sum, e) => sum + (e.amount ?? 0n), 0n),
                    a.decimals,
                  )} / ${formatAmount(
                    matching.reduce((sum, e) => sum + (e.fee ?? 0n), 0n),
                    a.decimals,
                  )}`;
                })
                .join(" · ") || "—"}
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Event", "事件")}</th>
                    <th>{t("Amount", "金额")}</th>
                    <th>{t("Time", "时间")}</th>
                    <th>{t("Transaction", "交易")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = vault.data?.assets.find((a) => a.type === r.type);
                    return (
                      <tr key={`${r.digest}:${r.index}`}>
                        <td>{r.name}</td>
                        <td>
                          {r.amount !== undefined
                            ? `${formatAmount(r.amount, r.name === "Brun_bkusd" ? 6 : (a?.decimals ?? 0))} ${a?.symbol ?? (r.name === "Brun_bkusd" ? "BKUSD" : "base units")}`
                            : "—"}
                          {r.fee !== undefined && (
                            <small>
                              {t("Fee", "手续费")}:{" "}
                              {formatAmount(r.fee, a?.decimals ?? 0)}
                            </small>
                          )}
                        </td>
                        <td>
                          {r.time ? new Date(r.time).toLocaleString() : "—"}
                        </td>
                        <td>
                          <a
                            className="mono"
                            href={explorer("tx", r.digest)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortId(r.digest)} ↗
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="empty">
                  {t("No indexed events in this page.", "本页没有索引事件。")}
                </p>
              )}
            </div>
            {q.hasNextPage && (
              <button
                className="secondary"
                disabled={q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                {q.isFetchingNextPage
                  ? t("Loading…", "加载中…")
                  : t("Load older events", "加载更早事件")}
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}
