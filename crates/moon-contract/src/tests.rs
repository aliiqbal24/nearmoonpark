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
    context("alice.testnet", 566_000_000_001);
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

fn deposit(who: &str, amount: u128, time: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id(who.parse().unwrap())
        .block_timestamp(time)
        .attached_deposit(near_sdk::NearToken::from_yoctonear(amount));
    testing_env!(b.build());
}
fn share_fixture() -> Moonpark {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    deposit("sponsor.testnet", ownership::SHARE_CAP * 3, 1);
    c.fund_business_rewards();
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "run".into(), None);
    c.apply_actions(
        "1".into(),
        0,
        "partner".into(),
        vec![Command {
            kind: "partner".into(),
            building: 2,
            value: 1,
            ..Default::default()
        }],
        0,
    );
    c
}
fn accrue(c: &mut Moonpark, amount: i64) {
    let mut r = c.get_run("1".into());
    r["run"]["partnerships"][0]["earned"] = amount.into();
    c.runs.insert(&"1".into(), &r.to_string());
}
fn transfer_result(success: bool) {
    let mut b = VMContextBuilder::new();
    b.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id("moon.testnet".parse().unwrap())
        .block_timestamp(CUTOFF + 1);
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![if success {
            near_sdk::PromiseResult::Successful(vec![])
        } else {
            near_sdk::PromiseResult::Failed
        }]
    );
}
#[test]
fn concession_is_owned_funded_and_issued_once() {
    use near_contract_standards::non_fungible_token::{
        core::NonFungibleTokenCore, enumeration::NonFungibleTokenEnumeration,
    };
    let mut c = share_fixture();
    assert_eq!(c.nft_total_supply().0, 1);
    assert_eq!(
        c.nft_token("1:1".into()).unwrap().owner_id.as_str(),
        "alice.testnet"
    );
    assert_eq!(c.business_fund, ownership::SHARE_CAP * 2);
    c.apply_actions("1".into(), 0, "partner".into(), vec![], 0);
    assert_eq!(c.nft_total_supply().0, 1);
    assert_eq!(c.business_fund, ownership::SHARE_CAP * 2);
    assert_eq!(c.prize_fund, 0);
}
#[test]
fn ownership_transfer_moves_uncollected_reward_rights() {
    use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    deposit("alice.testnet", 1, 1);
    c.nft_transfer("bob.testnet".parse().unwrap(), "1:1".into(), None, None);
    context("bob.testnet", 1);
    let _ = c.claim_business_reward("1:1".into());
    let before = c.get_business_share("1:1".into()).unwrap();
    assert_eq!(before["owner_id"], "bob.testnet");
    assert_eq!(before["claimable_yocto"], "0");
    let amount = 3000 * ownership::PER_CENT;
    transfer_result(true);
    assert!(c.on_business_reward(
        "1:1".into(),
        "bob.testnet".parse().unwrap(),
        near_sdk::json_types::U128(amount)
    ));
    assert_eq!(
        c.get_business_share("1:1".into()).unwrap()["paid_yocto"],
        amount.to_string()
    );
}
#[test]
#[should_panic(expected = "Concession owner only")]
fn former_owner_cannot_collect_after_transfer() {
    use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    deposit("alice.testnet", 1, 1);
    c.nft_transfer("bob.testnet".parse().unwrap(), "1:1".into(), None, None);
    context("alice.testnet", 1);
    let _ = c.claim_business_reward("1:1".into());
}
#[test]
fn failed_business_transfer_can_retry_without_minting_money() {
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    let _ = c.claim_business_reward("1:1".into());
    let amount = 3000 * ownership::PER_CENT;
    transfer_result(false);
    assert!(!c.on_business_reward(
        "1:1".into(),
        "alice.testnet".parse().unwrap(),
        near_sdk::json_types::U128(amount)
    ));
    assert_eq!(
        c.get_business_share("1:1".into()).unwrap()["claimable_yocto"],
        amount.to_string()
    );
    context("alice.testnet", 1);
    let _ = c.claim_business_reward("1:1".into());
    transfer_result(true);
    assert!(c.on_business_reward(
        "1:1".into(),
        "alice.testnet".parse().unwrap(),
        near_sdk::json_types::U128(amount)
    ));
    assert_eq!(
        c.get_business_share("1:1".into()).unwrap()["claimable_yocto"],
        "0"
    );
}
#[test]
#[should_panic(expected = "Reward transfer already pending")]
fn business_claim_cannot_be_double_spent() {
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    let _ = c.claim_business_reward("1:1".into());
    let _ = c.claim_business_reward("1:1".into());
}
#[test]
fn unused_business_reserve_returns_to_its_own_pool_once() {
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    let run: Run = serde_json::from_value(c.get_run("1".into())["run"].clone()).unwrap();
    c.close_business_reserves("1", &run);
    assert_eq!(
        c.business_fund,
        ownership::SHARE_CAP * 3 - 3000 * ownership::PER_CENT
    );
    let before = c.business_fund;
    c.close_business_reserves("1", &run);
    assert_eq!(c.business_fund, before);
    assert_eq!(c.prize_fund, 0);
}
#[test]
#[should_panic(expected = "Finish the ownership transfer first")]
fn transfer_call_receiver_cannot_take_reward_before_acceptance() {
    let mut c = share_fixture();
    accrue(&mut c, 3000);
    c.transfer_locks.insert(&"1:1".into(), &true);
    let _ = c.claim_business_reward("1:1".into());
}
fn prize_fixture() -> Moonpark {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    deposit("sponsor.testnet", 1_000_000, 1);
    c.fund_prizes();
    for n in 0..5 {
        c.record_score(
            Entry {
                player_id: format!("p{n}"),
                display_name: format!("Player {n}"),
                run_id: format!("r{n}"),
                owner: format!("player{n}.testnet").parse().unwrap(),
                score: Score {
                    total: 1000 + n,
                    ..Default::default()
                },
                completed_at: "1".into(),
            },
            true,
        );
    }
    c
}
#[test]
fn escrow_allocates_only_to_four_frozen_winners_in_order() {
    let mut c = prize_fixture();
    context("sponsor.testnet", CUTOFF + 1);
    c.activate_prizes("track".into());
    for (n, amount) in [(4, 400000), (3, 300000), (2, 200000), (1, 100000)] {
        assert_eq!(
            c.prize_claims
                .get(&format!("player{n}.testnet").parse().unwrap())
                .unwrap()
                .amount,
            amount
        );
    }
    assert!(c
        .prize_claims
        .get(&"player0.testnet".parse().unwrap())
        .is_none());
    assert_eq!(c.business_fund, 0);
    context("player4.testnet", CUTOFF + 1);
    let _ = c.claim_prize();
    transfer_result(false);
    assert!(!c.on_prize_paid(
        "player4.testnet".parse().unwrap(),
        near_sdk::json_types::U128(400000)
    ));
    context("player4.testnet", CUTOFF + 1);
    let _ = c.claim_prize();
    transfer_result(true);
    assert!(c.on_prize_paid(
        "player4.testnet".parse().unwrap(),
        near_sdk::json_types::U128(400000)
    ));
    assert_eq!(
        c.get_prize_claim("player4.testnet".parse().unwrap())["claimable_yocto"],
        "0"
    );
}
#[test]
#[should_panic(expected = "Standings are not frozen yet")]
fn prizes_cannot_be_allocated_early() {
    let mut c = prize_fixture();
    c.activate_prizes("track".into());
}
#[test]
#[should_panic(expected = "Sponsor only")]
fn players_cannot_attest_the_hackathon_award() {
    let mut c = prize_fixture();
    context("player4.testnet", CUTOFF + 1);
    c.activate_prizes("grand".into());
}
#[test]
#[should_panic(expected = "Prizes already allocated")]
fn award_tier_and_allocations_cannot_be_rewritten() {
    let mut c = prize_fixture();
    context("sponsor.testnet", CUTOFF + 1);
    c.activate_prizes("track".into());
    c.activate_prizes("grand".into());
}
#[test]
#[should_panic(expected = "Prize transfer already pending")]
fn prize_claim_cannot_be_double_spent() {
    let mut c = prize_fixture();
    context("sponsor.testnet", CUTOFF + 1);
    c.activate_prizes("track".into());
    context("player4.testnet", CUTOFF + 1);
    let _ = c.claim_prize();
    let _ = c.claim_prize();
}

#[test]
#[should_panic(expected = "reserved rewards remain protected")]
fn game_storage_cannot_consume_reward_backing() {
    let c = share_fixture();
    let mut b = VMContextBuilder::new();
    b.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id("alice.testnet".parse().unwrap())
        .account_balance(near_sdk::NearToken::from_yoctonear(1));
    testing_env!(b.build());
    c.assert_collateral();
}
