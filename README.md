# BKUSD

BKUSD is a multi-stablecoin-backed asset on Sui mainnet. Deposit a supported stablecoin to mint BKUSD at a nominal 1:1 conversion, or redeem BKUSD for a proportional share of every reserve asset.

Our reserve-selection policy is to support stablecoins issued directly on Sui Network by established official issuers with strong institutional backing. Supported assets and their ordering are always read from the on-chain vault.

Built with React 19, TypeScript, Vite, Tailwind CSS 4, **@mysten/sui 2.x**, and **@mysten/dapp-kit-react**. The interface supports English and Chinese, defaults to a dark theme, and selects Chinese for browser languages starting with `zh`.

## Development

Requires Node.js 22.12 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. The supplied mainnet package, vault, and minter IDs are the defaults; environment variables can override them. All `VITE_` variables are public frontend configuration. Never put private keys or server secrets in them.

## Deploy to Vercel

Import this repository and select:

- Framework: **Vite**
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `dist`

Configure variables from `.env.example`. RPC endpoints must support browser CORS. `vercel.json` includes the React Router SPA fallback. No backend, database, or private key is required.

## Features

- **Overview:** live supply, reserves, asset composition, precision, and object links. BCS decoding reads Minter, Vault, reserve/fee Bags, and the decimals Table.
- **Mint:** exact BigInt conversion, u64 checks, paginated Coin selection and merging, and real `mint_bkusd<T>` calls.
- **Redeem:** a single atomic PTB runs `retrieve_usd`, every `retrieve_one<T>` in registry order (including zero reserves), and `finish_retrieve`.
- **Flash loans:** contract documentation, a TypeScript integration example, and a live borrow-and-immediately-repay demonstration. The wallet pays actual fees and gas; no arbitrage strategy is provided.
- **Analytics:** paginated GraphQL events checked against the configured vault. Partial coverage is identified explicitly. Absolute history is displayed only when reconstructed supply and reserves agree with current on-chain data.
- **Admin:** on-chain AdminCap ownership controls access. Supports asset proposals, execution and cancellation, version changes and rollback, fee withdrawals, and inspection of the connected wallet's TemporaryCaps.
- **Docs:** bilingual explanations, flow diagrams, an interactive precision calculator, abort codes, and contract links.
- **Wallets:** Wallet Standard discovery through the current dApp Kit hooks, explicit wallet names, Slush integration, account switching, and direct SDK disconnect actions with loading/error feedback. Mainnet only.

## Transaction lifecycle

1. Refresh vault state and select spendable wallet Coin objects.
2. Construct and simulate the PTB over gRPC; show estimated gas and simulated outputs.
3. Request wallet signing only after user confirmation. The preview expires after 60 seconds.
4. Wait for execution, decode actual events, and invalidate cached balances and vault data.
5. Preserve the digest when confirmation is uncertain so users can check the result before retrying.

All on-chain amount arithmetic uses BigInt. Number conversion is limited to scaled display ratios and chart coordinates. The interface distinguishes total balances from spendable Coin-object balances.

## Administration and security

The supplied contract collects protocol revenue from flash-loan fees. Fees are held separately in `lay_in_coin`; the administrator's fee-withdrawal function does not withdraw collateral from `vault_coin`. This separation is a specific contract property, not a guarantee against all smart-contract or stablecoin risks.

Normal reserve additions have a three-day timelock, giving users time to review a proposed asset and decide whether to redeem. A retained `TemporaryCap` can bypass this registration delay during initialization.

Package upgrades use a separate [delayed upgrade policy](https://github.com/otctoken/Sui-Move-contract-upgrade-delayed). The [mainnet Policy](https://suiscan.xyz/mainnet/object/0x42f044a3805f943758572005a741304ef329c5667f195bee78bbebd2d40ea523) was verified on November 10, 2026: it holds the BKUSD UpgradeCap and sets `temporize = 259200000` milliseconds, a three-day upgrade delay. Users can inspect the proposed upgrade and the upgraded contract.

Vault version rollback is a separate mechanism. The supplied BKUSD source uses a **six-day** rollback timer with a strict `timestamp > deadline` check. If the administrator does not complete a version transition, users may execute the permitted rollback after that deadline and continue using the compatible old package. Scheduling a version change immediately increments the vault version and can interrupt operations in the old package; it does not itself deploy upgraded bytecode. The external Policy also provides a separate ten-day delayed UpgradeCap recovery path.

## Contract constraints

See [the interface audit](docs/CONTRACT.md) for public signatures, BCS layouts, event types, and abort codes. The original Move source files have not been modified.

- BKUSD has six decimals. The entire collateral input enters reserves, including any precision remainder discarded during mint conversion.
- Redemption has no on-chain minimum-output or slippage parameter. A failed transaction reverts asset changes but may still charge gas.
- Flash fees are exactly `(amount / 10000) * 2`, with integer division first. Minimum borrowing is 100000 base units.
- `Add_coin_type` can signal a proposal rather than completed registration; the UI checks actual state. The burn event is spelled `Brun_bkusd` in the contract.
- There is no price oracle. Aggregate reserves and composition use normalized nominal token units, not guaranteed USD market values.
- Separate RPC reads are not an atomic checkpoint snapshot, and state can change between simulation and execution.

## Project structure

```text
contract/                 Original Move source
docs/                     Interface audit and verification notes
public/assets/            Brand and stablecoin logos
src/config/               Public configuration, dApp Kit, token branding
src/services/             gRPC/GraphQL, BCS, dynamic fields, Coin selection, PTBs
src/hooks/                Cached queries and transaction lifecycle
src/components/           Navigation, wallet UI, tables, charts, transaction dialog
src/pages/                Overview, trade, flash loans, analytics, admin, docs
src/utils/                BigInt amounts, type normalization, error mapping
scripts/verify-chain.ts   Read-only mainnet verification
```

`src/config/tokens.ts` is the single branding registry. Adding a logo or symbol there does not register collateral on-chain. Unknown assets use on-chain CoinMetadata and a fallback icon.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run verify:chain
```

The final command reads mainnet objects, dynamic fields, events, and function metadata without submitting transactions. Public endpoints may rate-limit requests.

See [validation notes](docs/VALIDATION.md) for verification scope. Real-wallet authorization and successful mainnet asset movement require the asset owner's participation; no private keys are included in this project.

SDK references: [React dApp Kit](https://sdk.mystenlabs.com/dapp-kit/getting-started/react), [gRPC client](https://sdk.mystenlabs.com/sui/clients/grpc), and [data queries](https://sdk.mystenlabs.com/sui/clients/querying). No deprecated Sui JSON-RPC calls are used.
