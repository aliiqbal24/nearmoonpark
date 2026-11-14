use super::*;
use near_sdk::{test_utils::VMContextBuilder, testing_env};
fn context(who: &str, time: u64) {
    let mut c = VMContextBuilder::new();
    c.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id(who.parse().unwrap())
        .block_timestamp(time);
    testing_env!(c.build());
}
fn new_contract() -> Moonpark {
    let caller = env::predecessor_account_id().to_string();
    let time = env::block_timestamp();
    let mut contract = Moonpark::new("sponsor.testnet".parse().unwrap());
    for name in economy::VENDORS {
        context(&format!("{name}.sponsor.testnet"), time);
        contract.accept_vendor_policy("moonpark-v6-persistent-vendors-1".into());
    }
    context(&caller, time);
    contract
}

fn economy_fixture() -> Moonpark {
    context("sponsor.testnet", 1_000_000_000);
    let mut c = new_contract();
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1_000_000_000);
    c.create_run(VERSION.into(), "economy".into(), None);
    c
}
fn finish_economy(c: &mut Moonpark) {
    for n in 0..90 {
        if c.get_run("1".into())["run"]["finished"] == true {
            break;
        }
        context("alice.testnet", (n + 1) * 10_000_000_000);
        c.apply_actions("1".into(), n as u32, format!("tick-{n}"), vec![], 10);
        let state = c.get_run_economy("1".into());
        let record = c.get_run("1".into());
        let run: Run = serde_json::from_value(record["run"].clone()).unwrap();
        assert_eq!(state["supplies"][0], run.money_supply.to_string());
        assert_eq!(state["wallets"][0]["balances"][0], run.cash.to_string());
        for asset in 1..4 {
            assert_eq!(
                state["supplies"][asset],
                (2048 - run.consumed[asset - 1]).to_string()
            );
            let total: u128 = state["wallets"]
                .as_array()
                .unwrap()
                .iter()
                .map(|w| {
                    w["balances"][asset]
                        .as_str()
                        .unwrap()
                        .parse::<u128>()
                        .unwrap()
                })
                .sum();
            assert_eq!(total.to_string(), state["supplies"][asset]);
        }
    }
}
fn asset_context(who: &str, deposit: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id("moon.testnet".parse().unwrap())
        .predecessor_account_id(who.parse().unwrap())
        .block_timestamp(560_000_000_000)
        .attached_deposit(near_sdk::NearToken::from_yoctonear(deposit));
    testing_env!(b.build());
}
#[test]
fn vendor_tokens_clear_atomically_conserve_supply_and_isolate_rounds() {
    let mut c = economy_fixture();
    assert_eq!(
        c.mt_balance_of("omar.sponsor.testnet".parse().unwrap(), "1:credits".into())
            .0,
        6000
    );
    assert_eq!(
        c.mt_balance_of("omar.sponsor.testnet".parse().unwrap(), "1:food".into())
            .0,
        12
    );
    finish_economy(&mut c);
    let closing = c.get_run_economy("1".into());
    assert_eq!(closing["locked"], true);
    assert!(
        closing["supplies"][1]
            .as_str()
            .unwrap()
            .parse::<u128>()
            .unwrap()
            < 2048
    );
    c.create_run(VERSION.into(), "another-day".into(), None);
    assert_eq!(closing, c.get_run_economy("1".into()));
    assert_eq!(
        c.mt_balance_of("omar.sponsor.testnet".parse().unwrap(), "2:food".into())
            .0,
        0
    );
}
#[test]
#[should_panic(expected = "Vendor account only")]
fn a_player_cannot_authorize_a_vendor_wallet() {
    let mut c = economy_fixture();
    c.accept_vendor_policy("moonpark-v6-persistent-vendors-1".into());
}
#[test]
#[should_panic(expected = "Vendor policy is awaiting")]
fn opening_requires_vendor_signatures() {
    context("sponsor.testnet", 1);
    let mut c = Moonpark::new("sponsor.testnet".parse().unwrap());
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "unsigned".into(), None);
}
#[test]
#[should_panic(expected = "Park assets are committed")]
fn active_game_assets_cannot_be_moved_out_of_the_economy() {
    let mut c = economy_fixture();
    asset_context("alice.testnet", 1);
    c.mt_transfer(
        "omar.sponsor.testnet".parse().unwrap(),
        "1:credits".into(),
        near_sdk::json_types::U128(100),
        None,
        None,
    );
}
#[test]
#[should_panic(expected = "Park assets are committed")]
fn operating_assets_remain_committed_after_opening_score() {
    let mut c = economy_fixture();
    finish_economy(&mut c);
    let alice: AccountId = "alice.testnet".parse().unwrap();
    let omar: AccountId = "omar.sponsor.testnet".parse().unwrap();
    let before = c.mt_balance_of(alice.clone(), "1:credits".into()).0;
    asset_context("alice.testnet", 1);
    c.mt_transfer(
        omar,
        "1:credits".into(),
        near_sdk::json_types::U128(100),
        None,
        Some("Closing-day tip".into()),
    );
    context("alice.testnet", 560_000_000_000);
    c.apply_actions(
        "1".into(),
        55,
        "paint".into(),
        vec![Command {
            kind: "theme".into(),
            value: 1,
            ..Default::default()
        }],
        0,
    );
    assert_eq!(c.mt_balance_of(alice, "1:credits".into()).0, before - 100);
}
#[test]
#[should_panic(expected = "Park assets are committed")]
fn operating_transfer_calls_cannot_bypass_the_vendor_policy() {
    let mut c = economy_fixture();
    finish_economy(&mut c);
    let alice: AccountId = "alice.testnet".parse().unwrap();
    let omar: AccountId = "omar.sponsor.testnet".parse().unwrap();
    let before = c.mt_balance_of(alice.clone(), "1:credits".into()).0;
    let supply = c.mt_supply("1:credits".into());
    asset_context("alice.testnet", 1);
    let _ = c.mt_transfer_call(
        omar.clone(),
        "1:credits".into(),
        near_sdk::json_types::U128(100),
        None,
        None,
        String::new(),
    );
    transfer_result(false);
    let spent = c.mt_resolve_transfer(
        alice.clone(),
        omar,
        vec!["1:credits".into()],
        vec![near_sdk::json_types::U128(100)],
    );
    assert_eq!(spent[0].0, 0);
    assert_eq!(c.mt_balance_of(alice, "1:credits".into()).0, before);
    assert_eq!(c.mt_supply("1:credits".into()), supply);
}
#[test]
fn identity_and_request_idempotency() {
    context("sponsor.testnet", 1_000_000_000);
    let mut c = new_contract();
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
    let mut c = new_contract();
    for n in 0..8 {
        let e = Entry {
            proof_hash: String::new(),
            revision: 0,
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
    let mut c = new_contract();
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
    let mut c = new_contract();
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
fn construction_continues_after_the_old_deadline() {
    context("sponsor.testnet", 1);
    let mut c = new_contract();
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
    let mut c = new_contract();
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
    let mut c = new_contract();
    deposit("sponsor.testnet", ownership::SHARE_CAP * 3, 1);
    c.fund_business_rewards();
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "run".into(), None);
    // Seed an earlier concession explicitly. New v4 runs never offer one.
    let mut record = c.get_run("1".into());
    let mut run: Run = serde_json::from_value(record["run"].clone()).unwrap();
    run.partnerships = moonpark_sim::partnerships::offers();
    run.partnerships[0].status = "active".into();
    run.partnerships[0].building = Some(2);
    run.partnerships[0].deadline = 160;
    run.grant_escrow = 18000;
    run.grant_cash = 42000;
    run.revision = 1;
    record["run"] = serde_json::to_value(&run).unwrap();
    record["last_request"] = "partner".into();
    c.runs.insert(&"1".into(), &record.to_string());
    c.issue_share("1", &run.partnerships[0], &"alice.testnet".parse().unwrap());
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
    let mut c = new_contract();
    deposit("sponsor.testnet", 1_000_000, 1);
    c.fund_prizes();
    for n in 0..5 {
        c.record_score(
            Entry {
                proof_hash: String::new(),
                revision: 0,
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

fn park_fixture() -> Moonpark {
    context("sponsor.testnet", 1);
    let mut c = new_contract();
    for who in ["alice.testnet", "bob.testnet", "carol.testnet"] {
        c.register_player(who.parse().unwrap(), format!("guest:{who}"), who.into());
    }
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "alice".into(), None);
    let mut record = c.get_run("1".into());
    let mut r = Run::new();
    while !r.finished {
        r.apply(&[], 10).unwrap();
    }
    r.buildings[0].served = 10;
    record["run"] = serde_json::to_value(r).unwrap();
    c.runs.insert(&"1".into(), &record.to_string());
    c.publish_blueprint("1".into(), "1".into(), 1, "Moonbeam".into());
    c
}
#[test]
fn claim_requires_recipient_signature_and_preserves_operator() {
    let mut c = park_fixture();
    c.nominate_park_owner("1".into(), Some("carol.testnet".parse().unwrap()));
    assert_eq!(
        c.get_park("1".into()).unwrap().owner.as_str(),
        "alice.testnet"
    );
    context("carol.testnet", 1);
    let p = c.accept_park("1".into());
    assert_eq!(p.owner.as_str(), "carol.testnet");
    assert_eq!(p.operator.as_str(), "alice.testnet");
    assert_eq!(c.accept_park("1".into()).owner, p.owner);
    assert!(c
        .get_park_by_owner("alice.testnet".parse().unwrap())
        .is_none());
}
#[test]
#[should_panic(expected = "Sign with the nominated")]
fn another_account_cannot_accept_a_claim() {
    let mut c = park_fixture();
    c.nominate_park_owner("1".into(), Some("carol.testnet".parse().unwrap()));
    context("bob.testnet", 1);
    c.accept_park("1".into());
}
#[test]
fn license_is_deposit_backed_idempotent_and_pays_current_creator_owner() {
    let mut c = park_fixture();
    c.nominate_park_owner("1".into(), Some("carol.testnet".parse().unwrap()));
    context("carol.testnet", 1);
    c.accept_park("1".into());
    context("bob.testnet", 1);
    c.create_run(VERSION.into(), "bob".into(), None);
    deposit("bob.testnet", parks::LICENSE_FEE, 1);
    c.license_blueprint("2".into(), "1:1:0".into());
    let amount = parks::LICENSE_FEE * 90 / 100;
    assert_eq!(c.creator_obligations, amount);
    assert_eq!(
        c.creator_earnings
            .get(&"carol.testnet".parse().unwrap())
            .unwrap()
            .available,
        amount
    );
    c.license_blueprint("2".into(), "1:1:0".into());
    assert_eq!(c.creator_obligations, amount);
    assert_eq!(c.get_blueprint("1:1:0".into()).unwrap().licenses, 1);
    assert!(c.has_license("2".into(), "1:1:0".into()));
    let bp = c.get_blueprint("1:1:0".into()).unwrap();
    c.validate_licenses(
        &"bob.testnet".parse().unwrap(),
        &[Command {
            kind: "build".into(),
            item: bp.kind,
            variant: bp.variant,
            value: bp.launch as i64,
            design: Some(bp.design),
            blueprint_id: Some(bp.id),
            ..Default::default()
        }],
    );
    context("carol.testnet", 1);
    let _ = c.claim_creator_earnings();
    assert_eq!(c.creator_obligations, amount);
    transfer_result(false);
    assert!(!c.on_creator_paid(
        "carol.testnet".parse().unwrap(),
        near_sdk::json_types::U128(amount)
    ));
    assert_eq!(c.creator_obligations, amount);
    context("carol.testnet", 1);
    let _ = c.claim_creator_earnings();
    transfer_result(true);
    assert!(c.on_creator_paid(
        "carol.testnet".parse().unwrap(),
        near_sdk::json_types::U128(amount)
    ));
    assert_eq!(c.creator_obligations, 0);
}
#[test]
#[should_panic(expected = "License this design first")]
fn license_provenance_cannot_be_forged() {
    let mut c = park_fixture();
    context("bob.testnet", 1);
    c.create_run(VERSION.into(), "bob".into(), None);
    let bp = c.get_blueprint("1:1:0".into()).unwrap();
    c.validate_licenses(
        &"bob.testnet".parse().unwrap(),
        &[Command {
            kind: "build".into(),
            item: bp.kind,
            variant: bp.variant,
            value: bp.launch as i64,
            design: Some(bp.design),
            blueprint_id: Some(bp.id),
            ..Default::default()
        }],
    );
}
#[test]
fn owner_reauthorization_and_sponsored_rotation_keep_a_stable_park() {
    let mut c = park_fixture();
    c.rotate_park_operator("1".into(), "bob.testnet".parse().unwrap());
    let p = c
        .get_park_by_operator("bob.testnet".parse().unwrap())
        .unwrap();
    assert_eq!(p.id, "1");
    assert_eq!(p.owner.as_str(), "alice.testnet");
    assert!(c
        .get_park_by_operator("alice.testnet".parse().unwrap())
        .is_none());
    c.set_park_operator("1".into(), "carol.testnet".parse().unwrap());
    assert_eq!(
        c.get_park("1".into()).unwrap().operator.as_str(),
        "carol.testnet"
    );
}
#[test]
fn reviews_are_once_per_park_and_can_be_updated() {
    let mut c = park_fixture();
    let p = c.get_park("1".into()).unwrap();
    c.save_park(
        "1".into(),
        p.revision,
        "Moonbeam Park".into(),
        1,
        Some("1".into()),
    );
    context("bob.testnet", 1);
    c.create_run(VERSION.into(), "bob".into(), None);
    c.rate_park("1".into(), 5);
    let p = c.rate_park("1".into(), 4);
    assert_eq!(p.rating_count, 1);
    assert_eq!(p.rating_sum, 4);
}

#[test]
fn track_construction_continues_after_the_old_deadline() {
    context("sponsor.testnet", 1);
    let mut c = new_contract();
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "day".into(), None);
    c.apply_actions(
        "1".into(),
        0,
        "build".into(),
        vec![Command {
            kind: "build".into(),
            item: "coaster".into(),
            x: 3,
            z: 8,
            ..Default::default()
        }],
        0,
    );
    context("alice.testnet", 566_000_000_001);
    c.apply_actions(
        "1".into(),
        1,
        "late-height".into(),
        vec![Command {
            kind: "design".into(),
            building: 3,
            design: Some(moonpark_sim::Design {
                height: 2,
                ..Default::default()
            }),
            ..Default::default()
        }],
        0,
    );
}

#[test]
fn deadline_keeps_free_cosmetic_edits_available() {
    context("sponsor.testnet", 1);
    let mut c = new_contract();
    c.register_player(
        "alice.testnet".parse().unwrap(),
        "guest:alice".into(),
        "Alice".into(),
    );
    context("alice.testnet", 1);
    c.create_run(VERSION.into(), "day".into(), None);
    context("alice.testnet", 566_000_000_001);
    let r = c.apply_actions(
        "1".into(),
        0,
        "paint".into(),
        vec![Command {
            kind: "design".into(),
            building: 1,
            design: Some(moonpark_sim::Design {
                palette: 3,
                ..Default::default()
            }),
            ..Default::default()
        }],
        0,
    );
    assert_eq!(r["run"]["cash"], 160000);
    assert_eq!(r["run"]["buildings"][0]["design"]["palette"], 3);
}

#[test]
fn published_blueprints_snapshot_inherited_park_colors() {
    let mut c = park_fixture();
    let mut record = c.get_run("1".into());
    record["run"]["palette"] = 3.into();
    record["run"]["buildings"][1]["kind"] = "wheel".into();
    record["run"]["buildings"][1]["served"] = 1.into();
    c.runs.insert(&"1".into(), &record.to_string());
    let bp = c.publish_blueprint("1".into(), "1".into(), 2, "Stardust Wheel".into());
    assert_eq!(bp.design.palette, 3);
}

#[test]
fn public_park_pages_count_published_parks_when_paging() {
    let mut c = park_fixture();
    context("bob.testnet", 1);
    c.create_run(VERSION.into(), "bob".into(), None);
    let mut p = c.get_park("2".into()).unwrap();
    p.run_id = Some("2".into());
    c.parks.insert(&p.id, &p);
    let listed = c.list_parks(None, Some(1));
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].id, "2");
}

#[test]
fn published_revisions_and_opening_scores_survive_continued_play() {
    let mut c = economy_fixture();
    finish_economy(&mut c);
    let record = c.get_run("1".into());
    let original_score = record["run"]["score"].clone();
    let park = c.get_park("1".into()).unwrap();
    c.save_park(
        "1".into(),
        park.revision,
        "Permanent Park".into(),
        0,
        Some("1".into()),
    );
    let snapshot = c.get_park_snapshot("1".into()).unwrap();
    let mut revision = record["run"]["revision"].as_u64().unwrap() as u32;
    for n in 0..10 {
        context("alice.testnet", 1_000_000_000_000 + n * 20_000_000_000);
        c.apply_actions("1".into(), revision, format!("returning-{n}"), vec![], 20);
        revision += 1;
    }
    let later = c.get_run("1".into());
    assert_eq!(later["run"]["score"], original_score);
    assert!(later["run"]["money_supply"].as_i64().unwrap() > snapshot.money_supply);
    assert_eq!(c.get_park_snapshot("1".into()).unwrap().hash, snapshot.hash);
    assert_eq!(
        c.get_run_economy("1".into())["supplies"][0],
        later["run"]["money_supply"].as_i64().unwrap().to_string()
    );
    assert_eq!(
        c.create_run(VERSION.into(), "return-to-my-park".into(), None),
        later
    );
}

#[test]
fn authorized_operator_handoff_preserves_the_live_economy() {
    let mut c = economy_fixture();
    context("sponsor.testnet", 20_000_000_000);
    c.register_player(
        "bob.testnet".parse().unwrap(),
        "guest:bob".into(),
        "Bob".into(),
    );
    context("alice.testnet", 20_000_000_000);
    c.apply_actions("1".into(), 0, "before-handoff".into(), vec![], 20);
    let original = c.get_run_economy("1".into());
    c.rotate_park_operator("1".into(), "bob.testnet".parse().unwrap());
    assert_eq!(c.get_run("1".into())["owner"], "bob.testnet");
    let moved = c.get_run_economy("1".into());
    assert_eq!(
        moved["wallets"][0]["balances"],
        original["wallets"][0]["balances"]
    );
    assert_eq!(moved["wallets"][0]["account_id"], "bob.testnet");
    context("bob.testnet", 40_000_000_000);
    c.apply_actions("1".into(), 1, "after-handoff".into(), vec![], 20);
    assert_eq!(c.get_run("1".into())["run"]["tick"], 40);
}
