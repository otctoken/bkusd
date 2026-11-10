import { normalizeStructTag } from "@mysten/sui/utils";
// Branding only. Membership, ordering, decimals and balances always come from Vault.
export const TOKENS: Record<
  string,
  { symbol: string; name: string; logo: string; color: string }
> = {
  [normalizeStructTag(
    "0x44f838219cf67b058f3b37907b655f226153c18e33dfcd0da559a844fea9b1c1::usdsui::USDSUI",
  )]: {
    symbol: "USDsui",
    name: "Sui Dollar",
    logo: "/assets/usd_sui_logo.png",
    color: "#43bbf5",
  },
  [normalizeStructTag(
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  )]: {
    symbol: "USDC",
    name: "USD Coin",
    logo: "/assets/usdc_logo.png",
    color: "#648aff",
  },
};
