import { useState } from "react";
import { ArrowRight, BookOpen, LockKeyhole, Coins } from "lucide-react";
import { useLanguage } from "../i18n";
import { PageTitle, ObjectLink } from "../components/UI";
import { PACKAGE, VAULT, MINTER } from "../config/contracts";
import { ABORTS } from "../utils/errors";
import { parseAmount, formatAmount, mintAmount } from "../utils/amount";
export default function Docs() {
  const { t, locale } = useLanguage(),
    [decimals, setDecimals] = useState(9),
    [value, setValue] = useState("1.23456789");
  let conversion = "";
  try {
    conversion = formatAmount(
      mintAmount(parseAmount(value, decimals), decimals),
    );
  } catch (e) {
    conversion = e instanceof Error ? e.message : String(e);
  }
  return (
    <>
      <PageTitle
        eyebrow={t("THE KNOWLEDGE BASE", "协议知识库")}
        title={t("Understand your balance.", "理解你的 BKUSD。")}
        description={t(
          "The mechanics, the guarantees, and the limits — directly from the Move contracts.",
          "机制、保证与限制，均以 Move 合约真实规则为准。",
        )}
      />
      <div className="docs-layout">
        <aside className="docs-nav">
          <BookOpen size={22} />
          {[
            ["mechanism", "The basket", "多元储备"],
            ["mint", "Minting", "铸造"],
            ["redeem", "Redemption", "赎回"],
            ["flash", "Flash loans", "闪电贷"],
            ["admin", "Administration & security", "管理与安全"],
            ["errors", "Error reference", "错误码"],
            ["contracts", "Contracts", "合约地址"],
          ].map(([id, en, zh]) => (
            <a href={`#${id}`} key={id}>
              {t(en, zh)}
            </a>
          ))}
        </aside>
        <article className="docs-content">
          <section id="mechanism">
            <span className="eyebrow">
              01 / {t("THE FOUNDATION", "基础机制")}
            </span>
            <h2>
              {t(
                "One token, multiple reserve assets.",
                "一个代币，多种储备资产。",
              )}
            </h2>
            <p>
              {t(
                "BKUSD is a six-decimal Sui asset backed by registered stablecoins. Deposits are converted at nominal 1:1 according to each asset’s registered precision. Redemption returns a proportional basket, not necessarily the original deposit asset. Our reserve-selection policy is to support only stablecoins issued directly on Sui Network by established official issuers with strong institutional backing.",
                "BKUSD 是 Sui 上精度为 6 的代币，由已注册稳定币支持。存款根据各币种登记精度按名义 1:1 换算。赎回得到按比例分配的资产篮子，不一定是原先存入的币种。我们的储备准入政策是：仅支持由具有强大背景的官方发行方直接在 Sui Network 发行的稳定币进行储备铸造。",
              )}
            </p>
            <div className="flow-diagram">
              <div>
                <Coins />
                <strong>{t("Stablecoins", "稳定币")}</strong>
                <small>Coin&lt;T&gt;</small>
              </div>
              <ArrowRight />
              <div>
                <LockKeyhole />
                <strong>{t("Shared vault", "共享金库")}</strong>
                <small>Balance&lt;T&gt;</small>
              </div>
              <ArrowRight />
              <div>
                <img src="/assets/logo.png" alt="" />
                <strong>BKUSD</strong>
                <small>{t("6 decimals", "6 位小数")}</small>
              </div>
            </div>
            <p className="notice">
              {t(
                "There is no price oracle in these contracts. Nominal reserve units are not guaranteed USD market value. Stablecoin depegs change the economic value of the basket.",
                "这些合约没有价格预言机。储备名义数量不等于有保证的美元市值，稳定币脱锚会影响资产篮子的经济价值。",
              )}
            </p>
          </section>
          <section id="mint">
            <span className="eyebrow">02 / {t("MINTING", "铸造")}</span>
            <h2>
              {t("Precision is part of the protocol.", "精度是协议的一部分。")}
            </h2>
            <p>
              <code>mint_bkusd&lt;T&gt;(coin, minter, vault)</code>
            </p>
            <p>
              {t(
                "When collateral has more than six decimals, divide by 10^(decimals−6) and round down. With fewer decimals, multiply by 10^(6−decimals). The complete input enters reserves. Zero output and u64 overflow abort. A decimal gap above 19 also aborts.",
                "抵押币精度高于 6 时，除以 10^(精度−6) 并向下取整；低于 6 时乘以 10^(6−精度)。全部输入进入储备。零输出和 u64 溢出会中止，精度差超过 19 也会中止。",
              )}
            </p>
            <div className="panel calculator">
              <h3>{t("Explore the conversion", "探索精度换算")}</h3>
              <div className="calculator-fields">
                <label className="field">
                  {t("Deposit amount", "存入数量")}
                  <input
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
                <label className="field">
                  {t("Collateral decimals", "抵押币精度")}
                  <select
                    value={decimals}
                    onChange={(e) => setDecimals(Number(e.target.value))}
                  >
                    {[2, 6, 8, 9, 18, 25, 26].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>
              <output>
                {conversion} <span>BKUSD</span>
              </output>
              <small className="muted">
                {t(
                  "Educational calculator · no transaction is submitted.",
                  "教学计算器 · 不提交交易。",
                )}
              </small>
            </div>
          </section>
          <section id="redeem">
            <span className="eyebrow">
              03 / {t("ATOMIC REDEMPTION", "原子赎回")}
            </span>
            <h2>
              {t(
                "A ticket that must finish its journey.",
                "必须在同一交易内完成的凭据。",
              )}
            </h2>
            <pre className="code-block">
              <code>{`output_i = floor(reserve_i × redeem_amount / total_supply)\n\nlet ticket = retrieve_usd(bkusdCoin, minter, vault);\n// Each type in Vault.types, in the exact on-chain order:\nticket = retrieve_one<T0>(vault, ticket);\nticket = retrieve_one<T1>(vault, ticket);\n// …include EVERY type, even zero reserves\nfinish_retrieve(vault, minter, ticket);`}</code>
            </pre>
            <p>
              {t(
                "RedeemTicket has no store or drop ability. Each retrieve_one consumes it and returns its successor. Finish requires all registered types, at least one positive payout, the same vault and unchanged supply. Only then is BKUSD burned and the vault unlocked.",
                "RedeemTicket 没有 store 或 drop 能力。每次 retrieve_one 消费并返回新的凭据。结束时必须处理全部注册币种、至少一次正数提款、相同金库和未改变的供应量，然后销毁 BKUSD 并解锁金库。",
              )}
            </p>
            <p>
              {t(
                "All steps are in a single Transaction PTB, with one wallet signature. On failure all asset changes revert; gas may still be charged. Independent floors can leave dust in the vault. No minimum-output or slippage argument exists in this contract.",
                "所有步骤置于同一个 Transaction PTB，只需一次钱包签名。失败时全部资产变动回滚，但可能收取 Gas。各币种分别取整可能在金库留下余量。合约没有最低输出或滑点参数。",
              )}
            </p>
          </section>
          <section id="flash">
            <span className="eyebrow">
              04 / {t("FLASH LIQUIDITY", "闪电流动性")}
            </span>
            <h2>{t("Borrow, compose, repay.", "借入、组合、归还。")}</h2>
            <p>
              {t(
                "flash_loan_borrow<T> returns Coin<T> and Flash_loan_receipt<T>. Minimum borrowing is 100000 base units. flash_loan_repay<T> consumes the receipt and repayment coin, returns surplus Coin<T>, and stores the fee separately in lay_in_coin. The fee is floor(amount/10000)×2, not floor(amount×2/10000).",
                "flash_loan_borrow<T> 返回 Coin<T> 和 Flash_loan_receipt<T>。最低借款为 100000 个最小单位。flash_loan_repay<T> 消费回执与还款币，返回余款 Coin<T>，手续费单独存入 lay_in_coin。费用为 floor(amount/10000)×2，而非 floor(amount×2/10000)。",
              )}
            </p>
            <a className="text-button" href="/flash-loan">
              {t("Open runnable integration example →", "查看可执行集成示例 →")}
            </a>
          </section>
          <section id="admin">
            <span className="eyebrow">
              05 / {t("ADMINISTRATION & SECURITY", "管理与安全")}
            </span>
            <h2>{t("Administration and security.", "管理与安全。")}</h2>
            <p>
              {t(
                "1. Protocol revenue comes only from flash-loan fees. Fees are stored separately from collateral reserves, and the administrator’s fee-withdrawal function cannot withdraw reserve principal. This protects the separation of user reserves and protocol income without guaranteeing immunity from all contract or asset risks.",
                "1. 协议收入仅来自闪电贷手续费。手续费与储备金库分开存放，管理员的手续费提取接口不能提取储备本金，以保障用户储备与协议收入相互独立；这不代表合约或资产不存在任何风险。",
              )}
            </p>
            <p>
              {t(
                "2. Standard proposals to add a stablecoin have a three-day timelock. This gives users time to review the proposed asset and protocol safety, and decide whether to redeem their funds. During initialization, a retained TemporaryCap can register assets without this delay.",
                "2. 协议通过常规提案添加新的稳定币时，有三天时间锁，让用户有足够时间审查新资产与协议的安全性，并根据情况自行决定是否赎回资金。初始化阶段保留的 TemporaryCap 可绕过这一添加等待期。",
              )}
            </p>
            <p>
              {t(
                "3. The verified mainnet upgrade Policy has a three-day security timelock. Users can review the upgrade proposal and the upgraded contract. To recover from an unfinished version transition, the BKUSD contract provides a separate public rollback: after its six-day version timer expires, users can execute the permitted rollback and continue using the compatible old package.",
                "3. 已核实的主网升级 Policy 设有三天安全时间锁，用户可以审查升级提案及升级后的合约。为避免管理员未完成版本切换导致协议持续不可用，BKUSD 合约提供独立的公开回退机制：六天版本等待期结束后，用户可执行允许的回退，并继续使用兼容的旧版合约。",
              )}
            </p>
            <p>
              <a
                className="text-button"
                href="https://github.com/otctoken/Sui-Move-contract-upgrade-delayed"
                target="_blank"
                rel="noreferrer"
              >
                {t(
                  "Review the upgrade policy source ↗",
                  "审查升级时间锁源码 ↗",
                )}
              </a>
            </p>
            <div className="contract-row">
              <strong>Policy</strong>
              <ObjectLink
                id="0x42f044a3805f943758572005a741304ef329c5667f195bee78bbebd2d40ea523"
                full
              />
            </div>
            <p className="notice">
              {t(
                "Verified November 10, 2026: this Policy holds the BKUSD UpgradeCap and its upgrade delay is 259200000 ms (3 days). The vault’s rollback timer is 518400000 ms (6 days), separate from the upgrade delay. Version scheduling immediately increments the vault version; rollback requires chain time strictly after its deadline. The upgrade Policy also allows UpgradeCap recovery after a separate ten-day wait.",
                "2026 年 11 月 10 日核实：此 Policy 持有 BKUSD UpgradeCap，升级延迟为 259200000 毫秒（三天）。金库回退计时为 518400000 毫秒（六天），与升级锁独立。发起版本切换会立即增加金库版本，回退需链上时间严格超过截止时间。升级 Policy 另有经过十天等待取回 UpgradeCap 的路径。",
              )}
            </p>
          </section>
          <section id="errors">
            <span className="eyebrow">06 / {t("REFERENCE", "参考")}</span>
            <h2>{t("Move abort codes", "Move 错误码")}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>{t("Meaning in main module", "main 模块含义")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ABORTS).map(([code, labels]) => (
                    <tr key={code}>
                      <td className="mono">{code}</td>
                      <td>{labels[locale === "en" ? 0 : 1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              {t(
                "Framework errors and VM arithmetic overflow have separate meanings. Always retain the original module and error details.",
                "框架错误和 VM 算术溢出具有独立含义，应保留原始模块和错误信息。",
              )}
            </p>
          </section>
          <section id="contracts">
            <span className="eyebrow">07 / MAINNET</span>
            <h2>{t("Verify the source of truth.", "验证链上事实。")}</h2>
            {[
              ["Package", PACKAGE],
              ["Vault", VAULT],
              ["Minter", MINTER],
            ].map(([label, id]) => (
              <div className="contract-row" key={label}>
                <strong>{label}</strong>
                <ObjectLink id={id} full />
              </div>
            ))}
            <p>
              <a
                href="https://github.com/otctoken/bkusd/tree/main/contract"
                target="_blank"
                rel="noreferrer"
              >
                {t(
                  "Read the Move source on GitHub ↗",
                  "在 GitHub 阅读 Move 源码 ↗",
                )}
              </a>
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
