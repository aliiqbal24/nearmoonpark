//! Persistent parks and immutable, deposit-backed ride licenses.
use super::*;
use moonpark_sim::Design;
use near_sdk::{json_types::U128, Gas, NearToken, Promise};

pub const LICENSE_FEE: u128 = 5_000_000_000_000_000_000_000; // 0.005 testnet NEAR
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Park {
    pub id: String,
    pub owner: AccountId,
    pub operator: AccountId,
    pub pending_owner: Option<AccountId>,
    pub name: String,
    pub emblem: u8,
    pub revision: u32,
    pub run_id: Option<String>,
    pub blueprint_ids: Vec<String>,
    pub rating_sum: u32,
    pub rating_count: u32,
    pub license_count: u32,
}
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct RideBlueprint {
    pub id: String,
    pub park_id: String,
    pub creator: AccountId,
    pub name: String,
    pub kind: String,
    pub variant: u8,
    pub launch: u8,
    pub design: Design,
    pub source_run: String,
    pub source_building: u32,
    pub licenses: u32,
}
#[near(serializers = [borsh])]
#[derive(Default)]
pub struct Earnings {
    pub available: u128,
    pub pending: u128,
    pub paid: u128,
}
fn emit(name: &str, data: serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        serde_json::json!({
            "standard":"moonpark", "version":"4.0.0", "event":name, "data":[data]
        })
    ));
}
fn valid_name(name: &str) {
    assert!(
        !name.trim().is_empty()
            && name.chars().count() <= 28
            && !name.chars().any(char::is_control),
        "Use a name of 1–28 characters"
    );
}
impl Moonpark {
    pub(crate) fn ensure_park(&mut self, operator: &AccountId) -> String {
        if let Some(id) = self.park_operators.get(operator) {
            return id;
        }
        assert!(
            self.park_owners.get(operator).is_none(),
            "Your park needs an authorized operator"
        );
        assert!(self.parks.len() < 10_000, "Park registry is full");
        self.next_park += 1;
        let id = self.next_park.to_string();
        let park = Park {
            id: id.clone(),
            owner: operator.clone(),
            operator: operator.clone(),
            pending_owner: None,
            name: "My Moonpark".into(),
            emblem: 0,
            revision: 0,
            run_id: None,
            blueprint_ids: vec![],
            rating_sum: 0,
            rating_count: 0,
            license_count: 0,
        };
        self.parks.insert(&id, &park);
        self.park_operators.insert(operator, &id);
        self.park_owners.insert(operator, &id);
        emit(
            "park_created",
            serde_json::json!({"park_id":id,"owner":operator}),
        );
        id
    }
    fn editable_park(&self, id: &str) -> Park {
        let p = self.parks.get(&id.to_string()).expect("Park not found");
        let caller = env::predecessor_account_id();
        assert!(
            caller == p.owner || caller == p.operator,
            "Park owner or authorized operator only"
        );
        p
    }
    pub(crate) fn validate_licenses(&self, operator: &AccountId, commands: &[Command]) {
        for c in commands {
            if let Some(id) = &c.blueprint_id {
                assert_eq!(c.kind, "build", "License is only used when building");
                let p = self.park_operators.get(operator).expect("Park not found");
                let b = self.blueprints.get(id).expect("Blueprint not found");
                assert!(
                    b.park_id == p || self.licenses.get(&format!("{p}:{id}")).unwrap_or(false),
                    "License this design first"
                );
                assert!(
                    c.item == b.kind
                        && c.variant == b.variant
                        && c.value == b.launch as i64
                        && c.design.as_ref() == Some(&b.design),
                    "Licensed design does not match the published blueprint"
                );
            }
        }
    }
}
#[near]
impl Moonpark {
    pub fn get_park(&self, park_id: String) -> Option<Park> {
        self.parks.get(&park_id)
    }
    pub fn get_park_by_owner(&self, account_id: AccountId) -> Option<Park> {
        self.park_owners
            .get(&account_id)
            .and_then(|id| self.parks.get(&id))
    }
    pub fn get_park_by_operator(&self, account_id: AccountId) -> Option<Park> {
        self.park_operators
            .get(&account_id)
            .and_then(|id| self.parks.get(&id))
    }
    pub fn list_parks(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Park> {
        self.parks
            .iter()
            .map(|(_, p)| p)
            .filter(|p| p.run_id.is_some())
            .skip(from_index.unwrap_or(0) as usize)
            .take(limit.unwrap_or(12).min(24) as usize)
            .collect()
    }
    pub fn save_park(
        &mut self,
        park_id: String,
        expected_revision: u32,
        name: String,
        emblem: u8,
        run_id: Option<String>,
    ) -> Park {
        let mut p = self.editable_park(&park_id);
        assert_eq!(
            p.revision, expected_revision,
            "Park changed. Refresh and try again"
        );
        valid_name(&name);
        assert!(emblem <= 2, "Invalid emblem");
        if let Some(id) = run_id {
            let record = self.get_run(id.clone());
            assert_eq!(
                record["park_id"].as_str(),
                Some(p.id.as_str()),
                "This opening day belongs to another park"
            );
            let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
            assert!(
                run.finished,
                "Finish and confirm opening day before publishing"
            );
            p.run_id = Some(id);
        }
        p.name = name.trim().into();
        p.emblem = emblem;
        p.revision += 1;
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        emit("park_published", serde_json::to_value(&p).unwrap());
        p
    }
    // A nomination never transfers ownership. The recipient must sign acceptance.
    pub fn nominate_park_owner(&mut self, park_id: String, receiver_id: Option<AccountId>) -> Park {
        let mut p = self.editable_park(&park_id);
        // The first claim may be initiated by its generated owner/operator.
        assert_eq!(env::predecessor_account_id(), p.owner, "Current owner only");
        if let Some(receiver) = &receiver_id {
            assert!(
                self.park_owners.get(receiver).is_none(),
                "This account already owns a park"
            );
            assert_ne!(receiver, &p.owner, "Already the owner");
        }
        p.pending_owner = receiver_id;
        p.revision += 1;
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        p
    }
    pub fn accept_park(&mut self, park_id: String) -> Park {
        let mut p = self.parks.get(&park_id).expect("Park not found");
        let owner = env::predecessor_account_id();
        // Idempotent callback/reload handling.
        if p.owner == owner && p.pending_owner.is_none() {
            return p;
        }
        assert_eq!(
            p.pending_owner.as_ref(),
            Some(&owner),
            "Sign with the nominated NEAR account"
        );
        assert!(
            self.park_owners.get(&owner).is_none(),
            "This account already owns a park"
        );
        self.park_owners.remove(&p.owner);
        p.owner = owner.clone();
        p.pending_owner = None;
        p.revision += 1;
        self.park_owners.insert(&owner, &park_id);
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        emit(
            "park_claimed",
            serde_json::json!({"park_id":park_id,"owner":owner,"operator":p.operator}),
        );
        p
    }
    pub fn set_park_operator(&mut self, park_id: String, operator: AccountId) -> Park {
        let mut p = self.parks.get(&park_id).expect("Park not found");
        assert_eq!(env::predecessor_account_id(), p.owner, "Park owner only");
        assert!(
            self.players.get(&operator).is_some(),
            "Start a sponsored session first"
        );
        if operator == p.operator {
            return p;
        }
        // A newly provisioned account may have an unpublished starter park.
        if let Some(id) = self.park_operators.get(&operator) {
            let starter = self.parks.get(&id).unwrap();
            assert!(
                starter.owner == operator
                    && starter.run_id.is_none()
                    && starter.blueprint_ids.is_empty()
                    && starter.license_count == 0,
                "Operator already manages a published park"
            );
            self.park_owners.remove(&operator);
            self.parks.remove(&id);
        }
        self.park_operators.remove(&p.operator);
        p.operator = operator.clone();
        p.revision += 1;
        self.park_operators.insert(&operator, &park_id);
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        p
    }
    // Allows a funded session to replace its depleted sponsored account. Wallet owners can revoke this operator.
    pub fn rotate_park_operator(&mut self, park_id: String, operator: AccountId) -> Park {
        let mut p = self.parks.get(&park_id).expect("Park not found");
        assert_eq!(
            env::predecessor_account_id(),
            p.operator,
            "Authorized game account only"
        );
        if operator == p.operator {
            return p;
        }
        assert!(
            self.park_operators.get(&operator).is_none(),
            "New operator already manages a park"
        );
        let old: serde_json::Value =
            serde_json::from_str(&self.players.get(&p.operator).unwrap()).unwrap();
        let new: serde_json::Value =
            serde_json::from_str(&self.players.get(&operator).expect("Account not admitted"))
                .unwrap();
        assert!(
            old["player_id"] == new["player_id"]
                || (old["player_id"].as_str().unwrap().starts_with("guest:")
                    && new["player_id"].as_str().unwrap().starts_with("guest:")),
            "Session identity mismatch"
        );
        self.park_operators.remove(&p.operator);
        p.operator = operator.clone();
        p.revision += 1;
        self.park_operators.insert(&operator, &park_id);
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        p
    }
    pub fn publish_blueprint(
        &mut self,
        park_id: String,
        run_id: String,
        building_id: u32,
        name: String,
    ) -> RideBlueprint {
        let mut p = self.editable_park(&park_id);
        valid_name(&name);
        let id = format!("{run_id}:{building_id}");
        if let Some(b) = self.blueprints.get(&id) {
            assert_eq!(b.park_id, park_id, "Creator mismatch");
            return b;
        }
        assert!(
            p.blueprint_ids.len() < 5 && self.blueprints.len() < 10_000,
            "Blueprint publication limit reached"
        );
        let record = self.get_run(run_id.clone());
        assert_eq!(
            record["park_id"].as_str(),
            Some(p.id.as_str()),
            "This opening day belongs to another park"
        );
        let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        assert!(run.finished, "Finish and confirm opening day first");
        let b = run
            .buildings
            .iter()
            .find(|b| b.id == building_id && !b.sold && moonpark_sim::catalog::ride(&b.kind))
            .expect("Ride not found");
        assert!(
            b.blueprint_id.is_none(),
            "Credit the original creator by using their blueprint"
        );
        assert!(
            b.served > 0,
            "Test your signature ride with guests before publishing"
        );
        let mut design = b.design.clone();
        if design.palette == 255 {
            design.palette = run.palette;
        }
        let bp = RideBlueprint {
            id: id.clone(),
            park_id: park_id.clone(),
            creator: p.owner.clone(),
            name: name.trim().into(),
            kind: b.kind.clone(),
            variant: b.variant,
            launch: b.launch,
            design,
            source_run: run_id,
            source_building: building_id,
            licenses: 0,
        };
        self.blueprints.insert(&id, &bp);
        p.blueprint_ids.push(id);
        p.revision += 1;
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        emit("blueprint_published", serde_json::to_value(&bp).unwrap());
        bp
    }
    pub fn get_blueprint(&self, blueprint_id: String) -> Option<RideBlueprint> {
        self.blueprints.get(&blueprint_id)
    }
    pub fn list_blueprints(
        &self,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<RideBlueprint> {
        self.blueprints
            .iter()
            .skip(from_index.unwrap_or(0) as usize)
            .take(limit.unwrap_or(12).min(24) as usize)
            .map(|(_, b)| b)
            .collect()
    }
    pub fn has_license(&self, park_id: String, blueprint_id: String) -> bool {
        self.licenses
            .get(&format!("{park_id}:{blueprint_id}"))
            .unwrap_or(false)
    }
    #[payable]
    pub fn license_blueprint(&mut self, park_id: String, blueprint_id: String) -> bool {
        let mut p = self.editable_park(&park_id);
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            LICENSE_FEE,
            "License costs exactly 0.005 testnet NEAR"
        );
        let mut bp = self
            .blueprints
            .get(&blueprint_id)
            .expect("Blueprint not found");
        assert_ne!(p.id, bp.park_id, "This is your own blueprint");
        let key = format!("{park_id}:{blueprint_id}");
        if self.licenses.get(&key).unwrap_or(false) {
            Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(LICENSE_FEE))
                .detach();
            return true;
        }
        let creator = self.parks.get(&bp.park_id).unwrap().owner;
        let amount = LICENSE_FEE * 90 / 100;
        let mut e = self.creator_earnings.get(&creator).unwrap_or_default();
        e.available += amount;
        self.creator_obligations += amount;
        self.creator_earnings.insert(&creator, &e);
        self.licenses.insert(&key, &true);
        p.license_count += 1;
        self.parks.insert(&park_id, &p);
        bp.licenses += 1;
        self.blueprints.insert(&blueprint_id, &bp);
        self.assert_collateral();
        emit(
            "blueprint_licensed",
            serde_json::json!({"park_id":park_id,"blueprint_id":blueprint_id,"creator":creator,"creator_yocto":amount.to_string(),"fee_yocto":LICENSE_FEE.to_string()}),
        );
        true
    }
    pub fn get_creator_earnings(&self, account_id: AccountId) -> serde_json::Value {
        let e = self.creator_earnings.get(&account_id).unwrap_or_default();
        serde_json::json!({"available":e.available.to_string(),"pending":e.pending.to_string(),"paid":e.paid.to_string()})
    }
    pub fn claim_creator_earnings(&mut self) -> Promise {
        let owner = env::predecessor_account_id();
        let mut e = self.creator_earnings.get(&owner).unwrap_or_default();
        assert!(
            e.available > 0 && e.pending == 0,
            "No available creator earnings, or transfer pending"
        );
        let amount = e.available;
        e.available = 0;
        e.pending = amount;
        self.creator_earnings.insert(&owner, &e);
        self.assert_collateral();
        Promise::new(owner.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_creator_paid",
                    serde_json::json!({"owner":owner,"amount":amount.to_string()})
                        .to_string()
                        .into_bytes(),
                    NearToken::from_yoctonear(0),
                    Gas::from_tgas(8),
                ),
            )
    }
    #[private]
    pub fn on_creator_paid(&mut self, owner: AccountId, amount: U128) -> bool {
        assert_eq!(env::promise_results_count(), 1, "Expected payment result");
        let mut e = self
            .creator_earnings
            .get(&owner)
            .expect("Earnings not found");
        assert_eq!(e.pending, amount.0, "Payment receipt mismatch");
        let ok = env::promise_result_checked(0, 0).is_ok();
        e.pending = 0;
        if ok {
            e.paid += amount.0;
            self.creator_obligations -= amount.0;
        } else {
            e.available += amount.0;
        }
        self.creator_earnings.insert(&owner, &e);
        emit(
            "creator_payment",
            serde_json::json!({"owner":owner,"amount":amount.0.to_string(),"success":ok}),
        );
        ok
    }
    pub fn rate_park(&mut self, park_id: String, stars: u8) -> Park {
        let caller = env::predecessor_account_id();
        assert!(
            self.park_operators.get(&caller).is_some() || self.park_owners.get(&caller).is_some(),
            "Open a park before leaving a review"
        );
        let mut p = self.parks.get(&park_id).expect("Park not found");
        assert!(
            p.run_id.is_some() && p.owner != caller && p.operator != caller,
            "Visit another published park"
        );
        assert!((1..=5).contains(&stars), "Choose 1–5 stars");
        let reviewer = self
            .park_operators
            .get(&caller)
            .or_else(|| self.park_owners.get(&caller))
            .unwrap();
        let key = format!("{reviewer}:{park_id}");
        let old = self.park_ratings.get(&key).unwrap_or(0);
        if old == 0 {
            p.rating_count += 1;
        }
        p.rating_sum = p.rating_sum - old as u32 + stars as u32;
        self.park_ratings.insert(&key, &stars);
        self.parks.insert(&park_id, &p);
        self.assert_collateral();
        p
    }
}
