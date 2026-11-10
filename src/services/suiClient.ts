import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { GRPC_URL, GRAPHQL_URL } from "../config/contracts";
export const sui = new SuiGrpcClient({ network: "mainnet", baseUrl: GRPC_URL });
export const graphql = new SuiGraphQLClient({
  network: "mainnet",
  url: GRAPHQL_URL,
});
