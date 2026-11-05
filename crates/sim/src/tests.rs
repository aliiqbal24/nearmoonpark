use super::*;
fn cmd(kind: &str, option: u8) -> Command {
    Command {
        kind: kind.into(),
        option,
        target: 2,
    }
}
fn play(path: [u8; 8], seed: u32) -> Run {
    let mut s = Run::new(seed);
    for o in path {
        if s.ending.is_some() {
            break;
        }
        s.apply(cmd("choice", o), 3).unwrap();
    }
    s
}
#[test]
fn strategies_and_endings() {
    for seed in [0, 1, 2, 42, 84, 999] {
        for p in [[0, 1, 0, 0, 0, 0, 2, 0], [1, 1, 2, 0, 0, 0, 2, 0]] {
            let s = play(p, seed);
            assert_eq!(
                s.ending.as_deref(),
                Some("A New Dawn"),
                "seed {seed} path {p:?}"
            );
        }
    }
    assert_eq!(play([2; 8], 42).ending.as_deref(), Some("A Fragile Home"));
    assert_eq!(
        play([0, 2, 1, 0, 1, 2, 0, 1], 42).ending.as_deref(),
        Some("Survival at a Cost")
    );
    assert_eq!(
        play([2, 2, 1, 2, 0, 2, 0, 1], 42).ending.as_deref(),
        Some("The Last Light")
    );
}
#[test]
fn credits_conserved_and_nonnegative() {
    for seed in 0..10 {
        let mut s = Run::new(seed);
        let money = s.total_credits();
        for o in [0, 1, 0, 0, 0, 0, 2, 0] {
            s.apply(cmd("choice", o), 3).unwrap();
            assert_eq!(s.total_credits(), money);
            for a in &s.actors {
                assert!(a.credits >= 0);
                assert!(a.inventory.iter().all(|q| *q >= 0));
            }
            assert_eq!(s.trades.len(), 0);
        }
    }
}
#[test]
fn invalid_commands_are_atomic() {
    let mut s = Run::new(42);
    let original = serde_json::to_string(&s).unwrap();
    assert!(s.apply(cmd("advance", 0), 1).is_err());
    assert!(s.apply(cmd("choice", 7), 1).is_err());
    assert!(s.apply(cmd("choice", 0), 4).is_err());
    assert_eq!(original, serde_json::to_string(&s).unwrap());
}
#[test]
fn replay_and_fast_forward_agree() {
    let mut a = Run::new(84);
    let mut b = a.clone();
    for o in [0, 1, 0, 0, 0, 0, 2, 0] {
        a.apply(cmd("choice", o), 3).unwrap();
        b.apply(cmd("choice", o), 0).unwrap();
        for _ in 0..3 {
            b.apply(cmd("advance", 0), 1).unwrap();
        }
        let mut x = a.clone();
        let mut y = b.clone();
        x.revision = 0;
        y.revision = 0;
        x.hash.clear();
        y.hash.clear();
        for d in &mut x.days {
            d.hash.clear()
        }
        for d in &mut y.days {
            d.hash.clear()
        }
        assert_eq!(
            serde_json::to_value(&x).unwrap(),
            serde_json::to_value(&y).unwrap()
        );
        assert_eq!(
            x.actors.iter().map(|a| a.credits).collect::<Vec<_>>(),
            y.actors.iter().map(|a| a.credits).collect::<Vec<_>>()
        );
        assert_eq!(x.reserves(), y.reserves());
        assert_eq!(a.wellbeing, b.wellbeing);
    }
}
#[test]
fn aid_is_bounded_and_real() {
    let mut s = Run::new(42);
    let cache = s.emergency;
    let money = s.total_credits();
    s.apply(cmd("aid", 0), 0).unwrap();
    assert_eq!(s.aid_left, 2);
    assert_eq!(s.actors[8].inventory[0], 40);
    assert_eq!(s.emergency[0], cache[0] - 40);
    assert!(s.apply(cmd("aid", 0), 0).is_err());
    assert_eq!(s.total_credits(), money);
}
#[test]
fn all_legal_prefixes_have_a_continuation() {
    fn walk(s: Run) {
        if s.ending.is_some() {
            return;
        }
        let mut legal = 0;
        for o in 0..3 {
            let mut n = s.clone();
            if n.apply(cmd("choice", o), 3).is_ok() {
                legal += 1;
                walk(n)
            }
        }
        assert!(legal > 0, "sol {}", s.sol)
    }
    walk(Run::new(42));
}
#[test]
fn last_light_reachable() {
    let mut s = Run::new(42);
    s.sol = 18;
    s.pending = false;
    s.wellbeing = 10;
    s.hardship = 7;
    s.life_debt = 160;
    for a in &mut s.actors {
        a.credits = 0;
        a.inventory = [0; 5];
        a.condition = 15;
    }
    s.apply(cmd("advance", 0), 1).unwrap();
    assert_eq!(s.ending.as_deref(), Some("The Last Light"));
}
#[test]
fn causal_history_and_real_trades() {
    let s = play([1, 1, 2, 0, 0, 0, 2, 0], 42);
    assert!(s.days.iter().flat_map(|d| &d.trades).count() > 400);
    for e in &s.events {
        for c in &e.causes {
            assert!(*c < e.id)
        }
    }
    assert!(s.events.iter().any(|e| e.kind == "shortage"));
}
