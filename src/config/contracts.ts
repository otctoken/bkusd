const env = import.meta.env ?? {};
export const PACKAGE =
  env.VITE_PACKAGE_ID ||
  "0x3b09716175e449616e314819711f01cb2231e33393ec0fb43b93be4891d63c42";
export const VAULT =
  env.VITE_VAULT_ID ||
  "0x371798c15a86f4fcea9157b1f788d0e4402cb71408b4925cb349a6c3c7544f33";
export const MINTER =
  env.VITE_MINTER_ID ||
  "0x283e1ff6da04a9ec72d97e21f7aa607b661f201f301d09c289083ed9fe5361c0";
export const BKUSD = `${PACKAGE}::bkusd::BKUSD`;
export const CLOCK = "0x6";
export const GRPC_URL =
  env.VITE_GRPC_URL || "https://fullnode.mainnet.sui.io:443";
export const GRAPHQL_URL =
  env.VITE_GRAPHQL_URL || "https://graphql.mainnet.sui.io/graphql";
export const explorer = (kind: "object" | "tx" | "account", id: string) =>
  `https://suiscan.xyz/mainnet/${kind}/${id}`;
