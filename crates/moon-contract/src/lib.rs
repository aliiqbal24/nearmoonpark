use moonpark_sim::{Command, Run, Score, END, VERSION};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    collections::{LookupMap, UnorderedMap},
    env, near, AccountId, PanicOnDefault,
};
mod ownership;
mod parks;
use near_contract_standards::non_fungible_token::NonFungibleToken;
use ownership::{BusinessShare, PrizeClaim};
use parks::{Earnings, Park, RideBlueprint};
pub const CUTOFF: u64 = 1_795_046_340_000_000_000;
// Bounded confirmation/handoff grace; it never adds simulation ticks or income.
pub const CONFIRMATION_GRACE: u64 = 15;
#[derive(Clone, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Entry {
    pub player_id: String,
    pub display_name: String,
    pub run_id: String,
    pub owner: AccountId,
    pub score: Score,
    pub completed_at: String,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Moonpark {
    sponsor: AccountId,
    parks: UnorderedMap<String, Park>,
    park_owners: LookupMap<AccountId, String>,
    park_operators: LookupMap<AccountId, String>,
    park_ratings: LookupMap<String, u8>,
    blueprints: UnorderedMap<String, RideBlueprint>,
    licenses: LookupMap<String, bool>,
    creator_earnings: LookupMap<AccountId, Earnings>,
    creator_obligations: u128,
    next_park: u64,
    runs: LookupMap<String, String>,
    players: LookupMap<AccountId, String>,
    requests: LookupMap<String, String>,
    counts: LookupMap<String, u16>,
    best: UnorderedMap<String, String>,
    prize_best: UnorderedMap<String, String>,
    top: Vec<String>,
    prize_top: Vec<String>,
    next: u64,
    launch_at: u64,
    tokens: NonFungibleToken,
    shares: LookupMap<String, BusinessShare>,
    transfer_locks: LookupMap<String, bool>,
    business_fund: u128,
    business_obligations: u128,
    prize_fund: u128,
    prize_obligations: u128,
    prize_tier: String,
    prize_claims: LookupMap<AccountId, PrizeClaim>,
}
#[near]
impl Moonpark {
    #[init]
    pub fn new(sponsor: AccountId) -> Self {
        Self {
            sponsor,
            parks: UnorderedMap::new(b"v4p".to_vec()),
            park_owners: LookupMap::new(b"v4o".to_vec()),
            park_operators: LookupMap::new(b"v4s".to_vec()),
            park_ratings: LookupMap::new(b"v4r".to_vec()),
            blueprints: UnorderedMap::new(b"v4b".to_vec()),
            licenses: LookupMap::new(b"v4l".to_vec()),
            creator_earnings: LookupMap::new(b"v4e".to_vec()),
            creator_obligations: 0,
            next_park: 0,
            runs: LookupMap::new(b"r"),
            players: LookupMap::new(b"p"),
            requests: LookupMap::new(b"q"),
            counts: LookupMap::new(b"c"),
            best: UnorderedMap::new(b"b"),
            prize_best: UnorderedMap::new(b"e"),
            top: vec![],
            prize_top: vec![],
            next: 0,
            launch_at: 0,
            tokens: NonFungibleToken::new(
                b"no".to_vec(),
                env::current_account_id(),
                Some(b"nm".to_vec()),
                Some(b"ne".to_vec()),
                Some(b"na".to_vec()),
            ),
            shares: LookupMap::new(b"ns".to_vec()),
            transfer_locks: LookupMap::new(b"nl".to_vec()),
            business_fund: 0,
            business_obligations: 0,
            prize_fund: 0,
            prize_obligations: 0,
            prize_tier: "pending".into(),
            prize_claims: LookupMap::new(b"pc".to_vec()),
        }
    }
    pub fn register_player(
        &mut self,
        account_id: AccountId,
        player_id: String,
        display_name: String,
    ) {
        assert_eq!(env::predecessor_account_id(), self.sponsor, "Sponsor only");
        assert!(
            !player_id.is_empty() && player_id.len() <= 80,
            "Invalid player identity"
        );
        assert!(
            display_name.chars().count() <= 24 && !display_name.trim().is_empty(),
            "Invalid display name"
        );
        let ranked = !player_id.starts_with("guest:");
        if let Some(old) = self.players.get(&account_id) {
            let old: serde_json::Value = serde_json::from_str(&old).unwrap();
            assert_eq!(
                old["player_id"].as_str(),
                Some(player_id.as_str()),
                "Identity is already bound"
            );
        }
        self.players.insert(
            &account_id,
            &serde_json::json!({"player_id":player_id,"display_name":display_name,"ranked":ranked})
                .to_string(),
        );
        self.assert_collateral();
    }
    pub fn open_challenge(&mut self) {
        assert_eq!(env::predecessor_account_id(), self.sponsor, "Sponsor only");
        assert_eq!(self.launch_at, 0, "Challenge already opened");
        self.launch_at = env::block_timestamp();
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({"standard":"moonpark","version":"1.0.0","event":"challenge_opened","data":[{"opened_at":self.launch_at.to_string(),"cutoff":CUTOFF.to_string(),"ruleset":VERSION}]})
        ));
    }
    pub fn create_run(
        &mut self,
        challenge_id: String,
        request_id: String,
        display_name: Option<String>,
    ) -> serde_json::Value {
        assert_eq!(challenge_id, VERSION, "Unsupported challenge");
        assert!(
            !request_id.is_empty() && request_id.len() <= 64,
            "Invalid request"
        );
        let owner = env::predecessor_account_id();
        let req = format!("{owner}:{request_id}");
        if let Some(id) = self.requests.get(&req) {
            return self.get_run(id);
        }
        let player = self.players.get(&owner).expect("Account not admitted");
        let player: serde_json::Value = serde_json::from_str(&player).unwrap();
        let name = display_name.unwrap_or_else(|| player["display_name"].as_str().unwrap().into());
        assert!(
            !name.trim().is_empty()
                && name.chars().count() <= 24
                && !name.chars().any(char::is_control),
            "Invalid display name"
        );
        let key = format!(
            "{}:{}",
            player["player_id"].as_str().unwrap(),
            env::block_timestamp() / 86_400_000_000_000
        );
        let n = self.counts.get(&key).unwrap_or(0);
        assert!(n < 16, "Daily sponsored run limit reached");
        self.counts.insert(&key, &(n + 1));
        self.next += 1;
        let id = self.next.to_string();
        let ranked = player["ranked"].as_bool().unwrap() && self.launch_at > 0;
        let now = env::block_timestamp();
        let park_id = self.ensure_park(&owner);
        let run = Run::new();
        let record = serde_json::json!({"run_id":id,"park_id":park_id,"owner":owner,"player_id":player["player_id"],"display_name":name,"ranked":ranked,"started_at":now.to_string(),"deadline":(now+(END as u64+CONFIRMATION_GRACE)*1_000_000_000).to_string(),"last_request":"","run":run});
        self.runs.insert(&id, &record.to_string());
        self.requests.insert(&req, &id);
        self.assert_collateral();
        record
    }
    pub fn apply_actions(
        &mut self,
        run_id: String,
        expected_revision: u32,
        request_id: String,
        commands: Vec<Command>,
        ticks: u16,
    ) -> serde_json::Value {
        assert!(
            !request_id.is_empty() && request_id.len() <= 64,
            "Invalid request"
        );
        let mut record = self.get_run(run_id.clone());
        assert_eq!(
            record["owner"].as_str().unwrap(),
            env::predecessor_account_id().as_str(),
            "Owner only"
        );
        if record["last_request"].as_str() == Some(&request_id) {
            return record;
        }
        let mut run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        assert_eq!(run.revision, expected_revision, "Stale revision");
        let now = env::block_timestamp();
        let started: u64 = record["started_at"].as_str().unwrap().parse().unwrap();
        assert!(
            commands.is_empty()
                || commands.iter().all(|c| run.is_cosmetic(c))
                || now <= record["deadline"].as_str().unwrap().parse::<u64>().unwrap(),
            "Opening day time limit reached"
        );
        let allowed = (((now.saturating_sub(started)) as u128 * 4 / 1_000_000_000 + 10)
            .min(END as u128)) as u16;
        assert!(
            run.tick.saturating_add(ticks).min(END) <= allowed,
            "Simulation is ahead of the clock"
        );
        let was_finished = run.finished;
        if !commands.is_empty() {
            let park = self
                .parks
                .get(&record["park_id"].as_str().unwrap().to_string())
                .expect("Park not found");
            assert_eq!(
                park.operator,
                env::predecessor_account_id(),
                "Park operator authorization has changed"
            );
        }
        let previous_deals: Vec<_> = run.partnerships.iter().map(|p| p.status.clone()).collect();
        self.validate_licenses(&env::predecessor_account_id(), &commands);
        run.apply(&commands, ticks)
            .unwrap_or_else(|e| env::panic_str(&e));
        for (i, p) in run.partnerships.iter().enumerate() {
            if previous_deals[i] == "offered" && p.status != "offered" {
                self.issue_share(&run_id, p, &env::predecessor_account_id());
            }
            if p.status == "completed" && previous_deals[i] != "completed" {
                env::log_str(&format!(
                    "EVENT_JSON:{}",
                    serde_json::json!({"standard":"moonpark","version":"2.0.0","event":"partnership_paid","data":[{"run_id":run_id,"owner":env::predecessor_account_id(),"merchant":p.owner,"partnership_id":p.id,"amount_credits_cents":p.reward.to_string(),"funding":"reserved_tourism_grant","tick":run.tick}]})
                ));
            }
        }
        if run.finished {
            self.close_business_reserves(&run_id, &run);
        }
        record["last_request"] = request_id.into();
        record["run"] = serde_json::to_value(&run).unwrap();
        if run.finished && !was_finished {
            let entry = Entry {
                player_id: record["player_id"].as_str().unwrap().into(),
                display_name: record["display_name"].as_str().unwrap().into(),
                owner: self
                    .parks
                    .get(&record["park_id"].as_str().unwrap().to_string())
                    .map(|p| p.owner)
                    .unwrap_or_else(env::predecessor_account_id),
                run_id: run_id.clone(),
                score: run.score.clone(),
                completed_at: now.to_string(),
            };
            self.record_score(entry, record["ranked"].as_bool().unwrap() && now <= CUTOFF);
        }
        self.runs.insert(&run_id, &record.to_string());
        self.assert_collateral();
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({"standard":"moonpark","version":"1.0.0","event":"settled","data":[{"run_id":run_id,"revision":run.revision,"tick":run.tick,"hash":run.hash,"trade_count":run.trade_count,"finished":run.finished,"score":run.score.total}]})
        ));
        record
    }
    pub fn get_run(&self, run_id: String) -> serde_json::Value {
        serde_json::from_str(&self.runs.get(&run_id).expect("Run not found")).unwrap()
    }
    pub fn get_partnerships(&self, run_id: String) -> serde_json::Value {
        let record = self.get_run(run_id);
        serde_json::json!({"owner":record["owner"],"partnerships":record["run"]["partnerships"],"available_funding":record["run"]["grant_cash"],"reserved_funding":record["run"]["grant_escrow"],"currency":"virtual lunar credits","ruleset":VERSION})
    }
    pub fn get_leaderboard(&self) -> serde_json::Value {
        serde_json::json!({"entries":self.top.iter().map(|id|serde_json::from_str::<Entry>(&self.best.get(id).unwrap()).unwrap()).collect::<Vec<_>>(),"challenge_id":VERSION,"open":self.launch_at>0})
    }
    pub fn get_prize_snapshot(&self) -> serde_json::Value {
        serde_json::json!({"entries":self.prize_top.iter().map(|id|serde_json::from_str::<Entry>(&self.prize_best.get(id).unwrap()).unwrap()).collect::<Vec<_>>(),"cutoff":CUTOFF.to_string(),"closed":env::block_timestamp()>CUTOFF,"funding":if self.prize_fund>0 {"testnet_escrow"}else{"conditional_unfunded"},"escrow_yocto":self.prize_fund.to_string(),"award_tier":self.prize_tier,"currency":"testnet NEAR","usd_pledge_funded":false,"track_prizes_usd":[400,300,200,100],"grand_prizes_usd":[2000,1500,1000,500]})
    }
    pub fn get_best(&self, player_id: String, prize: bool) -> Option<Entry> {
        let value = if prize {
            self.prize_best.get(&player_id)
        } else {
            self.best.get(&player_id)
        };
        value.map(|s| serde_json::from_str(&s).unwrap())
    }
    pub fn get_candidates(&self, cursor: u64, limit: u64) -> Vec<Entry> {
        self.prize_best
            .iter()
            .skip(cursor as usize)
            .take(limit.min(50) as usize)
            .map(|(_, s)| serde_json::from_str(&s).unwrap())
            .collect()
    }
    pub fn get_challenge(&self) -> serde_json::Value {
        serde_json::json!({"id":VERSION,"seconds":END-moonpark_sim::LANDING,"approach_seconds":moonpark_sim::LANDING,"simulation_ticks":END,"width":32,"height":24,"visitors":96,"max_active":48,"shuttle_seconds":40,"inbound_flights":12,"visitors_per_flight":8,"tourism_grant_cents":60000,"partnerships":3,"max_batch_ticks":20,"max_commands":16,"max_speed":4,"open":self.launch_at>0,"opened_at":self.launch_at.to_string(),"cutoff":CUTOFF.to_string(),"npc_custody":"contract-managed","catalog":moonpark_sim::catalog::CATALOG,"score_weights":[6000,2500,1500],"badge_thresholds":[3500,5500,7000],"prize_status":if self.prize_fund>0 {"testnet_escrow"}else{"conditional_unfunded"},"concession_standard":"NEP-171","game_currency":"virtual lunar credits","reward_currency":"testnet NEAR"})
    }
}
fn better(a: &Entry, b: &Entry) -> bool {
    (a.score.total, a.score.satisfaction, a.score.equity_gain)
        > (b.score.total, b.score.satisfaction, b.score.equity_gain)
        || ((a.score.total, a.score.satisfaction, a.score.equity_gain)
            == (b.score.total, b.score.satisfaction, b.score.equity_gain)
            && a.completed_at.parse::<u64>().unwrap() < b.completed_at.parse::<u64>().unwrap())
}
impl Moonpark {
    fn record_score(&mut self, e: Entry, prize: bool) {
        let id = e.player_id.clone();
        if self
            .best
            .get(&id)
            .map(|s| better(&e, &serde_json::from_str(&s).unwrap()))
            .unwrap_or(true)
        {
            self.best.insert(&id, &serde_json::to_string(&e).unwrap());
            self.top.retain(|p| p != &id);
            self.top.push(id.clone());
            self.top.sort_by(|a, b| {
                let a: Entry = serde_json::from_str(&self.best.get(a).unwrap()).unwrap();
                let b: Entry = serde_json::from_str(&self.best.get(b).unwrap()).unwrap();
                if better(&a, &b) {
                    std::cmp::Ordering::Less
                } else if better(&b, &a) {
                    std::cmp::Ordering::Greater
                } else {
                    a.player_id.cmp(&b.player_id)
                }
            });
            self.top.truncate(5);
        }
        if prize
            && self
                .prize_best
                .get(&id)
                .map(|s| better(&e, &serde_json::from_str(&s).unwrap()))
                .unwrap_or(true)
        {
            self.prize_best
                .insert(&id, &serde_json::to_string(&e).unwrap());
            self.prize_top.retain(|p| p != &id);
            self.prize_top.push(id);
            self.prize_top.sort_by(|a, b| {
                let a: Entry = serde_json::from_str(&self.prize_best.get(a).unwrap()).unwrap();
                let b: Entry = serde_json::from_str(&self.prize_best.get(b).unwrap()).unwrap();
                if better(&a, &b) {
                    std::cmp::Ordering::Less
                } else if better(&b, &a) {
                    std::cmp::Ordering::Greater
                } else {
                    a.player_id.cmp(&b.player_id)
                }
            });
            self.prize_top.truncate(5);
        }
    }
}
#[cfg(test)]
mod tests;
