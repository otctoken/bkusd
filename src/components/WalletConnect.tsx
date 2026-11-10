import {
  useCurrentAccount,
  useCurrentWallet,
  useDAppKit,
  useWallets,
  useWalletConnection,
} from "@mysten/dapp-kit-react";
import { useLanguage } from "../i18n";
import { WalletControl } from "./WalletControl";
export function WalletConnect() {
  const { t } = useLanguage(),
    kit = useDAppKit(),
    account = useCurrentAccount(),
    wallet = useCurrentWallet(),
    wallets = useWallets(),
    connection = useWalletConnection();
  return (
    <WalletControl
      t={t}
      connecting={
        connection.status === "connecting" ||
        connection.status === "reconnecting"
      }
      wallets={wallets.map((w, index) => ({
        key: `${w.name}:${index}`,
        name: w.name,
        icon: w.icon,
        connect: () => kit.connectWallet({ wallet: w }),
      }))}
      current={
        account && wallet
          ? {
              name: wallet.name,
              address: account.address,
              icon: wallet.icon,
              accounts: wallet.accounts
                .filter((a) => a.chains.includes("sui:mainnet"))
                .map((a) => ({
                  address: a.address,
                  label: a.label,
                  select: async () => kit.switchAccount({ account: a }),
                })),
            }
          : null
      }
      disconnect={async () => {
        await kit.disconnectWallet();
        if (kit.stores.$connection.get().account)
          throw new Error(
            t(
              "Wallet is still connected. Please try again.",
              "钱包仍处于连接状态，请重试。",
            ),
          );
      }}
    />
  );
}
