use super::*;
use near_sdk::{test_utils::VMContextBuilder, testing_env};
fn context(who: &str, time: u64) {
    let mut c = VMContextBuilder::new();
    c.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id(who.parse().unwrap())
        .block_timestamp(time);
    testing_env!(c.build());
}
#[test]
fn identity_and_request_idempotency() {
    context("sponsor.testnet", 1_000_000_000);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "opaque-player".into(),
        "Alice".into(),
    );
    c.open_challenge();
    context("alice.testnet", 1_000_000_000);
    let a = c.create_run(VERSION.into(), "one".into(), None);
    assert_eq!(a, c.create_run(VERSION.into(), "one".into(), None));
    let id = a["run_id"].as_str().unwrap().to_owned();
    let b = c.apply_actions(id.clone(), 0, "tick".into(), vec![], 10);
    assert_eq!(b, c.apply_actions(id, 0, "tick".into(), vec![], 10));
}
#[test]
fn best_scores_and_prize_snapshot() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    for n in 0..8 {
        let e = Entry {
            player_id: format!("p{n}"),
            display_name: format!("Player {n}"),
            run_id: format!("r{n}"),
            owner: "alice.testnet".parse().unwrap(),
            score: Score {
                total: 1000 + n,
                ..Default::default()
            },
            completed_at: "1".into(),
        };
        c.record_score(e, true);
    }
    assert_eq!(c.top.len(), 5);
    assert_eq!(c.top[0], "p7");
    let mut e: Entry = serde_json::from_str(&c.best.get(&"p0".into()).unwrap()).unwrap();
    e.score.total = 9999;
    c.record_score(e, false);
    assert_eq!(c.top[0], "p0");
    assert_eq!(c.prize_top[0], "p7");
    assert_eq!(c.best.len(), 8);
}
#[test]
#[should_panic(expected = "Owner only")]
fn rejects_other_owner() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player("alice.testnet".parse().unwrap(), "p".into(), "Alice".into());
    context("alice.testnet", 1);
    let a = c.create_run(VERSION.into(), "a".into(), None);
    context("bob.testnet", 1);
    c.apply_actions(
        a["run_id"].as_str().unwrap().into(),
        0,
        "bad".into(),
        vec![],
        1,
    );
}
#[test]
#[should_panic(expected = "Stale revision")]
fn rejects_stale_revision() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player("alice.testnet".parse().unwrap(), "p".into(), "Alice".into());
    context("alice.testnet", 1);
    let r = c.create_run(VERSION.into(), "run".into(), None);
    c.apply_actions(
        r["run_id"].as_str().unwrap().into(),
        99,
        "bad".into(),
        vec![],
        1,
    );
}
#[test]
#[should_panic(expected = "Opening day time limit reached")]
fn rejects_late_actions() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player("alice.testnet".parse().unwrap(), "p".into(), "Alice".into());
    context("alice.testnet", 1);
    let r = c.create_run(VERSION.into(), "run".into(), Some("Public nickname".into()));
    context("alice.testnet", 541_000_000_001);
    c.apply_actions(
        r["run_id"].as_str().unwrap().into(),
        0,
        "late".into(),
        vec![Command {
            kind: "price".into(),
            building: 1,
            value: 500,
            ..Default::default()
        }],
        0,
    );
}
#[test]
#[should_panic(expected = "Simulation is ahead of the clock")]
fn rejects_instant_full_round() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player("alice.testnet".parse().unwrap(), "p".into(), "Alice".into());
    context("alice.testnet", 1);
    let r = c.create_run(VERSION.into(), "run".into(), None);
    let id = r["run_id"].as_str().unwrap().to_owned();
    c.apply_actions(id.clone(), 0, "one".into(), vec![], 10);
    c.apply_actions(id, 1, "two".into(), vec![], 10);
}
