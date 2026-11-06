use super::*;
fn cmd(kind: &str, building: u32) -> Command {
    Command {
        kind: kind.into(),
        building,
        ..Default::default()
    }
}
fn build(kind: &str, x: u8, z: u8) -> Command {
    Command {
        kind: "build".into(),
        item: kind.into(),
        x,
        z,
        ..Default::default()
    }
}
#[test]
fn money_is_conserved_for_a_complete_park() {
    let mut r = Run::new();
    r.apply(&[build("coaster", 3, 8), cmd("connect", 3)], 0)
        .unwrap();
    while !r.finished {
        r.apply(&[], 10).unwrap();
        assert_eq!(r.total_money(), r.money_supply);
        assert!(r.cash >= 0);
        assert!(r.guests.iter().all(|g| g.cash >= 0));
        assert!(r.buildings.iter().all(|b| b.cash >= 0));
        for good in 0..3 {
            let kind = ["food", "drink", "depot"][good];
            let stock = r
                .buildings
                .iter()
                .filter(|b| b.kind == kind)
                .map(|b| b.stock as u32 + b.delivery_qty as u32)
                .sum::<u32>();
            assert_eq!(
                r.supplies[good] as u32 + stock + r.consumed[good] as u32,
                2048
            );
        }
    }
    assert!(r.trade_count > 200);
    assert!(r.score.total > 2000);
    assert_eq!(r.guests.len(), 96);
    println!(
        "Score {} / trades {} / cash {} / happy {}",
        r.score.total, r.trade_count, r.cash, r.score.happy
    );
}
#[test]
fn invalid_batch_is_atomic() {
    let mut r = Run::new();
    let before = serde_json::to_string(&r).unwrap();
    assert!(r
        .apply(&[build("wheel", 22, 14), build("coaster", 11, 16)], 0)
        .is_err());
    assert_eq!(before, serde_json::to_string(&r).unwrap());
}
#[test]
fn placement_and_connectivity() {
    let mut r = Run::new();
    r.apply(&[build("wheel", 22, 14)], 0).unwrap();
    assert!(!r.buildings[2].connected);
    r.apply(&[cmd("connect", 3)], 0).unwrap();
    assert!(r.buildings[2].connected);
    assert!(r.apply(&[build("wheel", 22, 14)], 0).is_err());
}
#[test]
fn score_is_not_created_by_resale() {
    let mut r = Run::new();
    let equity = r.equity();
    r.apply(&[cmd("sell", 1)], 0).unwrap();
    assert_eq!(r.equity(), equity);
    assert_eq!(r.score.finance, 0);
    assert_eq!(r.total_money(), r.money_supply);
}
#[test]
fn batching_and_speed_do_not_change_economics() {
    let mut a = Run::new();
    let mut b = a.clone();
    for _ in 0..10 {
        a.apply(&[], 1).unwrap();
    }
    b.apply(&[], 10).unwrap();
    a.revision = 0;
    b.revision = 0;
    a.rehash();
    b.rehash();
    assert_eq!(a.hash, b.hash);
}
#[test]
fn merchant_pricing_is_transparent() {
    assert!(catalog::merchant_price("food", 2, 8) > catalog::merchant_price("food", 16, 0));
}
#[test]
fn closed_round_rejects_actions() {
    let mut r = Run::new();
    for _ in 0..54 {
        r.apply(&[], 10).unwrap()
    }
    assert!(r.apply(&[cmd("sell", 1)], 0).is_err());
}
#[test]
fn a_struggling_tenant_can_reopen_after_investment() {
    let mut r = Run::new();
    r.apply(&[cmd("toggle", 2)], 0).unwrap();
    for _ in 0..46 {
        r.apply(&[], 10).unwrap();
    }
    assert!(r.buildings[1].insolvent);
    let before = r.total_money();
    r.apply(
        &[Command {
            kind: "invest".into(),
            building: 2,
            value: 10000,
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert!(!r.buildings[1].insolvent);
    assert_eq!(r.total_money(), before);
}
#[test]
fn paths_can_be_removed_and_reconnected() {
    let mut r = Run::new();
    let cash = r.cash;
    r.apply(
        &[Command {
            kind: "erase_path".into(),
            x: 12,
            z: 19,
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert!(!r.buildings[0].connected);
    assert_eq!(r.cash, cash);
    r.apply(&[cmd("connect", 1)], 0).unwrap();
    assert!(r.buildings[0].connected);
    assert_eq!(r.cash, cash - 200);
}
#[test]
fn launch_settings_have_a_real_throughput_tradeoff() {
    let mut b = make_building(1, "coaster", 3, 8, 0, 0, 0);
    b.launch = 1;
    let gentle = b.duration();
    let low = b.power();
    b.launch = 3;
    assert!(b.duration() < gentle);
    assert!(b.power() > low);
}
