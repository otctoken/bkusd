import { NavLink, Link } from "react-router-dom";
import { WalletConnect } from "./WalletConnect";
import { Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../i18n";
import { useCaps } from "../hooks/useVault";
export function Navbar() {
  const { t, toggle, locale } = useLanguage(),
    caps = useCaps();
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "Overview", "概览"],
    ["/mint", "Mint", "铸造"],
    ["/redeem", "Redeem", "赎回"],
    ["/flash-loan", "Flash Loan", "闪电贷"],
    ["/analytics", "Analytics", "分析"],
    ["/docs", "Docs", "文档"],
  ];
  if (caps.data?.admin.length) links.push(["/admin", "Admin", "管理"]);
  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img src="/assets/logo.png" alt="BKUSD" />
        <span>BKUSD</span>
      </Link>
      <nav
        className={open ? "open" : ""}
        aria-label={t("Main navigation", "主导航")}
      >
        {links.map(([to, en, zh]) => (
          <NavLink
            end={to === "/"}
            key={to}
            to={to}
            onClick={() => setOpen(false)}
          >
            {t(en, zh)}
          </NavLink>
        ))}
      </nav>
      <div className="nav-actions">
        <span className="network">
          <i />
          Sui Mainnet
        </span>
        <button
          className="language"
          onClick={toggle}
          aria-label="Change language"
        >
          <Globe2 size={16} />
          {locale === "en" ? "中文" : "EN"}
        </button>
        <WalletConnect />
        <button
          className="menu-button"
          aria-label={t("Toggle navigation", "展开导航")}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
