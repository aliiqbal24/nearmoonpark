use last_signal_sim::{Command, Run, VERSION};
use near_sdk::{collections::LookupMap, env, near, AccountId, PanicOnDefault};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Colony {
    sponsor: AccountId,
    runs: LookupMap<String, String>,
    allowed: LookupMap<AccountId, bool>,
    counts: LookupMap<AccountId, u8>,
    requests: LookupMap<String, String>,
    next: u64,
}
#[near]
impl Colony {
    #[init]
    pub fn new(sponsor: AccountId) -> Self {
        Self {
            sponsor,
            runs: LookupMap::new(b"r"),
            allowed: LookupMap::new(b"a"),
            counts: LookupMap::new(b"c"),
            requests: LookupMap::new(b"q"),
            next: 0,
        }
    }
    pub fn register_player(&mut self, account_id: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.sponsor, "Sponsor only");
        self.allowed.insert(&account_id, &true);
    }
    pub fn create_run(
        &mut self,
        scenario_id: String,
        seed: u32,
        request_id: String,
    ) -> serde_json::Value {
        assert_eq!(scenario_id, VERSION, "Unsupported scenario");
        assert!(
            request_id.len() <= 64 && !request_id.is_empty(),
            "Invalid request id"
        );
        let owner = env::predecessor_account_id();
        assert!(
            self.allowed.get(&owner).unwrap_or(false),
            "Account not admitted"
        );
        let req = format!("{}:{}", owner, request_id);
        if let Some(id) = self.requests.get(&req) {
            return self.get_run(id);
        }
        let count = self.counts.get(&owner).unwrap_or(0);
        assert!(count < 8, "Eight runs per guest account");
        self.next += 1;
        let id = self.next.to_string();
        let run = Run::new(seed);
        let record = serde_json::json!({"owner":owner,"run":run,"run_id":id});
        self.runs.insert(&id, &record.to_string());
        self.counts.insert(&owner, &(count + 1));
        self.requests.insert(&req, &id);
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({"standard":"last_signal","version":"1.0.0","event":"run_created","data":[{"run_id":id,"hash":run.hash}]})
        ));
        record
    }
    pub fn step(
        &mut self,
        run_id: String,
        expected_revision: u32,
        command: Command,
        max_sols: u8,
    ) -> serde_json::Value {
        let mut record = self.get_run(run_id.clone());
        assert_eq!(
            record["owner"].as_str().unwrap(),
            env::predecessor_account_id().as_str(),
            "Owner only"
        );
        let mut run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        assert_eq!(run.revision, expected_revision, "Stale revision");
        let event_start = run.events.len();
        run.apply(command, max_sols)
            .unwrap_or_else(|e| env::panic_str(&e));
        env::log_str(&format!(
            "EVENT_JSON:{}",
            serde_json::json!({"standard":"last_signal","version":"1.0.0","event":"settled","data":[{"run_id":run_id,"revision":run.revision,"hash":run.hash,"events":&run.events[event_start..]}]})
        ));
        record["run"] = serde_json::to_value(run).unwrap();
        self.runs.insert(&run_id, &record.to_string());
        record
    }
    pub fn get_run(&self, run_id: String) -> serde_json::Value {
        serde_json::from_str(&self.runs.get(&run_id).expect("Run not found")).unwrap()
    }
    pub fn get_history(&self, run_id: String, cursor: u32, limit: u32) -> serde_json::Value {
        let record = self.get_run(run_id);
        let events = record["run"]["events"].as_array().unwrap();
        serde_json::json!({"events":events.iter().skip(cursor as usize).take(limit.min(50) as usize).collect::<Vec<_>>(),"next":(cursor+limit.min(50)).min(events.len() as u32)})
    }
    pub fn get_scenario(&self, scenario_id: String) -> serde_json::Value {
        assert_eq!(scenario_id, VERSION);
        serde_json::json!({"id":VERSION,"sols":24,"decisions":8,"max_sols":3,"npc_custody":"contract-managed","simulation":"last-signal-sim"})
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;
    fn context(who: &str) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(who.parse().unwrap());
        b.current_account_id("game.testnet".parse().unwrap());
        testing_env!(b.build());
    }
    fn setup() -> Colony {
        context("sponsor.testnet");
        let mut c = Colony::new("sponsor.testnet".parse().unwrap());
        c.register_player("player.testnet".parse().unwrap());
        c
    }
    #[test]
    fn admission_and_idempotency() {
        let mut c = setup();
        context("player.testnet");
        let a = c.create_run(VERSION.into(), 42, "one".into());
        let b = c.create_run(VERSION.into(), 42, "one".into());
        assert_eq!(a, b);
        assert_eq!(c.next, 1);
    }
    #[test]
    #[should_panic(expected = "Owner only")]
    fn rejects_other_owner() {
        let mut c = setup();
        context("player.testnet");
        let a = c.create_run(VERSION.into(), 42, "one".into());
        context("intruder.testnet");
        c.step(
            a["run_id"].as_str().unwrap().into(),
            0,
            Command {
                kind: "choice".into(),
                option: 0,
                target: 0,
            },
            3,
        );
    }
    #[test]
    #[should_panic(expected = "Stale revision")]
    fn rejects_stale_revision() {
        let mut c = setup();
        context("player.testnet");
        let a = c.create_run(VERSION.into(), 42, "one".into());
        c.step(
            a["run_id"].as_str().unwrap().into(),
            1,
            Command {
                kind: "choice".into(),
                option: 0,
                target: 0,
            },
            3,
        );
    }
    #[test]
    fn state_matches_shared_core() {
        let mut c = setup();
        context("player.testnet");
        let a = c.create_run(VERSION.into(), 42, "one".into());
        let id = a["run_id"].as_str().unwrap().to_string();
        let mut native = Run::new(42);
        native
            .apply(
                Command {
                    kind: "choice".into(),
                    option: 0,
                    target: 0,
                },
                3,
            )
            .unwrap();
        let b = c.step(
            id,
            0,
            Command {
                kind: "choice".into(),
                option: 0,
                target: 0,
            },
            3,
        );
        assert_eq!(b["run"], serde_json::to_value(native).unwrap());
    }
}
