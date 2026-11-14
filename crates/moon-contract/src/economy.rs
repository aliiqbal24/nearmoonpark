//! Finite opening-day assets, held by real NEAR accounts under a signed NPC policy.
//! The game and its clearing ledger commit atomically. No purchase depends on an
//! asynchronous vendor transaction or a server-held trading key.
use super::*;
use near_sdk::{assert_one_yocto, json_types::U128, Gas, NearToken, Promise};

pub const VENDORS: [&str; 3] = ["omar", "mina", "logistics"];
pub const ASSETS: [&str; 4] = ["credits", "food", "drink", "parts"];
const POLICY: &str = "moonpark-v9-persistent-vendors-1";
const SLOT_BYTES: u128 = 240;
type Holdings = [[u128; 4]; 5];

fn asset_id(run_id: &str, asset: usize) -> String {
    format!("{run_id}:{}", ASSETS[asset])
}
fn balance_key(account_id: &AccountId, token_id: &str) -> String {
    format!("{token_id}|{account_id}")
}
fn mt_event(event: &str, data: Vec<serde_json::Value>) {
    if !data.is_empty() {
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({
                "standard":"nep245", "version":"1.0.0", "event":event, "data":data
            })
        ));
    }
}
fn units(value: i64) -> u128 {
    value.try_into().expect("Negative economic balance")
}
fn holdings(run: &Run) -> Holdings {
    let mut h = [[0; 4]; 5];
    h[0][0] = units(run.cash);
    h[1][0] =
        units(run.guests.iter().map(|g| g.cash).sum::<i64>() + run.grant_cash + run.grant_escrow);
    h[4][0] = units(run.supplier_cash + run.builder_cash);
    for (i, stock) in run.supplies.iter().enumerate() {
        h[4][i + 1] = *stock as u128;
    }
    for b in &run.buildings {
        let owner = match b.kind.as_str() {
            "food" => 2,
            "drink" => 3,
            _ => {
                assert_eq!(b.cash, 0, "Park facilities have no merchant treasury");
                continue;
            }
        };
        h[owner][0] += units(b.cash);
        // Paid-for stock belongs to the vendor while the rover is in transit.
        h[owner][owner - 1] += b.stock as u128 + b.delivery_qty as u128;
    }
    assert_eq!(
        h.iter().map(|row| row[0]).sum::<u128>(),
        units(run.money_supply),
        "Credit conservation"
    );
    for asset in 1..4 {
        assert_eq!(
            h.iter().map(|row| row[asset]).sum::<u128>() + run.consumed[asset - 1] as u128,
            run.issued_goods[asset - 1] as u128,
            "Inventory conservation"
        );
    }
    h
}

impl Moonpark {
    pub(crate) fn rebind_economy(&mut self, run_id: &str, previous: &AccountId, next: &AccountId) {
        if previous == next {
            return;
        }
        for asset in 0..4 {
            let token = asset_id(run_id, asset);
            let from = balance_key(previous, &token);
            let to = balance_key(next, &token);
            assert_eq!(
                self.asset_balances.get(&to).unwrap_or(0),
                0,
                "New operator already holds these assets"
            );
            let amount = self.asset_balances.remove(&from).unwrap_or(0);
            self.asset_balances.insert(&to, &amount);
            if amount > 0 {
                mt_event(
                    "mt_transfer",
                    vec![
                        serde_json::json!({"old_owner_id":previous,"new_owner_id":next,"token_ids":[token],"amounts":[amount.to_string()],"memo":"Park owner authorized operator handoff"}),
                    ],
                );
            }
        }
    }
    pub(crate) fn vendor_id(&self, vendor: &str) -> AccountId {
        format!(
            "{}.{}",
            match vendor {
                "omar" => "illia",
                "mina" => "mert",
                role => role,
            },
            self.sponsor
        )
        .parse()
        .expect("Invalid vendor account")
    }
    fn economy_accounts(&self, owner: &AccountId) -> [AccountId; 5] {
        [
            owner.clone(),
            env::current_account_id(),
            self.vendor_id("omar"),
            self.vendor_id("mina"),
            self.vendor_id("logistics"),
        ]
    }
    pub(crate) fn open_economy(&mut self, run_id: &str, owner: &AccountId, run: &Run) {
        for vendor in VENDORS {
            assert!(
                self.vendor_consents
                    .get(&self.vendor_id(vendor))
                    .unwrap_or(false),
                "Vendor policy is awaiting its account's signature"
            );
        }
        let accounts = self.economy_accounts(owner);
        assert!(
            (0..accounts.len()).all(|i| !accounts[..i].contains(&accounts[i])),
            "Use a dedicated park account"
        );
        let h = holdings(run);
        let mut mints = vec![];
        for asset in 0..4 {
            let token_id = asset_id(run_id, asset);
            assert!(
                self.asset_supplies.get(&token_id).is_none(),
                "Economy already initialized"
            );
            self.asset_supplies
                .insert(&token_id, &h.iter().map(|r| r[asset]).sum());
            for (i, account_id) in accounts.iter().enumerate() {
                self.asset_balances
                    .insert(&balance_key(account_id, &token_id), &h[i][asset]);
                if h[i][asset] > 0 {
                    mints.push(serde_json::json!({"owner_id":account_id,"token_ids":[token_id],"amounts":[h[i][asset].to_string()],"memo":"Fixed opening-day allocation"}));
                }
            }
        }
        mt_event("mt_mint", mints);
    }
    pub(crate) fn clear_economy(
        &mut self,
        run_id: &str,
        owner: &AccountId,
        before: &Run,
        after: &Run,
    ) {
        let accounts = self.economy_accounts(owner);
        let old = holdings(before);
        let mut funded = old;
        let mut mints = vec![];
        for asset in 0..4 {
            let issued = if asset == 0 {
                units(after.money_supply - before.money_supply)
            } else {
                (after.issued_goods[asset - 1] - before.issued_goods[asset - 1]) as u128
            };
            let owner = if asset == 0 { 1 } else { 4 };
            funded[owner][asset] += issued;
            if issued > 0 {
                mints.push(serde_json::json!({"owner_id":accounts[owner],"token_ids":[asset_id(run_id, asset)],"amounts":[issued.to_string()],"memo":"Scheduled returning-tourist credits and logistics shipment. No cash value."}));
            }
        }
        let next = holdings(after);
        let mut transfers = vec![];
        let mut burns = vec![];
        for asset in 0..4 {
            let token_id = asset_id(run_id, asset);
            let mut debit = [0u128; 5];
            let mut credit = [0u128; 5];
            for i in 0..5 {
                assert_eq!(
                    self.mt_balance_of(accounts[i].clone(), token_id.clone()).0,
                    old[i][asset],
                    "Asset ledger disagrees with game state"
                );
                debit[i] = funded[i][asset].saturating_sub(next[i][asset]);
                credit[i] = next[i][asset].saturating_sub(funded[i][asset]);
            }
            // A batch clears its net obligations. Individual purchases remain in
            // the canonical game's readable trade journal.
            for from in 0..5 {
                for to in 0..5 {
                    let amount = debit[from].min(credit[to]);
                    if amount == 0 {
                        continue;
                    }
                    debit[from] -= amount;
                    credit[to] -= amount;
                    transfers.push(serde_json::json!({"authorized_id":env::current_account_id(),"old_owner_id":accounts[from],"new_owner_id":accounts[to],"token_ids":[token_id],"amounts":[amount.to_string()],"memo":format!("Opening day {run_id} · clearing revision {}", after.revision)}));
                }
                if debit[from] > 0 {
                    assert_ne!(asset, 0, "Credits cannot be destroyed");
                    burns.push(serde_json::json!({"owner_id":accounts[from],"authorized_id":env::current_account_id(),"token_ids":[token_id],"amounts":[debit[from].to_string()],"memo":"Consumed by park visitors or maintenance"}));
                }
            }
            assert!(credit.iter().all(|n| *n == 0), "Unfunded asset credit");
            let supply: u128 = next.iter().map(|r| r[asset]).sum();
            assert!(
                supply <= funded.iter().map(|r| r[asset]).sum(),
                "Unexpected mint"
            );
            self.asset_supplies.insert(&token_id, &supply);
            for i in 0..5 {
                self.asset_balances
                    .insert(&balance_key(&accounts[i], &token_id), &next[i][asset]);
            }
        }
        mt_event("mt_mint", mints);
        mt_event("mt_transfer", transfers);
        mt_event("mt_burn", burns);
    }
    fn assert_asset_unlocked(&self, token_id: &str) {
        assert!(
            self.asset_supplies.get(&token_id.to_string()).is_some(),
            "Unknown asset"
        );
        let run_id = token_id.split_once(':').expect("Invalid asset").0;
        let _ = run_id;
        env::panic_str(
            "Park assets are committed to the operating park and its signed vendor policy",
        );
    }
    fn move_assets(
        &mut self,
        sender: &AccountId,
        receiver: &AccountId,
        token_ids: &[String],
        amounts: &[U128],
        memo: Option<String>,
    ) {
        assert_ne!(sender, receiver, "Choose another recipient");
        assert!(
            !token_ids.is_empty() && token_ids.len() <= 16 && token_ids.len() == amounts.len(),
            "Invalid asset batch"
        );
        assert!(
            memo.as_ref().map(|s| s.len() <= 256).unwrap_or(true),
            "Memo too long"
        );
        for (i, token_id) in token_ids.iter().enumerate() {
            assert!(!token_ids[..i].contains(token_id), "Duplicate asset");
            self.assert_asset_unlocked(token_id);
            assert!(amounts[i].0 > 0, "Transfer a positive amount");
            assert!(
                self.asset_balances
                    .get(&balance_key(receiver, token_id))
                    .is_some(),
                "Recipient must register storage for this asset"
            );
            assert!(
                self.mt_balance_of(sender.clone(), token_id.clone()).0 >= amounts[i].0,
                "Insufficient assets"
            );
        }
        for (token_id, amount) in token_ids.iter().zip(amounts) {
            let from = balance_key(sender, token_id);
            let to = balance_key(receiver, token_id);
            self.asset_balances
                .insert(&from, &(self.asset_balances.get(&from).unwrap() - amount.0));
            self.asset_balances.insert(
                &to,
                &self
                    .asset_balances
                    .get(&to)
                    .unwrap()
                    .checked_add(amount.0)
                    .expect("Balance overflow"),
            );
        }
        mt_event(
            "mt_transfer",
            vec![
                serde_json::json!({"old_owner_id":sender,"new_owner_id":receiver,"token_ids":token_ids,"amounts":amounts,"memo":memo}),
            ],
        );
    }
    fn transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        assert_one_yocto();
        assert!(msg.len() <= 4096, "Message too long");
        let gas = env::prepaid_gas()
            .as_gas()
            .saturating_sub(env::used_gas().as_gas());
        assert!(
            gas >= Gas::from_tgas(45).as_gas(),
            "Attach at least 45 TGas remaining"
        );
        let sender = env::predecessor_account_id();
        self.move_assets(&sender, &receiver_id, &token_ids, &amounts, memo);
        let gas = env::prepaid_gas()
            .as_gas()
            .saturating_sub(env::used_gas().as_gas());
        assert!(
            gas >= Gas::from_tgas(50).as_gas(),
            "Insufficient receiver gas"
        );
        Promise::new(receiver_id.clone()).function_call(
            "mt_on_transfer", serde_json::json!({"sender_id":sender,"previous_owner_ids":vec![sender.clone();token_ids.len()],"token_ids":token_ids,"amounts":amounts,"msg":msg}).to_string().into_bytes(),
            NearToken::from_yoctonear(0), Gas::from_gas(gas - Gas::from_tgas(40).as_gas()),
        ).then(Promise::new(env::current_account_id()).function_call(
            "mt_resolve_transfer", serde_json::json!({"sender_id":sender,"receiver_id":receiver_id,"token_ids":token_ids,"amounts":amounts}).to_string().into_bytes(),
            NearToken::from_yoctonear(0), Gas::from_tgas(20),
        ))
    }
}

#[near]
impl Moonpark {
    /// Each separately keyed vendor signs this once. Its authority is confined
    /// to finite game assets and this immutable, deterministic opening-day policy.
    pub fn accept_vendor_policy(&mut self, policy_id: String) {
        assert_eq!(policy_id, POLICY, "Read and accept the published policy");
        let caller = env::predecessor_account_id();
        assert!(
            VENDORS.iter().any(|v| self.vendor_id(v) == caller),
            "Vendor account only"
        );
        self.vendor_consents.insert(&caller, &true);
        self.assert_collateral();
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({"standard":"moonpark","version":"5.0.0","event":"vendor_policy_accepted","data":[{"account_id":caller,"policy_id":POLICY}]})
        ));
    }
    pub fn get_vendor_policy(&self) -> serde_json::Value {
        serde_json::json!({"policy_id":POLICY,"ruleset":VERSION,"network":"testnet","rent_percent":moonpark_sim::catalog::VENDOR_RENT,"automatic_pricing":true,"automatic_restocking":true,"idle_overhead_cents":0,"sale_overhead_cents":moonpark_sim::catalog::SHOP_OVERHEAD,"repair_fee_cents":moonpark_sim::catalog::REPAIR_FEE,"settlement":"atomic_net_clearing","guest_wallet":"passenger_escrow","cash_value":false,"tourist_issuance":"fixed_wallet_per_returning_guest_after_scoring","supply_shipments":"1024_units_when_stock_below_128","vendors":VENDORS.iter().map(|v|serde_json::json!({"role":v,"account_id":self.vendor_id(v),"accepted":self.vendor_consents.get(&self.vendor_id(v)).unwrap_or(false)})).collect::<Vec<_>>()})
    }
    pub fn get_run_economy(&self, run_id: String) -> serde_json::Value {
        let record = self.get_run(run_id.clone());
        let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        let owner: AccountId = record["owner"].as_str().unwrap().parse().unwrap();
        let token_ids: Vec<_> = (0..4).map(|a| asset_id(&run_id, a)).collect();
        let accounts = self.economy_accounts(&owner);
        serde_json::json!({"run_id":run_id,"revision":run.revision,"tick":run.tick,"policy_id":POLICY,"token_ids":token_ids,"supplies":self.mt_batch_supply(token_ids.clone()),"locked":true,"cash_value":false,"wallets":accounts.iter().enumerate().map(|(i,a)|serde_json::json!({"role":(["park","passengers","omar","mina","logistics"][i]),"account_id":a,"balances":self.mt_batch_balance_of(a.clone(),token_ids.clone())})).collect::<Vec<_>>()})
    }
    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        U128(
            self.asset_balances
                .get(&balance_key(&account_id, &token_id))
                .unwrap_or(0),
        )
    }
    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        assert!(token_ids.len() <= 64, "Too many assets");
        token_ids
            .into_iter()
            .map(|id| self.mt_balance_of(account_id.clone(), id))
            .collect()
    }
    pub fn mt_supply(&self, token_id: String) -> Option<U128> {
        self.asset_supplies.get(&token_id).map(U128)
    }
    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<U128>> {
        assert!(token_ids.len() <= 64, "Too many assets");
        token_ids.into_iter().map(|id| self.mt_supply(id)).collect()
    }
    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<serde_json::Value>> {
        assert!(token_ids.len() <= 64, "Too many assets");
        token_ids.into_iter().map(|id| self.mt_supply(id.clone()).map(|s|serde_json::json!({"token_id":id,"owner_id":null,"total_supply":s,"decimals":if id.ends_with(":credits"){2}else{0},"name":id.split_once(':').unwrap().1,"cash_value":false}))).collect()
    }
    /// Ordinary play sponsors its known participants. Additional recipients pay
    /// for their own bounded balance slot before receiving closing-day assets.
    #[payable]
    pub fn register_asset_storage(&mut self, token_id: String, account_id: Option<AccountId>) {
        assert!(
            self.asset_supplies.get(&token_id).is_some(),
            "Unknown asset"
        );
        let account = account_id.unwrap_or_else(env::predecessor_account_id);
        let key = balance_key(&account, &token_id);
        let cost = if self.asset_balances.get(&key).is_some() {
            0
        } else {
            SLOT_BYTES * env::storage_byte_cost().as_yoctonear()
        };
        let deposit = env::attached_deposit().as_yoctonear();
        assert!(deposit >= cost, "Attach storage cost for one balance slot");
        if cost > 0 {
            self.asset_balances.insert(&key, &0);
        }
        if deposit > cost {
            Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(deposit - cost))
                .detach();
        }
        self.assert_collateral();
    }
    #[payable]
    pub fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
    ) {
        assert_one_yocto();
        assert!(approval.is_none(), "Approval extension is not enabled");
        self.move_assets(
            &env::predecessor_account_id(),
            &receiver_id,
            &[token_id],
            &[amount],
            memo,
        );
    }
    #[payable]
    pub fn mt_batch_transfer(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<(AccountId, u64)>>>,
        memo: Option<String>,
    ) {
        assert_one_yocto();
        assert!(approvals.is_none(), "Approval extension is not enabled");
        self.move_assets(
            &env::predecessor_account_id(),
            &receiver_id,
            &token_ids,
            &amounts,
            memo,
        );
    }
    #[payable]
    pub fn mt_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        assert!(approval.is_none(), "Approval extension is not enabled");
        self.transfer_call(receiver_id, vec![token_id], vec![amount], memo, msg)
    }
    #[payable]
    pub fn mt_batch_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
        approvals: Option<Vec<Option<(AccountId, u64)>>>,
        memo: Option<String>,
        msg: String,
    ) -> Promise {
        assert!(approvals.is_none(), "Approval extension is not enabled");
        self.transfer_call(receiver_id, token_ids, amounts, memo, msg)
    }
    #[private]
    pub fn mt_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        token_ids: Vec<String>,
        amounts: Vec<U128>,
    ) -> Vec<U128> {
        assert_eq!(
            env::promise_results_count(),
            1,
            "Expected one receiver result"
        );
        let unused = env::promise_result_checked(0, 4096)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Vec<U128>>(&bytes).ok())
            .filter(|v| v.len() == amounts.len())
            .unwrap_or_else(|| amounts.clone());
        let mut spent = vec![];
        let mut refunds = vec![];
        for (i, token_id) in token_ids.iter().enumerate() {
            let to = balance_key(&receiver_id, token_id);
            let from = balance_key(&sender_id, token_id);
            let balance = self.asset_balances.get(&to).unwrap_or(0);
            let refund = unused[i].0.min(amounts[i].0).min(balance);
            if refund > 0 {
                self.asset_balances.insert(&to, &(balance - refund));
                self.asset_balances.insert(
                    &from,
                    &self
                        .asset_balances
                        .get(&from)
                        .unwrap_or(0)
                        .checked_add(refund)
                        .expect("Balance overflow"),
                );
                refunds.push(serde_json::json!({"old_owner_id":receiver_id,"new_owner_id":sender_id,"token_ids":[token_id],"amounts":[refund.to_string()],"memo":"Unused asset refund"}));
            }
            spent.push(U128(amounts[i].0 - refund));
        }
        mt_event("mt_transfer", refunds);
        spent
    }
}
