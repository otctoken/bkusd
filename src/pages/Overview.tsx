import { ArrowUpRight, Layers, ArrowDownUp, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useVault } from "../hooks/useVault";
import { useLanguage } from "../i18n";
import { VAULT } from "../config/contracts";
import { formatAmount, normalized } from "../utils/amount";
import {
  AssetList,
  ReserveChart,
  StatCard,
  ErrorBox,
  Loading,
  ObjectLink,
  ActionLink,
} from "../components/UI";
export default function Overview() {
  const { t } = useLanguage(),
    q = useVault(),
    v = q.data;
  const total = v?.assets.reduce(
    (s, a) => s + normalized(a.reserve, a.decimals),
    0n,
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i />
            {t(
              "ONE TOKEN. A DIVERSIFIED FOUNDATION.",
              "一种代币，多元稳定币储备。",
            )}
          </span>
          <h1>
            {t("A basket.", "多元储备。")}
            <br />
            <em>{t("A balance.", "透明平衡。")}</em>
          </h1>
          <p>
            {t(
              "Meet BKUSD. A multi-stablecoin backed asset on Sui. Mint with your stablecoins. Redeem your share of the reserves.",
              "认识 BKUSD：Sui 上由多种稳定币支持的资产。存入稳定币铸造，按比例赎回金库储备。",
            )}
          </p>
          <div className="hero-actions">
            <Link to="/mint" className="primary">
              {t("Mint BKUSD", "铸造 BKUSD")}
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/docs" className="secondary">
              {t("Explore the protocol", "了解协议")}
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <ShieldCheck size={15} />
              {t("On-chain reserves", "链上储备")}
            </span>
            <span>
              <ArrowDownUp size={15} />
              {t("Proportional redemption", "按比例赎回")}
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="coin-glow" />
          <img className="hero-coin" src="/assets/logo.png" />
          <div className="floating-token float-usdc">
            <img src="/assets/usdc_logo.png" />
            USDC
          </div>
          <div className="floating-token float-sui">
            <img src="/assets/usd_sui_logo.png" />
            USDsui
          </div>
          <div className="art-caption">
            <span />
            BUILT ON SUI · BACKED BY A BASKET
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>{t("The protocol, at a glance", "协议，一目了然")}</h2>
        <span className="live-label">
          <i />
          {t("Live on Sui mainnet", "Sui 主网实时数据")}
        </span>
      </div>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}{" "}
      {!v && q.isPending ? (
        <Loading />
      ) : (
        v && (
          <>
            <div className="stats-grid">
              <StatCard
                label={t("BKUSD total supply", "BKUSD 总供应量")}
                value={formatAmount(v.supply, 6, 2)}
                detail="BKUSD"
                accent
              />
              <StatCard
                label={t("Total nominal reserves", "储备名义总量")}
                value={formatAmount(total!, 255, 2)}
                detail={t(
                  "Stablecoin units · not USD market value",
                  "稳定币单位 · 非美元市值",
                )}
              />
              <StatCard
                label={t("Supported stablecoins", "支持的稳定币")}
                value={String(v.assets.length).padStart(2, "0")}
                detail={t(
                  "Dynamically registered on-chain",
                  "从链上注册表读取",
                )}
              />
              <StatCard
                label={t("BKUSD precision", "BKUSD 精度")}
                value="6"
                detail={t("Decimal places", "位小数")}
              />
            </div>
            <div className="overview-grid">
              <section className="panel reserves-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      {t("TRANSPARENT BY DESIGN", "透明，源自设计")}
                    </span>
                    <h2>{t("Inside the basket", "金库储备资产")}</h2>
                  </div>
                  <Layers size={21} />
                </div>
                <AssetList assets={v.assets} />
                <div className="panel-foot">
                  <span>
                    {t("Vault contract", "金库合约")} <ObjectLink id={VAULT} />
                  </span>
                  <ActionLink to="/analytics">
                    {t("View analytics", "查看数据分析")}
                  </ActionLink>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>{t("Reserve composition", "储备组成")}</h2>
                  <span className="pill">{t("Nominal", "名义占比")}</span>
                </div>
                <ReserveChart assets={v.assets} />
              </section>
            </div>
            <div className="protocol-strip">
              <div>
                <ShieldCheck />
                <span>
                  <strong>
                    {t("Your assets. Verifiable.", "你的资产，可以验证。")}
                  </strong>
                  <small>
                    {t(
                      "Every mint and redemption settles directly on Sui.",
                      "每次铸造和赎回均直接在 Sui 链上结算。",
                    )}
                  </small>
                </span>
              </div>
              <span className="muted">
                {t("Last read", "最近读取")}{" "}
                {new Date(v.fetchedAt).toLocaleTimeString()} · v
                {v.version.toString()}
              </span>
            </div>
          </>
        )
      )}
    </>
  );
}
