# BKUSD contract interface audit

Source of truth: `contract/sources/main.move` and `contract/sources/coin.move`, read in full before implementation. Only two Move files were supplied (the request mentioned three). No contract modifications.

All functions below are `public fun`, callable in a PTB; `TxContext` arguments are supplied by Sui, never serialized by the app. The `bkusd::mint` and `bkusd::burn` functions are package-only.

## Objects and reads

`Vault`: UID, `vault_coin: Bag`, `lay_in_coin: Bag`, `decimals_data: Table<TypeName,u8>`, `types: vector<TypeName>`, `version_delay:u64`, `add_delay:u64`, `version:u64`, `redeeming:bool`, in that order. Bags store `Balance<T>` under `TypeName`, not Coin objects. Read BCS content, derive dynamic field names with BCS TypeName `{name: definingTypeWithout0x}`, decode u64 balances and u8 decimals. `types` supplies ordering and membership; the local token registry only supplies branding. `Minter`: UID + TreasuryCap<BKUSD> (UID + Supply<BKUSD> containing u64 value). Both are shared objects, resolved by the SDK. Validate their full Move types on read.

## Public main functions (explicit parameters)

| Function | Parameters | Return / behavior |
|---|---|---|
| change_add_delay<T> | &mut AdminCap, &mut Vault, u8 decimals, &Clock | Require unregistered type, no active delay; adds proposal dynamic field to cap, sets 3-day delay; emits Add_coin_type (proposal, not execution) |
| cancel_add_type<T> | &mut AdminCap, &mut Vault, &Clock | Remove cap proposal field, clear delay |
| change_add_coin_type<T> | &mut AdminCap, &mut Vault, &Clock | Strict timestamp > delay; consume proposal; insert zero reserve/fee balances, decimals, append type; no execution event |
| init_add_type<T> | &TemporaryCap, u8 decimals, &mut Vault | Immediate initial registration; emits Add_coin_type |
| change_add_version_delay | &AdminCap, &mut Vault, &Clock | Immediately increment version, set 6-day delay; emit Update_Contract |
| get_fee<T> | &AdminCap, u64 amount, &mut Vault | Balance<T>; convert with sui::coin::from_balance and transfer to sender |
| Disable_automatic_version_downgrading | &AdminCap, &mut Vault, &Clock | Require nonzero delay; only clear it if version == compiled VERSION (1) |
| public_automatic_version_downgrading | &mut Vault, &Clock | Permissionless; strict timestamp > nonzero delay; decrement version, clear delay |
| dele_TemporaryCap | TemporaryCap | Consume and delete capability |
| mint_bkusd<T> | Coin<T>, &mut Minter, &mut Vault, &mut TxContext | Put all input into reserve; mint converted amount to sender; emit Minting_tokens |
| retrieve_usd | Coin<BKUSD>, &Minter, &mut Vault | RedeemTicket; snapshot supply; set redeeming=true |
| retrieve_one<T> | &mut Vault, RedeemTicket, &mut TxContext | New RedeemTicket; check indexed type; transfer floor(reserve × amount / supply) to sender, including zero-output step/event |
| finish_retrieve | &mut Vault, &mut Minter, RedeemTicket | Check all types visited, some output positive, same supply; emit Brun_bkusd; burn; unlock |
| flash_loan_borrow<T> | &mut Vault, u64 amount, &mut TxContext | (Coin<T>, Flash_loan_receipt<T>); amount >= 100000 |
| flash_loan_repay<T> | &mut Vault, Flash_loan_receipt<T>, Coin<T>, &mut TxContext | Coin<T> change; fee=(amount/10000)*2; principal returned to reserves, fee to lay_in_coin |
| get_vault_balance<T> | &Vault | u64 reserve or zero |
| get_fee_balance<T> | &Vault | u64 fees or zero |

`bkusd::get_total_supply(&Minter): u64` is public. Initializers are private.

## Amounts and atomicity

BKUSD has 6 decimals. Mint uses division when collateral decimals >6, multiplication when <6; max difference 19 for division, positive result required, u64 bounds apply. All input is deposited, including discarded precision. Redeem uses u256 intermediate and floor division per asset. A redemption whose every output is zero aborts. There are no minimum-output/slippage/deadline arguments. Preview and simulation do not bind the eventual outputs. Ticket is passed by value through each step and has no abilities; neither it nor flash receipt can survive a transaction. Zero-reserve types cannot be skipped. The SDK resolves shared object versions.

## Events

Exact `main` struct names: `Add_coin_type {coin_type}`, `Update_Contract {time,version}`, `Minting_tokens {coin_type,amount,bkusd}`, `Redemption_tokens {coin_type,amount}`, **`Brun_bkusd {amount}`** (spelling in source), `Flash_loan_e {coin_type,amount,fee}`. No event identifies the Vault. Analytics filters transactions touching the configured vault and labels history coverage; fee withdrawals have no dedicated event. Supply/reserve history can be reconstructed backwards from a current snapshot only over covered, successfully decoded transactions, including fee-free reserve-neutral flash loans. Do not call token-denominated sums USD market value.

## Abort codes

| Code | Meaning / context |
|---|---|
| 0 | Generic administrative assertion: active proposal, too early execution, or absent version delay |
| 1 EBagE | Type missing/already registered; also rollback too early (same literal code) |
| 2 EVersion | Vault version differs from compiled VERSION=1 |
| 3 EFlr | Flash repayment below principal plus fee |
| 4 EAmount | Flash amount below 100000 base units |
| 5 EBusy | Redemption lock has unexpected state |
| 6 EWrongType | Registry length/order or generic type mismatch |
| 7 ENotFinished | Not all redemption types processed |
| 8 EInvalidAmount | Zero/excessive redemption, all-zero output, or supply changed |
| 9 EWrongVault | Ticket belongs to another vault |
| 1001 EDecimalGapTooLarge | Collateral decimals exceed BKUSD decimals by >19 |
| 1002 EZeroMintAmount | Mint truncates to zero |

Sui framework Bag/Table/dynamic_field/Balance aborts and VM integer overflow are separate from this table; report original details and module instead of attributing all numeric codes to main.

## Contract constraints surfaced by the UI

- Version proposal immediately sets version=2 and blocks version-1 user operations. It does not upgrade package bytecode. Disabling rollback from this package then does nothing because VERSION=1; UI blocks that no-op.
- TemporaryCap bypasses the add delay. Display owned capability status; never automatically invoke initialization or delete it.
- Coin decimals are administrator-provided, not checked against CoinMetadata by Move. UI compares metadata and refuses proposing a mismatched value.
- Flash receipt records only amount, not vault identity; the frontend always uses the same configured vault on both calls.
- No chain slippage protection or price oracle; no invented guarantees.
- Browser reads are separate RPC calls, not an atomic checkpoint snapshot. Refresh before transaction construction, simulate, and use execution events as actual results.
