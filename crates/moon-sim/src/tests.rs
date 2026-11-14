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
        design: Some(if kind == "coaster" {
            Design::starter()
        } else {
            Design::default()
        }),
        ..Default::default()
    }
}
fn opened() -> Run {
    let mut run = Run::new();
    run.apply(&[build("coaster", 2, 16)], 0).unwrap();
    run
}
fn assert_conservation(r: &Run) {
    assert_eq!(r.total_money(), r.money_supply);
    assert!(r.cash >= 0 && r.supplier_cash >= 0);
    assert!(r.guests.iter().all(|g| g.cash >= 0));
    assert!(r.buildings.iter().all(|b| b.cash >= 0));
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
#[test]
fn opening_has_ready_stores_and_waits_for_designed_coaster() {
    let mut r = Run::new();
    assert_eq!(r.cash, 320000);
    assert_eq!(r.buildings.len(), 3);
    r.apply(&[], 20).unwrap();
    assert_eq!(r.tick, 0);
    assert!(r.apply(&[build("wheel", 30, 29)], 0).is_err());
    assert!(r.buildings.iter().all(|b| b.connected && b.ready_at == 0));
    r.apply(&[build("coaster", 2, 16)], 0).unwrap();
    assert_eq!(r.opening_stage, 2);
    assert!(r.buildings[3].connected);
    r.apply(&[], 11).unwrap();
    assert_eq!(r.tick, 11);
    assert_eq!(
        r.guests.iter().filter(|g| g.status == "arriving").count(),
        8
    );
    assert_conservation(&r);
}
#[test]
fn first_meal_advances_the_near_economy_lesson() {
    let mut r = opened();
    for _ in 0..30 {
        r.apply(&[], 10).unwrap();
        if r.opening_stage == 3 {
            break;
        }
    }
    assert_eq!(r.opening_stage, 3);
    assert!(r.buildings[0].served > 0);
    assert!(r.trade_count > 0);
    assert_conservation(&r);
}
#[test]
fn starter_design_matches_browser_geometry() {
    let d = Design::starter();
    d.validate().unwrap();
    assert_eq!(d.construction_cost(), 0);
    assert_eq!((d.track_w, d.track_h), (16, 21));
}
#[test]
fn map_tracks_can_cross_more_than_thirty_tiles_and_reach_sixty_metres() {
    let mut d = Design::starter();
    d.track_w = 30;
    d.track_h = 30;
    d.track[0] = TrackPoint {
        x: 120,
        y: 12,
        z: 285,
    };
    d.track[1] = TrackPoint {
        x: 180,
        y: 12,
        z: 285,
    };
    d.track[3].y = 600;
    d.validate().unwrap();
    d.track[3].y = 601;
    assert!(d.validate().is_err());
    d.track[3].y = 600;
    d.track_w = 48;
    assert!(d.validate().is_ok());
    d.track_w = 49;
    assert!(d.validate().is_err());
}
#[test]
fn track_validation_rejects_bad_stations_and_tiny_segments() {
    let mut d = Design::starter();
    d.track[0].x += 1;
    assert!(d.validate().is_err());
    let mut d = Design::starter();
    d.track[3] = d.track[2].clone();
    assert!(d.validate().is_err());
    d = Design::starter();
    d.track[3].x = -1;
    assert!(d.validate().is_err());
}
#[test]
fn track_control_point_count_is_bounded() {
    let mut d = Design::starter();
    d.track.truncate(3);
    assert!(d.validate().is_err());
    d = Design::starter();
    while d.track.len() < 257 {
        d.track.push(d.track[3].clone());
    }
    assert!(d.validate().is_err());
}
#[test]
fn construction_requires_a_designed_loop() {
    let mut r = Run::new();
    let mut c = build("coaster", 2, 16);
    c.design = None;
    assert!(r.apply(&[c], 0).is_err());
    assert_eq!(r.buildings.len(), 3);
}
#[test]
fn only_station_and_track_reserve_space() {
    let mut r = opened();
    let coaster = r.buildings[3].clone();
    assert_eq!(coaster.footprint(), (16, 21));
    assert!(coaster.occupied_cells(false).len() < 16 * 21);
    r.apply(&[build("bounce", 9, 24)], 0).unwrap();
    assert!(r.apply(&[build("wheel", 3, 16)], 0).is_err());
}
#[test]
fn elevated_track_leaves_paths_clear_and_low_track_blocks_them() {
    let r = opened();
    let coaster = &r.buildings[3];
    let elevated = coaster.occupied_cells(false);
    let ground = coaster.occupied_cells(true);
    let clear = *elevated.iter().find(|cell| !ground.contains(cell)).unwrap();
    let mut drawing = r.clone();
    drawing
        .apply(
            &[Command {
                kind: "paint_paths".into(),
                cells: vec![clear],
                ..Default::default()
            }],
            0,
        )
        .unwrap();
    assert!(drawing.paths.contains(&clear));
    let blocked = ground[0];
    let before = drawing.hash.clone();
    assert!(drawing
        .apply(
            &[Command {
                kind: "paint_paths".into(),
                cells: vec![blocked],
                ..Default::default()
            }],
            0
        )
        .is_err());
    assert_eq!(drawing.hash, before);
}
#[test]
fn path_strokes_deduplicate_and_commit_atomically() {
    let mut r = opened();
    let cash = r.cash;
    r.apply(
        &[Command {
            kind: "paint_paths".into(),
            cells: vec![1800, 1801, 1801],
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert_eq!(r.cash, cash - 400);
    let before = r.hash.clone();
    assert!(r
        .apply(
            &[Command {
                kind: "paint_paths".into(),
                cells: vec![1802, WIDTH * HEIGHT],
                ..Default::default()
            }],
            0
        )
        .is_err());
    assert_eq!(r.hash, before);
    assert!(!r.paths.contains(&1802));
    assert_conservation(&r);
}
#[test]
fn bounce_height_is_chosen_before_construction_and_controls_appeal() {
    for (height, thrill) in [(8, 1), (14, 2), (22, 4)] {
        let mut r = opened();
        let mut c = build("bounce", 25, 30);
        c.design.as_mut().unwrap().bounce_height = height;
        r.apply(&[c], 0).unwrap();
        assert_eq!(r.buildings[4].thrill(), thrill);
        let mut design = r.buildings[4].design.clone();
        design.bounce_height = if height == 8 { 14 } else { 8 };
        let before = r.hash.clone();
        assert!(r
            .apply(
                &[Command {
                    design: Some(design),
                    ..cmd("design", 5)
                }],
                0
            )
            .is_err());
        assert_eq!(r.hash, before);
    }
}
#[test]
fn invalid_batch_is_atomic() {
    let mut r = Run::new();
    let before = serde_json::to_string(&r).unwrap();
    assert!(r
        .apply(&[build("coaster", 2, 16), build("food", 17, 41)], 0)
        .is_err());
    assert_eq!(before, serde_json::to_string(&r).unwrap());
}
#[test]
fn placement_and_connectivity() {
    let mut r = opened();
    r.apply(&[build("wheel", 30, 29)], 0).unwrap();
    assert!(!r.buildings[4].connected);
    r.apply(&[cmd("connect", 5)], 0).unwrap();
    assert!(r.buildings[4].connected);
    assert!(r.apply(&[build("wheel", 30, 29)], 0).is_err());
}
#[test]
fn tickets_and_opening_are_automatic() {
    let mut r = opened();
    for kind in ["price", "toggle", "rent", "invest"] {
        let before = r.hash.clone();
        let mut c = cmd(kind, 4);
        c.value = 2000;
        assert!(r.apply(&[c], 0).is_err());
        assert_eq!(r.hash, before);
    }
}
#[test]
fn sale_always_returns_half_investment_despite_wear() {
    let mut r = opened();
    r.buildings[3].condition = 1;
    let before = r.cash;
    let invested = r.buildings[3].invested;
    r.apply(&[cmd("sell", 4)], 0).unwrap();
    assert_eq!(r.cash, before + invested / 2);
    assert!(r.buildings[3].sold);
    assert_conservation(&r);
}
#[test]
fn occupied_rides_sell_after_their_passengers_finish() {
    let mut r = opened();
    r.guests[0].status = "riding".into();
    r.guests[0].target = Some(4);
    r.buildings[3].riders = vec![0];
    r.buildings[3].cycle_left = 2;
    let before = r.cash;
    r.apply(&[cmd("sell", 4)], 0).unwrap();
    assert!(r.buildings[3].pending_sale);
    assert!(!r.buildings[3].sold);
    assert_eq!(r.cash, before);
    r.apply(&[], 2).unwrap();
    assert!(r.buildings[3].sold);
    assert_eq!(r.cash, before + 60000);
    assert_eq!(r.guests[0].status, "walking");
    assert_conservation(&r);
}
#[test]
fn redesign_is_free_and_preserves_passengers() {
    let mut r = opened();
    r.buildings[3].riders = vec![0];
    r.buildings[3].cycle_left = 10;
    let mut d = r.buildings[3].design.clone();
    d.track[3].y = 600;
    d.name = "Skyline".into();
    let cash = r.cash;
    r.apply(
        &[Command {
            design: Some(d.clone()),
            ..cmd("design", 4)
        }],
        0,
    )
    .unwrap();
    assert_eq!(r.cash, cash);
    assert_eq!(r.buildings[3].riders, vec![0]);
    assert!(r.buildings[3].cycle_left > 0);
    assert_eq!(r.buildings[3].design, d);
    assert_conservation(&r);
}
#[test]
fn expansions_cannot_cover_other_rides_or_paths() {
    let mut r = opened();
    r.apply(&[build("wheel", 30, 29)], 0).unwrap();
    let mut d = r.buildings[3].design.clone();
    d.track_w = 30;
    d.track_h = 30;
    d.track[0] = TrackPoint {
        x: 120,
        y: 12,
        z: 285,
    };
    d.track[1] = TrackPoint {
        x: 180,
        y: 12,
        z: 285,
    };
    assert!(r
        .apply(
            &[Command {
                design: Some(d),
                ..cmd("design", 4)
            }],
            0
        )
        .is_err());
}
#[test]
fn solar_exports_pay_from_logistics_without_minting() {
    let mut r = opened();
    r.apply(&[build("solar", 24, 34), cmd("connect", 5)], 0)
        .unwrap();
    r.buildings[4].ready_at = 0;
    let before = r.cash;
    let supplier = r.supplier_cash;
    r.apply(&[], 20).unwrap();
    assert_eq!(r.cash, before + 500);
    assert_eq!(r.supplier_cash, supplier - 500);
    assert_eq!(r.buildings[4].revenue, 500);
    assert_conservation(&r);
}
#[test]
fn every_connected_ready_ride_operates_without_a_power_budget() {
    let mut r = opened();
    r.cash += 500000;
    r.supplier_cash -= 500000;
    for (id, x) in [(5, 30), (6, 35), (7, 40)] {
        r.apply(&[build("wheel", x, 29), cmd("connect", id)], 0)
            .unwrap();
    }
    r.apply(&[], 20).unwrap();
    assert!(r.buildings.iter().all(|b| b.powered));
}
#[test]
fn money_and_goods_are_conserved_through_opening_and_returning_visits() {
    let mut r = opened();
    for _ in 0..120 {
        r.apply(&[], 10).unwrap();
        assert_conservation(&r);
    }
    assert!(r.finished);
    let score = r.score.clone();
    for _ in 0..100 {
        r.apply(&[], 20).unwrap();
        assert_conservation(&r);
    }
    assert_eq!(r.score, score);
    assert!(r.guests.len() > 96 && r.guests.len() <= 144);
}
#[test]
fn score_is_not_created_by_resale() {
    let mut r = opened();
    let equity = r.equity();
    r.apply(&[cmd("sell", 4)], 0).unwrap();
    assert!(r.equity() <= equity);
    assert_eq!(r.score.finance, 0);
    assert_conservation(&r);
}
#[test]
fn batching_does_not_change_economics() {
    let mut a = opened();
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
fn paths_can_be_removed_without_changing_money_supply() {
    let mut r = opened();
    let cell = r.buildings[0].entry();
    let cash = r.cash;
    r.apply(
        &[Command {
            kind: "erase_path".into(),
            x: (cell % WIDTH) as u8,
            z: (cell / WIDTH) as u8,
            ..Default::default()
        }],
        0,
    )
    .unwrap();
    assert!(!r.buildings[0].connected);
    assert_eq!(r.cash, cash);
    r.apply(&[cmd("connect", 1)], 0).unwrap();
    assert!(r.buildings[0].connected);
    assert_conservation(&r);
}
#[test]
fn eight_types_have_two_automatic_vendor_businesses() {
    assert_eq!(catalog::CATALOG.len(), 8);
    assert_eq!(
        catalog::CATALOG.iter().filter(|a| tenant(a.kind)).count(),
        2
    );
    assert!(catalog::merchant_price("food", 2, 8) > catalog::merchant_price("food", 16, 0));
}
#[test]
fn maintenance_uses_parts_and_preserves_money() {
    let mut r = opened();

    r.buildings[3].condition = 40;
    r.apply(&[], 15).unwrap();
    assert_eq!(r.buildings[2].served, 1);
    assert_eq!(r.consumed[2], 1);
    assert_conservation(&r);
}
#[test]
fn invalid_design_does_not_change_park_or_theme() {
    let mut r = opened();
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
                    design: Some(Design {
                        palette: 254,
                        ..Default::default()
                    }),
                    ..cmd("design", 4)
                }
            ],
            0
        )
        .is_err());
    assert_eq!(r.hash, before);
    assert!(r.partnerships.is_empty());
}
#[test]
fn long_running_park_crosses_old_tick_limit_without_corruption() {
    let mut r = opened();
    while !r.finished {
        r.apply(&[], 20).unwrap();
    }
    let score = r.score.clone();
    while r.tick < 66000 {
        r.apply(&[], 20).unwrap();
    }
    assert_eq!(r.score, score);
    assert_conservation(&r);
    assert!(r.guests.len() <= 144);
}
