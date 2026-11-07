//! Transferable concessions and two segregated, deposit-backed reward pools.
//! All live deployments are testnet. Lunar game credits are not redeemable.
use super::*;
use near_contract_standards::non_fungible_token::{
    approval::NonFungibleTokenApproval,
    core::{NonFungibleTokenCore, NonFungibleTokenResolver},
    enumeration::NonFungibleTokenEnumeration,
    metadata::{NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata},
    Token, TokenId,
};
use near_sdk::{json_types::U128, Gas, NearToken, Promise, PromiseOrValue};
use std::collections::HashMap;

pub const SHARE_CAP: u128 = 20_000_000_000_000_000_000_000; // 0.02 testnet NEAR
pub const PER_CENT: u128 = 1_000_000_000_000_000_000; // 0.0001 tNEAR / earned credit
#[near(serializers=[borsh])]
pub struct BusinessShare {
    pub run_id: String,
    pub deal: u8,
    pub reserve: u128,
    pub paid: u128,
    pub pending: u128,
    pub closed: bool,
}
#[near(serializers=[borsh])]
#[derive(Default)]
pub struct PrizeClaim {
    pub amount: u128,
    pub paid: u128,
    pub pending: u128,
}
fn event(name: &str, data: serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        serde_json::json!({"standard":"moonpark","version":"3.0.0","event":name,"data":[data]})
    ));
}
fn callback(method: &str, args: serde_json::Value) -> Promise {
    Promise::new(env::current_account_id()).function_call(
        method,
        args.to_string().into_bytes(),
        NearToken::from_yoctonear(0),
        Gas::from_tgas(8),
    )
}
fn paid_ok() -> bool {
    assert_eq!(
        env::promise_results_count(),
        1,
        "Expected a transfer result"
    );
    env::promise_result_checked(0, 0).is_ok()
}
impl Moonpark {
    // Storage growth must never lock up the NEAR backing an uncollected reward.
    // Pending payments stay counted until the success callback (conservative).
    pub(crate) fn assert_collateral(&self) {
        let liquid = env::account_balance()
            .as_yoctonear()
            .saturating_sub(env::storage_usage() as u128 * env::storage_byte_cost().as_yoctonear());
        assert!(
            liquid >= self.business_obligations + self.prize_obligations + SHARE_CAP,
            "The storage sponsor needs replenishing; reserved rewards remain protected"
        );
    }
    pub(crate) fn issue_share(
        &mut self,
        run_id: &str,
        p: &moonpark_sim::partnerships::Partnership,
        owner: &AccountId,
    ) {
        let id = format!("{run_id}:{}", p.id);
        if self.shares.get(&id).is_some() {
            return;
        }
        let reserve = self.business_fund.min(SHARE_CAP);
        self.business_fund -= reserve;
        self.shares.insert(
            &id,
            &BusinessShare {
                run_id: run_id.into(),
                deal: p.id,
                reserve,
                paid: 0,
                pending: 0,
                closed: false,
            },
        );
        self.tokens.internal_mint_with_refund(id.clone(),owner.clone(),Some(TokenMetadata {
            title:Some(format!("{}'s Moonpark concession · day {run_id}",p.owner)),
            description:Some("Transferable rights to this opening day's merchant dividend reward. Testnet NEAR only; no cash value or future-income promise. Park operation stays with its founder. View get_business_share for current accrued rewards and ownership.".into()),
            copies:Some(1),
            extra:Some(serde_json::json!({"run_id":run_id,"merchant":p.owner,"share_percent":p.share_percent,"reward_cap_yocto":reserve.to_string(),"reward_per_credit_yocto":(PER_CENT*100).to_string(),"network":"testnet"}).to_string()),
            ..Default::default()
        }),None);
        near_contract_standards::non_fungible_token::events::NftMint {
            owner_id: owner,
            token_ids: &[&id],
            memo: Some("Merchant concession; storage sponsored by Moonpark"),
        }
        .emit();
        event(
            "concession_issued",
            serde_json::json!({"token_id":id,"owner_id":owner,"merchant":p.owner,"reserved_yocto":reserve.to_string()}),
        );
    }
    pub(crate) fn close_business_reserves(&mut self, run_id: &str, run: &Run) {
        for p in &run.partnerships {
            let id = format!("{run_id}:{}", p.id);
            if let Some(mut s) = self.shares.get(&id) {
                if s.closed {
                    continue;
                }
                let earned = (p.earned.max(0) as u128 * PER_CENT).min(s.reserve);
                self.business_fund += s.reserve - earned;
                s.reserve = earned;
                s.closed = true;
                self.shares.insert(&id, &s);
            }
        }
    }
}
#[near]
impl Moonpark {
    #[payable]
    pub fn fund_storage(&mut self) -> PromiseOrValue<U128> {
        let deposit = env::attached_deposit().as_yoctonear();
        let before = env::account_balance()
            .as_yoctonear()
            .saturating_sub(deposit)
            .saturating_sub(env::storage_usage() as u128 * env::storage_byte_cost().as_yoctonear());
        let target =
            self.business_obligations + self.prize_obligations + 2_000_000_000_000_000_000_000_000;
        let keep = deposit.min(target.saturating_sub(before));
        let refund = deposit - keep;
        if refund > 0 {
            Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(refund))
                .detach();
        }
        event(
            "storage_sponsored",
            serde_json::json!({"retained_yocto":keep.to_string(),"refunded_yocto":refund.to_string()}),
        );
        PromiseOrValue::Value(U128(keep))
    }
    #[payable]
    pub fn fund_business_rewards(&mut self) {
        self.business_fund += env::attached_deposit().as_yoctonear();
        self.business_obligations += env::attached_deposit().as_yoctonear();
        event(
            "business_rewards_funded",
            serde_json::json!({"amount":env::attached_deposit().as_yoctonear().to_string()}),
        );
    }
    pub fn get_business_fund(&self) -> serde_json::Value {
        serde_json::json!({"available_yocto":self.business_fund.to_string(),"cap_per_share_yocto":SHARE_CAP.to_string(),"reward_per_credit_yocto":(PER_CENT*100).to_string(),"currency":"testnet NEAR","cash_value":false})
    }
    pub fn get_fund_safety(&self) -> serde_json::Value {
        let liquid = env::account_balance()
            .as_yoctonear()
            .saturating_sub(env::storage_usage() as u128 * env::storage_byte_cost().as_yoctonear());
        let owed = self.business_obligations + self.prize_obligations;
        serde_json::json!({"liquid_yocto":liquid.to_string(),"business_obligations_yocto":self.business_obligations.to_string(),"prize_obligations_yocto":self.prize_obligations.to_string(),"storage_buffer_yocto":liquid.saturating_sub(owed).to_string(),"solvent":liquid>=owed})
    }
    pub fn get_business_share(&self, token_id: String) -> Option<serde_json::Value> {
        let s = self.shares.get(&token_id)?;
        let record = self.get_run(s.run_id.clone());
        let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        let p = run.partnerships.iter().find(|p| p.id == s.deal).unwrap();
        let earned = (p.earned.max(0) as u128 * PER_CENT).min(s.reserve);
        Some(
            serde_json::json!({"token_id":token_id,"owner_id":self.tokens.owner_by_id.get(&token_id),"merchant":p.owner,"share_percent":p.share_percent,"earned_credits_cents":p.earned,"earned_yocto":earned.to_string(),"claimable_yocto":earned.saturating_sub(s.paid+s.pending).to_string(),"paid_yocto":s.paid.to_string(),"pending_yocto":s.pending.to_string(),"reserved_yocto":s.reserve.to_string(),"closed":s.closed,"transfer_pending":self.transfer_locks.get(&token_id).unwrap_or(false),"currency":"testnet NEAR"}),
        )
    }
    pub fn get_concessions(&self, run_id: String) -> Vec<serde_json::Value> {
        (1..=3)
            .filter_map(|n| self.get_business_share(format!("{run_id}:{n}")))
            .collect()
    }
    pub fn get_merchant_wallets(&self, run_id: String) -> serde_json::Value {
        let record = self.get_run(run_id.clone());
        let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        let wallets:Vec<_>=run.buildings.iter().filter(|b|moonpark_sim::catalog::tenant(&b.kind)).map(|b|{
            serde_json::json!({"id":format!("{run_id}:business:{}",b.id),"kind":b.kind,"cash_credits_cents":b.cash,"stock":b.stock,"incoming_stock":b.delivery_qty,"price_credits_cents":b.price,"revenue_share_percent":b.rent,"reason":b.reason,"insolvent":b.insolvent,"custody":"contract-managed"})
        }).collect();
        serde_json::json!({"run_id":run_id,"wallets":wallets,"currency":"lunar game credits","independent_access_keys":false})
    }
    pub fn claim_business_reward(&mut self, token_id: String) -> Promise {
        assert!(
            !self.transfer_locks.get(&token_id).unwrap_or(false),
            "Finish the ownership transfer first"
        );
        let owner = self
            .tokens
            .owner_by_id
            .get(&token_id)
            .expect("Concession not found");
        assert_eq!(
            env::predecessor_account_id(),
            owner,
            "Concession owner only"
        );
        let mut s = self.shares.get(&token_id).expect("Concession not found");
        assert_eq!(s.pending, 0, "Reward transfer already pending");
        let v = self.get_business_share(token_id.clone()).unwrap();
        let amount: u128 = v["claimable_yocto"].as_str().unwrap().parse().unwrap();
        assert!(amount > 0, "No reward to collect yet");
        s.pending = amount;
        self.shares.insert(&token_id, &s);
        Promise::new(owner.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(callback(
                "on_business_reward",
                serde_json::json!({"token_id":token_id,"recipient":owner,"amount":U128(amount)}),
            ))
    }
    #[private]
    pub fn on_business_reward(
        &mut self,
        token_id: String,
        recipient: AccountId,
        amount: U128,
    ) -> bool {
        let mut s = self.shares.get(&token_id).expect("Concession not found");
        assert_eq!(s.pending, amount.0, "Reward receipt mismatch");
        let ok = paid_ok();
        s.pending = 0;
        if ok {
            s.paid += amount.0;
            self.business_obligations -= amount.0;
        }
        self.shares.insert(&token_id, &s);
        event(
            if ok {
                "business_reward_paid"
            } else {
                "business_reward_retryable"
            },
            serde_json::json!({"token_id":token_id,"recipient":recipient,"amount":amount}),
        );
        ok
    }
    #[payable]
    pub fn fund_prizes(&mut self) {
        assert_eq!(self.prize_tier, "pending", "Prizes already allocated");
        self.prize_fund += env::attached_deposit().as_yoctonear();
        self.prize_obligations += env::attached_deposit().as_yoctonear();
        event(
            "prize_funded",
            serde_json::json!({"amount":env::attached_deposit().as_yoctonear().to_string(),"currency":"testnet NEAR"}),
        );
    }
    pub fn activate_prizes(&mut self, tier: String) {
        assert_eq!(env::predecessor_account_id(), self.sponsor, "Sponsor only");
        assert!(
            env::block_timestamp() > CUTOFF,
            "Standings are not frozen yet"
        );
        assert_eq!(self.prize_tier, "pending", "Prizes already allocated");
        assert!(tier == "track" || tier == "grand", "Invalid award tier");
        assert!(self.prize_fund > 0, "Fund the escrow first");
        assert!(!self.prize_top.is_empty(), "No eligible winners");
        let winners: Vec<Entry> = self
            .prize_top
            .iter()
            .take(4)
            .map(|id| serde_json::from_str(&self.prize_best.get(id).unwrap()).unwrap())
            .collect();
        let weights = [40u128, 30, 20, 10];
        let sum: u128 = weights[..winners.len()].iter().sum();
        let mut left = self.prize_fund;
        for (i, e) in winners.iter().enumerate() {
            let amount = if i == winners.len() - 1 {
                left
            } else {
                self.prize_fund * weights[i] / sum
            };
            left -= amount;
            self.prize_claims.insert(
                &e.owner,
                &PrizeClaim {
                    amount,
                    paid: 0,
                    pending: 0,
                },
            );
        }
        self.prize_tier = tier;
        event(
            "prizes_allocated",
            serde_json::json!({"tier":self.prize_tier,"funded_yocto":self.prize_fund.to_string(),"winners":winners}),
        );
    }
    pub fn get_prize_claim(&self, account_id: AccountId) -> serde_json::Value {
        let c = self.prize_claims.get(&account_id).unwrap_or_default();
        serde_json::json!({"account_id":account_id,"allocated_yocto":c.amount.to_string(),"claimable_yocto":c.amount.saturating_sub(c.paid+c.pending).to_string(),"paid_yocto":c.paid.to_string(),"pending_yocto":c.pending.to_string(),"tier":self.prize_tier,"currency":"testnet NEAR"})
    }
    pub fn claim_prize(&mut self) -> Promise {
        let owner = env::predecessor_account_id();
        let mut c = self
            .prize_claims
            .get(&owner)
            .expect("No prize allocated to this account");
        assert_eq!(c.pending, 0, "Prize transfer already pending");
        let amount = c.amount.saturating_sub(c.paid);
        assert!(amount > 0, "Prize already collected");
        c.pending = amount;
        self.prize_claims.insert(&owner, &c);
        Promise::new(owner.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(callback(
                "on_prize_paid",
                serde_json::json!({"owner":owner,"amount":U128(amount)}),
            ))
    }
    #[private]
    pub fn on_prize_paid(&mut self, owner: AccountId, amount: U128) -> bool {
        let mut c = self.prize_claims.get(&owner).expect("Prize not found");
        assert_eq!(c.pending, amount.0, "Prize receipt mismatch");
        let ok = paid_ok();
        c.pending = 0;
        if ok {
            c.paid += amount.0;
            self.prize_obligations -= amount.0;
        }
        self.prize_claims.insert(&owner, &c);
        event(
            if ok { "prize_paid" } else { "prize_retryable" },
            serde_json::json!({"owner":owner,"amount":amount}),
        );
        ok
    }
}
#[near]
impl NonFungibleTokenCore for Moonpark {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        assert!(
            !self.transfer_locks.get(&token_id).unwrap_or(false),
            "Ownership transfer pending"
        );
        self.tokens
            .nft_transfer(receiver_id, token_id, approval_id, memo)
    }
    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        assert!(
            !self.transfer_locks.get(&token_id).unwrap_or(false),
            "Ownership transfer pending"
        );
        self.transfer_locks.insert(&token_id, &true);
        self.tokens
            .nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }
    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}
#[near]
impl NonFungibleTokenResolver for Moonpark {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        let result = self.tokens.nft_resolve_transfer(
            previous_owner_id,
            receiver_id,
            token_id.clone(),
            approved_account_ids,
        );
        self.transfer_locks.remove(&token_id);
        result
    }
}
#[near]
impl NonFungibleTokenEnumeration for Moonpark {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }
    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }
    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }
    fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        self.tokens
            .nft_tokens_for_owner(account_id, from_index, limit)
    }
}
#[near]
impl NonFungibleTokenMetadataProvider for Moonpark {
    fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: "nft-1.0.0".into(),
            name: "Moonpark business concessions".into(),
            symbol: "MOON".into(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }
}
#[near]
impl NonFungibleTokenApproval for Moonpark {
    #[payable]
    fn nft_approve(
        &mut self,
        token_id: TokenId,
        account_id: AccountId,
        msg: Option<String>,
    ) -> Option<Promise> {
        self.tokens.nft_approve(token_id, account_id, msg)
    }
    #[payable]
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens.nft_revoke(token_id, account_id)
    }
    #[payable]
    fn nft_revoke_all(&mut self, token_id: TokenId) {
        self.tokens.nft_revoke_all(token_id)
    }
    fn nft_is_approved(
        &self,
        token_id: TokenId,
        approved_account_id: AccountId,
        approval_id: Option<u64>,
    ) -> bool {
        self.tokens
            .nft_is_approved(token_id, approved_account_id, approval_id)
    }
}
