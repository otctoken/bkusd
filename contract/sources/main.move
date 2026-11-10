module bkusd::main{
    use std::ascii::{String};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use std::type_name::{Self, TypeName};
    use sui::balance::{Self, Balance};
    use sui::clock::{Clock};
    use sui::table::{Self, Table};
    use sui::random::{Self,Random};
    use sui::bag::{Self, Bag};
    use sui::dynamic_field as df;
    use sui::event::emit;

    use bkusd::bkusd::{Self, Minter, BKUSD};

    const EBagE: u64 = 1;
    const EVersion: u64 = 2;
    const EFlr:u64 = 3;
    const EAmount:u64 = 4;
    const EBusy: u64 = 5;
    const EWrongType: u64 = 6;
    const ENotFinished: u64 = 7;
    const EInvalidAmount: u64 = 8;
    const EWrongVault: u64 = 9;
    const EDecimalGapTooLarge: u64 = 1001;
    const EZeroMintAmount: u64 = 1002;


    public struct RedeemTicket {
        vault_id: ID,
        payment: Coin<BKUSD>,
        amount: u64,
        supply: u64,
        index: u64,
        paid_any: bool,
    }

    
    
    
    const DEKAY:u64 = 259200000;
    const FLASH_LOAN_FEE: u8 = 2;
    const BKUSD_DECIMAL:u8 = 6;
    const VERSION: u64 = 1;

    
    public struct Vault has key, store {
        id: UID,
        vault_coin:Bag,
        lay_in_coin:Bag,
        decimals_data:Table<TypeName,u8>,  
        types:vector<TypeName>,
        version_delay:u64,
        add_delay:u64,
        version:u64,
        redeeming: bool,
    }

    public struct AdminCap has key, store {
        id: UID
    }
    public struct TemporaryCap has key, store {
        id: UID
    }

    public struct Flash_loan_receipt<phantom T> {
        amount: u64,
    }



    public struct Add_coin_type has copy,drop {
        coin_type:TypeName,
    }

    public struct Update_Contract has copy,drop {
        time:u64,
        version:u64,
    }
    public struct Minting_tokens has copy,drop {
        coin_type:TypeName,
        amount:u64,
        bkusd:u64,
    }
    public struct Redemption_tokens has copy,drop {
        coin_type:TypeName,
        amount:u64,
    }
    public struct Brun_bkusd has copy,drop {
        amount:u64,
    }

    public struct Flash_loan_e has copy,drop {
        coin_type:TypeName,
        amount:u64,
        fee:u64,
    }

    fun init(
        ctx: &mut TxContext
    ) {
        let v = Vault {
            id: object::new(ctx),
            vault_coin:bag::new(ctx),
            lay_in_coin:bag::new(ctx),
            decimals_data:table::new(ctx),
            types:vector[],
            version_delay:0,  
            add_delay:0,
            version:1,
            redeeming:false,
        };
        transfer::transfer(AdminCap {
            id: object::new(ctx)
        }, ctx.sender());
        transfer::transfer(TemporaryCap {
            id: object::new(ctx)
        }, ctx.sender());
        transfer::share_object(v);
    }

    public fun change_add_delay<T>(cap:&mut AdminCap,v:&mut Vault,ds:u8,clk:&Clock){
        let coin_type = type_name::with_defining_ids<T>();
        assert!(!bag::contains(&v.vault_coin, coin_type),EBagE);
        assert!(v.add_delay == 0,0);
        v.add_delay = clk.timestamp_ms() + 259200000;
        df::add(&mut cap.id,coin_type, ds);
        emit(Add_coin_type{
            coin_type: coin_type,
        });
    }
    public fun cancel_add_type<T>(cap:&mut AdminCap,v:&mut Vault,clk:&Clock){
        v.add_delay = 0;
        let coin_type = type_name::with_defining_ids<T>();
        let _ds: u8 = df::remove(
            &mut cap.id,
            coin_type,
        );
    }
    public fun change_add_coin_type<T>(cap:&mut AdminCap,v:&mut Vault,clk:&Clock){
        assert!(v.add_delay < clk.timestamp_ms(),0);
        v.add_delay = 0;
        let coin_type = type_name::with_defining_ids<T>();
        let ds = df::remove(&mut cap.id, coin_type);
        add_coin_type<T>(coin_type,ds,v);
    }

    public fun init_add_type<T>(_: &TemporaryCap,ds:u8,v:&mut Vault){
        let coin_type = type_name::with_defining_ids<T>();
        add_coin_type<T>(coin_type,ds,v);
        emit(Add_coin_type{
            coin_type: coin_type,
        });
    }

    fun add_coin_type<T>(item_type:TypeName,ds:u8,v:&mut Vault){
        bag::add(&mut v.vault_coin, item_type, balance::zero<T>());
        bag::add(&mut v.lay_in_coin, item_type, balance::zero<T>());
        table::add(&mut v.decimals_data, item_type, ds);
        v.types.push_back(item_type);
    }

    public fun change_add_version_delay(_:&AdminCap,v:&mut Vault,clk:&Clock){
        v.version_delay = clk.timestamp_ms() +  518400000;
        v.version = v.version + 1; 
        emit(Update_Contract{
            time:v.version_delay,
            version:v.version,
        });
    }

    public fun get_fee<T>(_:&AdminCap,amount: u64,v:&mut Vault):Balance<T>{
        let key = type_name::with_defining_ids<T>();
        let mut bal_ref = bag::borrow_mut<TypeName, Balance<T>>(
            &mut v.lay_in_coin,
            key
        );
        balance::split(bal_ref, amount)
    }

    public fun Disable_automatic_version_downgrading(_:&AdminCap,v:&mut Vault,clk:&Clock){
        assert!(v.version_delay != 0,0);
        if(v.version == VERSION){
            v.version_delay = 0;
        }
    }

    public fun public_automatic_version_downgrading(v:&mut Vault,clk:&Clock){
        assert!(v.version_delay  < clk.timestamp_ms(),1);
        assert!(v.version_delay != 0,0);
        v.version = v.version - 1;
        v.version_delay = 0;
    }

    public fun dele_TemporaryCap(obj: TemporaryCap) {
        let TemporaryCap { id } = obj;
        object::delete(id);
    }

    public fun mint_bkusd<T>(
        coin: Coin<T>,
        mint: &mut Minter,
        v: &mut Vault,
        ctx: &mut TxContext,
    ) {
        assert!(v.version == VERSION, EVersion);
        assert!(!v.redeeming, EBusy);

        let coin_type = type_name::with_defining_ids<T>();


        assert!(
            v.vault_coin.contains_with_type<TypeName, Balance<T>>(
                coin_type
            ),
            EBagE
        );

        let dcl: u8 = *v.decimals_data.borrow(coin_type);
        let input_amount = coin.value();


        let mint_amount: u64 = if (dcl == BKUSD_DECIMAL) {
            input_amount
        } else if (dcl > BKUSD_DECIMAL) {
            let diff: u8 = dcl - BKUSD_DECIMAL;


            assert!(diff <= 19, EDecimalGapTooLarge);

            let gap = std::u64::pow(10u64, diff);
            input_amount / gap
        } else {
            let diff: u8 = BKUSD_DECIMAL - dcl;
            let gap = std::u64::pow(10u64, diff);

            input_amount * gap
        };

        assert!(mint_amount > 0, EZeroMintAmount);


        let bal_ref: &mut Balance<T> =
            v.vault_coin.borrow_mut(coin_type);

        coin::put(bal_ref, coin);


        bkusd::mint(mint, mint_amount, ctx);
        emit(Minting_tokens {
            coin_type:coin_type,
            amount:input_amount,
            bkusd:mint_amount,
        });

    }



    public fun retrieve_usd(
        coin: Coin<BKUSD>,
        mint: &Minter,
        v: &mut Vault,
    ): RedeemTicket {
        assert!(!v.redeeming, EBusy);
        assert!(v.version == VERSION, EVersion);
        let amount = coin.value();
        let supply = bkusd::get_total_supply(mint);

        assert!(
            amount > 0 && amount <= supply,
            EInvalidAmount
        );

        assert!(
            v.types.length() == v.vault_coin.length(),
            EWrongType
        );

        v.redeeming = true;

        RedeemTicket {
            vault_id: object::id(v),
            payment: coin,
            amount,
            supply,
            index: 0,
            paid_any: false,
        }
    }


    public fun retrieve_one<T>(
        v: &mut Vault,
        mut ticket: RedeemTicket,
        ctx: &mut TxContext,
    ): RedeemTicket {
        assert!(v.redeeming, EBusy);
        assert!(ticket.vault_id == object::id(v), EWrongVault);

        assert!(ticket.index < v.types.length(), EWrongType);

        let key = type_name::with_defining_ids<T>();


        let expected = *v.types.borrow(ticket.index);
        assert!(key == expected, EWrongType);

        let bian: &mut Balance<T> =
            v.vault_coin.borrow_mut(key);

        let output = (
            (bian.value() as u256) *
            (ticket.amount as u256) /
            (ticket.supply as u256)
        ) as u64;

        if (output > 0) {
            let c = coin::take<T>(bian, output, ctx);
            transfer::public_transfer(c, ctx.sender());

            ticket.paid_any = true;
        };

        ticket.index = ticket.index + 1;
        emit(Redemption_tokens {
            coin_type:expected,
            amount:output,
        });

        ticket
    }


    public fun finish_retrieve(
        v: &mut Vault,
        mint: &mut Minter,
        ticket: RedeemTicket,
    ) {
        assert!(v.redeeming, EBusy);
        assert!(ticket.vault_id == object::id(v), EWrongVault);
        assert!(ticket.index == v.types.length(), ENotFinished);
        assert!(ticket.paid_any, EInvalidAmount);

        let RedeemTicket {
            vault_id: _,
            payment,
            amount: _,
            supply,
            index: _,
            paid_any: _,
        } = ticket;

        assert!(
            bkusd::get_total_supply(mint) == supply,
            EInvalidAmount
        );

        emit(Brun_bkusd {
            amount:payment.value(),
        });

        bkusd::burn(mint, payment);


        v.redeeming = false;
    }
    

    public fun flash_loan_borrow<T>(v:&mut Vault,amount:u64,ctx: &mut TxContext):(Coin<T>,Flash_loan_receipt<T>){
        assert!(!v.redeeming, EBusy);
        assert!(v.version==VERSION,EVersion);
        assert!(amount>=100000,EAmount);
        let coin_type = type_name::with_defining_ids<T>();
        let mut bian = v.vault_coin.borrow_mut(coin_type);
        
        let flr = Flash_loan_receipt {
            amount:amount,
        };
        (coin::take(bian, amount, ctx),flr)
    }



    public fun flash_loan_repay<T>(v:&mut Vault,_flr:Flash_loan_receipt<T>,mut coin:Coin<T>,ctx: &mut TxContext):Coin<T>{
        assert!(v.version==VERSION,EVersion);
        assert!(!v.redeeming, EBusy);
        let Flash_loan_receipt {amount} = _flr;
        let coin_v = coin.value();
        let fee = amount / 10000 * (FLASH_LOAN_FEE as u64);
        let repay_v = amount + fee;
        assert!(coin_v >= repay_v,EFlr);

        let coin_type = type_name::with_defining_ids<T>();
        let mut bian = v.vault_coin.borrow_mut(coin_type);
        let mut fee_bian = v.lay_in_coin.borrow_mut(coin_type);

        let rcoin = coin.split(amount, ctx);
        let fcoin = coin.split(fee, ctx);
        coin::put(bian, rcoin);
        coin::put(fee_bian, fcoin);
        emit(Flash_loan_e {
            coin_type:coin_type,
            amount:amount,
            fee:fee,
        });
        coin
    }




    public fun get_vault_balance<T>(
        v:&Vault,
    ): u64 {
        let key = type_name::with_defining_ids<T>();

        if (bag::contains_with_type<TypeName, Balance<T>>(&v.vault_coin, key)) {
            let bal_ref = bag::borrow<TypeName, Balance<T>>(&v.vault_coin, key);
            balance::value(bal_ref)
        } else {
            0
        }
    }
    public fun get_fee_balance<T>(
        v:&Vault,
    ): u64 {
        let key = type_name::with_defining_ids<T>();

        if (bag::contains_with_type<TypeName, Balance<T>>(&v.lay_in_coin, key)) {
            let bal_ref = bag::borrow<TypeName, Balance<T>>(&v.lay_in_coin, key);
            balance::value(bal_ref)
        } else {
            0
        }
    }
}
