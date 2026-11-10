import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { readVault, readCaps } from "../services/vault";
import { sui } from "../services/suiClient";
import { BKUSD } from "../config/contracts";
export const useVault = () =>
  useQuery({
    queryKey: ["vault"],
    queryFn: readVault,
    refetchInterval: 30000,
    staleTime: 10000,
  });
export function useBalance(type = BKUSD) {
  const account = useCurrentAccount();
  return useQuery({
    queryKey: ["balance", account?.address, type],
    queryFn: async () => {
      const r = await sui.getBalance({
        owner: account!.address,
        coinType: type,
      });
      return {
        total: BigInt(r.balance.balance),
        spendable: BigInt(r.balance.coinBalance),
      };
    },
    enabled: !!account,
    refetchInterval: 30000,
  });
}
export function useCaps() {
  const account = useCurrentAccount();
  return useQuery({
    queryKey: ["caps", account?.address],
    queryFn: () => readCaps(account!.address),
    enabled: !!account,
    refetchInterval: 30000,
  });
}
