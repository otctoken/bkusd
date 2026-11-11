# Verification — 2026-11-10 (Asia/Singapore)

## Update — 2026-11-11

### Gas preview and mobile layout follow-up

- Removed the incorrect rejection of successful simulations with `gasPaymentMocked`. Mock gas describes the simulation mode and does not establish that the wallet lacks SUI. Contract execution failures still block signing.
- Simulations operate on a `Transaction.from` copy. The signing PTB does not specify gas budget, price, or payment; SDK/wallet resolution remains automatic. Gas shown in the preview is an estimate, not a funding check.
- Added a regression test for unset signing gas configuration and isolation from changes to the simulation copy.
- On narrow screens, the reserve table becomes labeled asset cards. Intrinsic grid widths, decorative overflow, narrow navigation, footer wrapping, and long amounts/types have explicit responsive handling.
- Added the requested X and Telegram footer links.
- Real-device layout and funded-wallet execution remain unverified; no browser automation tool was available for this follow-up.

- English README and bilingual administration/security documentation updated.
- Mainnet Policy `0x42f044a3805f943758572005a741304ef329c5667f195bee78bbebd2d40ea523` read on November 10: its embedded UpgradeCap references the configured BKUSD package and `temporize = 259200000` (three days). This is distinct from the six-day vault rollback in the supplied BKUSD source. No Move source was changed.
- Wallet UI now renders discovered wallet names as React text and invokes dApp Kit connect/disconnect/account actions directly, with explicit pending and error feedback.
- Production build and TypeScript checks passed. All 15 tests passed, including four DOM interaction tests covering named wallet selection, asynchronous disconnect, duplicate-click prevention, failure/retry feedback, Chinese labels, and empty discovery.
- Production dependency audit reports zero known vulnerabilities.
- Wallet regression tests use injected action fixtures; no real wallet permissions were revoked or mainnet transactions signed. These tests do not replace verification against the user's installed wallet extension.

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
