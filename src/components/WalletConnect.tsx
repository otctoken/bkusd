import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useLanguage } from "../i18n";
export function WalletConnect() {
  const { t } = useLanguage();
  return <ConnectButton>{t("Connect wallet", "连接钱包")}</ConnectButton>;
}
