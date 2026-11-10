import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Wallet, X, LoaderCircle, Check } from "lucide-react";
import { shortId } from "../utils/typeName";
import { errorText } from "../utils/errors";

export interface WalletControlProps {
  t: (en: string, zh: string) => string;
  connecting?: boolean;
  wallets: {
    key: string;
    name: string;
    icon: string;
    connect: () => Promise<unknown>;
  }[];
  current: null | {
    name: string;
    address: string;
    icon: string;
    accounts: {
      address: string;
      label?: string;
      select: () => Promise<unknown>;
    }[];
  };
  disconnect: () => Promise<void>;
}

/** React UI over dApp Kit actions: no shadow-DOM event relay or duplicate wallet state. */
export function WalletControl({
  t,
  wallets,
  current,
  disconnect,
  connecting = false,
}: WalletControlProps) {
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState<string | null>(null),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    lock = useRef(false),
    titleId = useId();
  const busy = pending !== null || connecting;
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  async function run(key: string, action: () => Promise<unknown>) {
    if (lock.current || connecting) return;
    lock.current = true;
    setPending(key);
    setError("");
    try {
      await action();
      setOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setPending(null);
    }
  }
  return (
    <>
      <button
        className="wallet-trigger"
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        {current ? <img src={current.icon} alt="" /> : <Wallet size={16} />}
        <span>
          {current ? shortId(current.address) : t("Connect wallet", "连接钱包")}
        </span>
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="wallet-dialog"
          aria-labelledby={titleId}
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setOpen(false);
          }}
          onClose={() => setOpen(false)}
        >
          <button
            className="close"
            type="button"
            aria-label={t("Close", "关闭")}
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
          <h2 id={titleId}>
            {current
              ? t("Connected wallet", "已连接钱包")
              : t("Connect a wallet", "连接钱包")}
          </h2>
          <p className="wallet-subtitle">
            {current
              ? current.name
              : t(
                  "Choose a Sui Wallet Standard wallet.",
                  "选择兼容 Sui Wallet Standard 的钱包。",
                )}
          </p>
          {current ? (
            <>
              <div className="wallet-current">
                <img src={current.icon} alt="" />
                <div>
                  <strong>{current.name}</strong>
                  <code>{current.address}</code>
                </div>
              </div>
              {current.accounts.length > 1 && (
                <div className="wallet-list" aria-label={t("Accounts", "账户")}>
                  {current.accounts.map((a) => (
                    <button
                      type="button"
                      key={a.address}
                      disabled={busy}
                      onClick={() => run(a.address, a.select)}
                    >
                      <span>{a.label || shortId(a.address)}</span>
                      {a.address === current.address && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="secondary full wallet-disconnect"
                disabled={busy}
                onClick={() => run("disconnect", disconnect)}
              >
                {pending === "disconnect" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <LogOut size={16} />
                )}{" "}
                {pending === "disconnect"
                  ? t("Disconnecting…", "正在断开…")
                  : t("Disconnect wallet", "断开连接")}
              </button>
            </>
          ) : (
            <>
              <div className="wallet-list">
                {wallets.map((w) => (
                  <button
                    type="button"
                    key={w.key}
                    disabled={busy}
                    onClick={() => run(w.key, w.connect)}
                  >
                    <img src={w.icon} alt="" />
                    <span>{w.name}</span>
                    {pending === w.key && (
                      <LoaderCircle className="spin" size={16} />
                    )}
                  </button>
                ))}
              </div>
              {wallets.length === 0 && (
                <p className="notice">
                  {t(
                    "No compatible wallet is available yet. Open this site in your Sui wallet browser or enable a Wallet Standard extension, then reload.",
                    "暂未发现兼容钱包。请在 Sui 钱包内置浏览器打开本站，或启用 Wallet Standard 扩展后刷新。",
                  )}
                </p>
              )}
              <p className="wallet-help">
                {t(
                  "Slush is the official Mysten wallet. dApp Kit is the connection library, not a wallet name.",
                  "Slush 是 Mysten 的官方钱包。dApp Kit 是连接库名称，不是钱包名称。",
                )}{" "}
                <a href="https://slush.app" target="_blank" rel="noreferrer">
                  {t("Get Slush ↗", "获取 Slush ↗")}
                </a>
              </p>
            </>
          )}
          {error && (
            <p className="validation" role="alert">
              {error}
            </p>
          )}
        </dialog>,
        document.body,
      )}
    </>
  );
}
