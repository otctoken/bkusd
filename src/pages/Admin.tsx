import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useCaps, useVault } from "../hooks/useVault";
import { useTransaction } from "../hooks/useTransaction";
import { useLanguage } from "../i18n";
import { readProposals } from "../services/vault";
import {
  buildAdminTransaction,
  type AdminAction,
} from "../services/transaction";
import { sui } from "../services/suiClient";
import { fullType } from "../utils/typeName";
import { formatAmount, parseAmount } from "../utils/amount";
import {
  PageTitle,
  Loading,
  ErrorBox,
  AssetList,
  ObjectLink,
} from "../components/UI";
import { TransactionModal } from "../components/TransactionModal";
export default function Admin() {
  const { t } = useLanguage(),
    caps = useCaps(),
    q = useVault(),
    account = useCurrentAccount(),
    transaction = useTransaction();
  const [capChoice, setCap] = useState(""),
    [type, setType] = useState(""),
    [decimals, setDecimals] = useState("6"),
    [feeType, setFeeType] = useState(""),
    [feeAmount, setFeeAmount] = useState(""),
    [ack, setAck] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const cap = caps.data?.admin.includes(capChoice)
    ? capChoice
    : caps.data?.admin[0];
  const proposals = useQuery({
    queryKey: ["proposals", cap],
    queryFn: () => readProposals(cap!),
    enabled: !!cap,
    refetchInterval: 15000,
  });
  const v = q.data,
    feeAsset = v?.assets.find((a) => a.type === feeType) ?? v?.assets[0];
  const countdown = (deadline: bigint) => {
    if (!deadline) return t("No pending delay", "无等待中的操作");
    const ms = deadline - BigInt(now);
    if (ms < 0n) return t("Ready to execute", "可以执行");
    const sec = ms / 1000n;
    return `${sec / 86400n}d ${(sec / 3600n) % 24n}h ${(sec / 60n) % 60n}m ${sec % 60n}s`;
  };
  const run = (
    action: AdminAction,
    label: string,
    assetType?: string,
    amount?: bigint,
  ) =>
    transaction.prepare(async () => {
      if (!account || !cap) throw new Error("AdminCap required");
      let ds: number | undefined;
      if (action === "change_add_delay") {
        assetType = fullType(type.trim());
        ds = Number(decimals);
        if (!Number.isInteger(ds) || ds < 0 || ds > 25)
          throw new Error(
            t(
              "Decimals must be an integer from 0 to 25",
              "精度必须为 0 至 25 的整数",
            ),
          );
        const { coinMetadata } = await sui.getCoinMetadata({
          coinType: assetType,
        });
        if (!coinMetadata)
          throw new Error(
            t(
              "CoinMetadata required to verify decimals",
              "需要 CoinMetadata 以验证精度",
            ),
          );
        if (coinMetadata.decimals !== ds)
          throw new Error(
            t(
              "Decimals do not match on-chain metadata",
              "精度与链上元数据不一致",
            ),
          );
      }
      return buildAdminTransaction(
        account.address,
        cap,
        action,
        assetType,
        amount,
        ds,
      );
    }, label);
  if (!account)
    return (
      <ErrorBox
        error={t(
          "Connect the wallet that owns an AdminCap.",
          "请连接持有 AdminCap 的钱包。",
        )}
      />
    );
  if (caps.error)
    return <ErrorBox error={caps.error} retry={() => caps.refetch()} />;
  if (caps.isPending) return <Loading />;
  if (!cap)
    return (
      <ErrorBox
        error={t(
          "This wallet does not own an AdminCap.",
          "当前钱包没有 AdminCap。",
        )}
      />
    );
  if (!v)
    return q.error ? (
      <ErrorBox error={q.error} retry={() => q.refetch()} />
    ) : (
      <Loading />
    );
  return (
    <>
      <PageTitle
        eyebrow={t("CAPABILITY-GATED CONTROLS", "能力凭证授权控制")}
        title={t("Protocol administration.", "协议管理。")}
        description={t(
          "Every change is a real on-chain operation signed by the capability owner.",
          "所有修改均由能力凭证持有者签名，在链上真实执行。",
        )}
      />
      <div className="panel admin-identity">
        <span>AdminCap</span>
        <select
          aria-label="AdminCap"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
        >
          {caps.data?.admin.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
        <ObjectLink id={cap} />
        <span>
          {t("Owned TemporaryCaps", "当前钱包 TemporaryCap")}:{" "}
          {caps.data?.temporary.length}
        </span>
        {caps.data?.temporary.map((id) => (
          <ObjectLink key={id} id={id} />
        ))}
      </div>
      <div className="admin-grid">
        <section className="panel">
          <h2>{t("Register a reserve asset", "添加储备币种提案")}</h2>
          <p className="muted">
            {t(
              "Three-day delay. Metadata precision is verified before proposal submission.",
              "等待期为三天。提交前验证链上元数据精度。",
            )}
          </p>
          <label className="field">
            {t("Full Move type", "完整 Move 类型")}
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="0x…::module::TOKEN"
            />
          </label>
          <label className="field">
            {t("Decimals", "小数位数")}
            <input
              type="number"
              min="0"
              max="25"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={transaction.busy || v.addDelay !== 0n || !type}
            onClick={() =>
              run(
                "change_add_delay",
                t("Submit asset proposal", "提交添加币种提案"),
              )
            }
          >
            {t("Propose asset", "提交提案")}
          </button>
          <p className="muted">{countdown(v.addDelay)}</p>
        </section>
        <section className="panel">
          <h2>{t("Pending asset proposals", "待执行币种提案")}</h2>
          {proposals.isPending ? (
            <Loading />
          ) : proposals.error ? (
            <ErrorBox
              error={proposals.error}
              retry={() => proposals.refetch()}
            />
          ) : !proposals.data?.length ? (
            <div className="empty">
              {t("No proposals on this AdminCap", "此 AdminCap 没有待执行提案")}
            </div>
          ) : (
            proposals.data.map((p) => (
              <div className="proposal" key={p.type}>
                <code>{p.type}</code>
                <p>
                  {t("Decimals", "精度")}: {p.decimals}
                </p>
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={transaction.busy || BigInt(now) <= v.addDelay}
                    onClick={() =>
                      run(
                        "change_add_coin_type",
                        t("Execute asset addition", "执行添加币种"),
                        p.type,
                      )
                    }
                  >
                    {t("Execute addition", "执行添加")}
                  </button>
                  <button
                    className="secondary"
                    disabled={transaction.busy}
                    onClick={() =>
                      run(
                        "cancel_add_type",
                        t("Cancel asset proposal", "取消币种提案"),
                        p.type,
                      )
                    }
                  >
                    {t("Cancel proposal", "取消提案")}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
        <section className="panel">
          <h2>
            {t("Protocol version", "协议版本")}{" "}
            <span className="pill">v{v.version.toString()}</span>
          </h2>
          <p>
            {t(
              "Scheduling immediately increments the vault version and can stop minting, redemption and flash loans in this package. It does not deploy new bytecode.",
              "发起操作会立即增加金库版本，可能停止当前合约的铸造、赎回与闪电贷。此操作不会部署新合约。",
            )}
          </p>
          <p>
            {t("Rollback timer", "回退倒计时")}: {countdown(v.versionDelay)}
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {t(
              "I understand the immediate effect on user operations.",
              "我理解这会立即影响用户操作。",
            )}
          </label>
          <div className="button-row">
            <button
              className="secondary"
              disabled={!ack || transaction.busy || v.versionDelay !== 0n}
              onClick={() =>
                run(
                  "change_add_version_delay",
                  t(
                    "Increment version and schedule rollback",
                    "递增版本并设置回退等待期",
                  ),
                )
              }
            >
              {t("Schedule version change", "发起版本切换")}
            </button>
            <button
              className="secondary"
              disabled={
                transaction.busy || v.versionDelay === 0n || v.version !== 1n
              }
              onClick={() =>
                run(
                  "Disable_automatic_version_downgrading",
                  t("Disable automatic downgrade", "禁止自动版本降级"),
                )
              }
            >
              {t("Disable downgrade", "禁止降级")}
            </button>
            <button
              className="secondary"
              disabled={
                transaction.busy ||
                v.versionDelay === 0n ||
                BigInt(now) <= v.versionDelay
              }
              onClick={() =>
                run(
                  "public_automatic_version_downgrading",
                  t("Execute version rollback", "执行版本回退"),
                )
              }
            >
              {t("Execute rollback", "执行回退")}
            </button>
          </div>
          <small className="muted">
            {t(
              "Disable only takes effect when vault.version equals this package VERSION (1). Countdown uses device time; simulation verifies chain time.",
              "仅当金库版本等于此合约 VERSION（1）时，禁止降级才生效。倒计时使用设备时间，模拟会检查链上时间。",
            )}
          </small>
        </section>
        <section className="panel">
          <h2>{t("Withdraw protocol fees", "提取协议手续费")}</h2>
          <label className="field">
            {t("Asset", "资产")}
            <select
              value={feeAsset?.type ?? ""}
              onChange={(e) => setFeeType(e.target.value)}
            >
              {v.assets.map((a) => (
                <option key={a.type} value={a.type}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </label>
          <div className="detail-row">
            <span>lay_in_coin</span>
            <strong>
              {feeAsset ? formatAmount(feeAsset.fees, feeAsset.decimals) : "—"}{" "}
              {feeAsset?.symbol}
            </strong>
          </div>
          <label className="field">
            {t("Amount", "金额")}
            <input
              inputMode="decimal"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={!feeAmount || !feeAsset || transaction.busy}
            onClick={() =>
              transaction.prepare(
                () => {
                  const amount = parseAmount(feeAmount, feeAsset!.decimals);
                  if (amount <= 0n || amount > feeAsset!.fees)
                    throw new Error(
                      t(
                        "Amount exceeds fees or is zero",
                        "金额超过手续费余额或为零",
                      ),
                    );
                  return buildAdminTransaction(
                    account.address,
                    cap,
                    "get_fee",
                    feeAsset!.type,
                    amount,
                  );
                },
                t("Withdraw fees to connected wallet", "提取手续费至当前钱包"),
              )
            }
          >
            {t("Preview withdrawal", "预览提取")}
          </button>
        </section>
      </div>
      <section className="panel">
        <h2>{t("Current vault balances", "当前金库余额")}</h2>
        <AssetList assets={v.assets} />
      </section>
      <TransactionModal transaction={transaction} />
    </>
  );
}
