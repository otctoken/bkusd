import { createDAppKit } from "@mysten/dapp-kit-react";
import { sui } from "../services/suiClient";
export const dAppKit = createDAppKit({
  networks: ["mainnet"],
  createClient: () => sui,
  slushWalletConfig: { appName: "BKUSD" },
});
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
