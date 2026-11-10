module bkusd::bkusd {
    use sui::event::emit;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url::{Self};
    use sui::clock::{Clock};

    // One Time Witness
    public struct BKUSD has drop {}

    public struct Minter has key, store {
        id: UID,
        cap: TreasuryCap<BKUSD>,
    }

    fun init(witness: BKUSD, ctx: &mut TxContext) {
        // TODO
        let decimals = 6;
        let symbol = b"BKUSD";
        let name = b"Basket-backed USD";
        let description = b"BKUSD is a multi-stablecoin-backed digital asset on Sui, minted 1:1 against supported stablecoins and redeemable for a proportional share of its transparent on-chain reserves.";
        let icon_url = url::new_unsafe_from_bytes(b"https://ipfs.io/ipfs/bafkreiblrxh3smfrmmigieokob4ukrg65veiziwj6rg6ycsfqb6sjjxg6a");

        let (treasury, metadata) = coin::create_currency(witness, decimals, symbol, name, description, option::some(icon_url), ctx);

        let event_metadata_id = object::id(&metadata);
        transfer::public_freeze_object(metadata);

        let minter = Minter { id: object::new(ctx), cap: treasury };
        transfer::share_object(minter);
    }

    public(package) fun mint(
        minter: &mut Minter,amount: u64,  ctx: &mut TxContext
    ) {
        coin::mint_and_transfer(&mut minter.cap, amount, ctx.sender(), ctx);
    }

    public(package) fun burn(minter: &mut Minter,c: Coin<BKUSD>) {
        let value = c.value();
        coin::burn(&mut minter.cap, c);
    }
    public fun get_total_supply(minter: &Minter):u64{
        coin::total_supply(&minter.cap)
    }

}
