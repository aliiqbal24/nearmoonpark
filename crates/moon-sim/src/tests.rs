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
        x: x + 8,
        z: z + 24,
        ..Default::default()
    }
}
#[test]
fn starting_budget_funds_two_coasters_and_a_wheel_without_creating_score() {
    let mut r = Run::new();
    assert_eq!(r.cash, 320000);
    assert_eq!(r.score.total, 0);
    r.apply(
        &[
            build("coaster", 3, 8),
            build("coaster", 11, 5),
            build("wheel", 22, 5),
        ],
        0,
    )
    .unwrap();
    assert_eq!(r.cash, 20000);
    assert_eq!(r.total_money(), r.money_supply);
    assert_eq!(r.score.total, 0);
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
fn park_keeps_building_and_earning_after_its_opening_score_is_sealed() {
    let mut r = Run::new();
    while !r.finished {
        r.apply(&[], 10).unwrap();
    }
    let score = r.score.clone();
    let tick = r.tick;
    r.apply(&[build("solar", 3, 2)], 0).unwrap();
    for _ in 0..100 {
        r.apply(&[], 20).unwrap();
    }
    assert!(r.tick > tick + 1000);
    assert_eq!(r.score, score);
    assert!(r.guests.len() > 96 && r.guests.len() <= 144);
    assert_eq!(r.total_money(), r.money_supply);
    assert!(r.money_supply > Run::new().money_supply);
}
#[test]
fn an_idle_vendor_remains_viable_without_bailouts() {
    let mut r = Run::new();
    r.apply(&[cmd("toggle", 2)], 0).unwrap();
    let cash = r.buildings[1].cash;
    for _ in 0..46 {
        r.apply(&[], 10).unwrap();
    }
    assert!(!r.buildings[1].insolvent);
    assert_eq!(r.buildings[1].cash, cash);
    r.apply(&[cmd("toggle", 2)], 0).unwrap();
    assert!(r.buildings[1].powered);
    assert_eq!(r.total_money(), r.money_supply);
    for kind in ["rent", "invest"] {
        let before = r.hash.clone();
        assert!(r
            .apply(
                &[Command {
                    kind: kind.into(),
                    building: 2,
                    value: 10000,
                    ..Default::default()
                }],
                0
            )
            .is_err());
        assert_eq!(r.hash, before);
    }
}
#[test]
fn paths_can_be_removed_and_reconnected() {
    let mut r = Run::new();
    let cash = r.cash;
    r.apply(
        &[Command {
            kind: "erase_path".into(),
            x: 20,
            z: 43,
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

#[test]
fn shuttles_deliver_small_groups_and_take_boarded_guests_home() {
    let mut r = Run::new();
    r.apply(&[], 10).unwrap();
    assert_eq!(
        r.guests.iter().filter(|g| g.status != "upcoming").count(),
        0
    );
    r.apply(&[], 1).unwrap();
    assert_eq!(
        r.guests.iter().filter(|g| g.status != "upcoming").count(),
        8
    );
    r.guests[0].status = "boarding".into();
    r.apply(&[], 19).unwrap();
    assert_eq!(r.guests[0].status, "gone");
    assert_eq!(r.departures[0], 1);
    assert_eq!(r.total_money(), r.money_supply);
}

#[test]
fn first_landing_has_a_full_opening_day_remaining() {
    let mut r = Run::new();
    r.apply(&[], LANDING as u16).unwrap();
    assert_eq!(END - r.tick, 540);
    assert!(r.guests.iter().all(|g| g.status == "upcoming"));
    r.apply(&[], 1).unwrap();
    assert_eq!(
        r.guests.iter().filter(|g| g.status == "arriving").count(),
        8
    );
}

#[test]
fn park_design_is_free_and_height_construction_is_charged_once() {
    let mut r = Run::new();
    r.apply(&[build("coaster", 3, 8)], 0).unwrap();
    let cash = r.cash;
    let design = Design {
        track: vec![],
        name: "Earthskimmer".into(),
        palette: 3,
        style: 1,
        lights: 2,
        height: 2,
    };
    r.apply(
        &[Command {
            kind: "design".into(),
            building: 3,
            design: Some(design.clone()),
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert_eq!(r.cash, cash - 20000);
    assert_eq!(r.buildings[2].power(), 4);
    let mut low = design.clone();
    low.height = 0;
    r.apply(
        &[Command {
            kind: "design".into(),
            building: 3,
            design: Some(low),
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    r.apply(
        &[Command {
            kind: "design".into(),
            building: 3,
            design: Some(design),
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert_eq!(r.cash, cash - 20000);
    assert_eq!(r.total_money(), r.money_supply);
}
#[test]
fn colors_remain_editable_after_closing_without_changing_score() {
    let mut r = Run::new();
    while !r.finished {
        r.apply(&[], 10).unwrap();
    }
    let score = r.score.clone();
    let cash = r.cash;
    r.apply(
        &[
            Command {
                kind: "theme".into(),
                value: 3,
                ..Default::default()
            },
            Command {
                kind: "design".into(),
                building: 1,
                design: Some(Design {
                    name: "Moonbeam".into(),
                    ..Default::default()
                }),
                ..Default::default()
            },
        ],
        0,
    )
    .unwrap();
    assert_eq!(r.score, score);
    assert_eq!(r.cash, cash);
    assert!(r.opening_ended_at.is_some());
    r.apply(&[build("wheel", 22, 12)], 0).unwrap();
    assert_eq!(r.score, score);
}
#[test]
fn invalid_design_batch_is_atomic_and_old_saves_have_defaults() {
    let mut r = Run::new();
    let before = r.hash.clone();
    assert!(r
        .apply(
            &[
                Command {
                    kind: "theme".into(),
                    value: 3,
                    ..Default::default()
                },
                Command {
                    kind: "design".into(),
                    building: 1,
                    design: Some(Design {
                        palette: 254,
                        ..Default::default()
                    }),
                    ..Default::default()
                }
            ],
            0
        )
        .is_err());
    assert_eq!(r.hash, before);
    assert_eq!(r.palette, 0);
    let mut old = serde_json::to_value(&r).unwrap();
    old["buildings"][0]
        .as_object_mut()
        .unwrap()
        .remove("design");
    let restored: Run = serde_json::from_value(old).unwrap();
    assert_eq!(restored.buildings[0].design, Design::default());
    assert!(r.partnerships.is_empty());
    assert!(r.apply(&[cmd("partner", 2)], 0).is_err());
}
#[test]
fn opening_cohort_is_fixed_and_conserves_guest_budgets() {
    let mut good = Run::new();
    let mut poor = Run::new();
    for r in [&mut good, &mut poor] {
        r.tick = 119;
        r.guests[0].status = "gone".into();
        r.guests[0].visits = 1;
    }
    good.guests[0].satisfaction = 100;
    poor.guests[0].satisfaction = 20;
    good.apply(&[], 1).unwrap();
    poor.apply(&[], 1).unwrap();
    assert_eq!(good.bookings[3], 8);
    assert_eq!(poor.bookings[3], 8);
    assert_eq!(
        poor.guests
            .iter()
            .filter(|g| g.status == "cancelled")
            .count(),
        0
    );
    assert_eq!(poor.total_money(), poor.money_supply);
}

#[test]
fn eight_building_types_include_only_two_merchants_and_automatic_maintenance() {
    assert_eq!(catalog::CATALOG.len(), 8);
    assert_eq!(
        catalog::CATALOG.iter().filter(|a| tenant(a.kind)).count(),
        2
    );
    let mut r = Run::new();
    r.apply(&[build("depot", 27, 17), cmd("connect", 3)], 0)
        .unwrap();
    r.buildings[0].condition = 40;
    let before = r.cash;
    r.apply(&[], 15).unwrap();
    assert_eq!(r.buildings[2].served, 1);
    assert_eq!(r.buildings[2].cash, 0);
    assert_eq!(r.buildings[2].stock, 0);
    assert_eq!(r.cash, before - catalog::REPAIR_FEE);
    assert_eq!(r.consumed[2], 1);
    assert_eq!(r.supplies[2], 2047);
    assert_eq!(r.total_money(), r.money_supply);
}

#[test]
fn custom_track_is_validated_priced_and_saved_atomically() {
    let mut r = Run::new();
    r.apply(&[build("coaster", 3, 8)], 0).unwrap();
    let track: Vec<TrackPoint> = serde_json::from_str(r#"[{"x":-32,"y":12,"z":34},{"x":30,"y":12,"z":34},{"x":39,"y":36,"z":0},{"x":28,"y":95,"z":-32},{"x":-12,"y":105,"z":-34},{"x":-39,"y":35,"z":-16},{"x":-18,"y":48,"z":9},{"x":12,"y":24,"z":15}]"#).unwrap();
    let design = Design {
        track,
        ..Default::default()
    };
    let cash = r.cash;
    let c = Command {
        kind: "design".into(),
        building: 3,
        design: Some(design.clone()),
        ..Default::default()
    };
    r.apply(&[c.clone()], 0).unwrap();
    assert_eq!(r.cash, cash - design.construction_cost());
    let paid = r.cash;
    r.apply(&[c.clone()], 0).unwrap();
    assert_eq!(r.cash, paid);
    let mut invalid = c;
    invalid.design.as_mut().unwrap().track[3].x = 41;
    let hash = r.hash.clone();
    assert!(r.apply(&[invalid], 0).is_err());
    assert_eq!(r.hash, hash);
    let roundtrip: Run = serde_json::from_str(&serde_json::to_string(&r).unwrap()).unwrap();
    assert_eq!(roundtrip.buildings[2].design, design);
}
#[test]
fn long_running_park_crosses_the_old_tick_limit_and_replenishes_goods() {
    let mut r = Run::new();
    while !r.finished {
        r.apply(&[], 20).unwrap();
    }
    let score = r.score.clone();
    while r.tick < 66000 {
        r.apply(&[], 20).unwrap();
    }
    assert_eq!(r.score, score);
    assert_eq!(r.total_money(), r.money_supply);
    assert!(r.guests.len() <= 144);
    for good in 0..3 {
        let stock: u32 = r
            .buildings
            .iter()
            .filter(|b| b.kind == ["food", "drink", "depot"][good])
            .map(|b| b.stock as u32 + b.delivery_qty as u32)
            .sum();
        assert_eq!(
            r.supplies[good] as u32 + stock + r.consumed[good],
            r.issued_goods[good]
        );
    }
}
