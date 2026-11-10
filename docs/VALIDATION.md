# Verification — 2026-11-10 (Asia/Singapore)

## Passed

- Strict TypeScript check (`npm run typecheck`).
- Vite production build (`npm run build`).
- 11 Node tests (`npm test`): exact values beyond JS safe integer range, u64 boundaries, mint rounding and overflow, redeem widened multiplication, divide-before-multiply flash fee, atomic redemption command order and ticket consumption, fee Balance-to-Coin conversion, exact administrative function names.
- `npm audit`: zero known vulnerabilities in the resolved dependency manifest.
- gRPC mainnet: decoded configured Vault and Minter, type-checked both, read reserve/fee Bag fields and registered decimals. Version 1; order USDsui then USDC; decimals 6 each. Supply and reserves were zero at the observation time.
- GraphQL mainnet: fetched two real `Add_coin_type` events and their transaction effects/timestamps; confirmed configured Vault involvement. No fabricated time series.
- Mainnet function metadata: all 13 transaction entry points used by the application exist and have the source-matching public signatures, generic counts and return types.
- Local Vite server responds HTTP 200 at `http://localhost:5173/`.

## Not verified

- Browser visual and interaction QA: embedded browser control timed out, including a retry after the user reopened it. The Windows fallback stopped because it could not reliably identify the current browser URL. No claim of successful desktop/mobile visual inspection.
- Real wallet signing and mainnet asset movement: no user wallet/private key was used and no transaction was submitted. The observed zero reserves/supply also preclude a nonzero successful redemption or flash loan at that moment.
- Vercel deployment: intentionally left to the user.

## Repository preservation

The existing remote contains the Move project. The local supplied Move files differ from it only in pre-existing comments. They were not edited, staged, or included in the frontend commit; the existing local differences are preserved.
