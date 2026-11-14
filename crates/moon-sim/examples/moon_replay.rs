use moonpark_sim::{Command, Design, Run};
use serde_json::json;
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
fn connect(building: u32) -> Command {
    Command {
        kind: "connect".into(),
        building,
        ..Default::default()
    }
}
fn main() {
    let mut run = Run::new();
    let mut frames = vec![];
    let strategy = std::env::args().nth(1).unwrap_or("balanced".into());
    while !run.finished {
        let mut commands = vec![];
        let has = |kind: &str| run.buildings.iter().any(|b| b.kind == kind && !b.sold);
        if run.opening_stage == 0 {
            commands = vec![build("coaster", 2, 16)];
        } else if ["balanced", "family", "gold"].contains(&strategy.as_str()) {
            let id = run.buildings.len() as u32 + 1;
            let next = if !has("bounce") {
                Some(("bounce", 21, 39, 31000))
            } else if !has("drink") {
                Some(("drink", 31, 41, 16000))
            } else if !has("wheel") {
                Some(("wheel", 30, 29, 64000))
            } else if !has("rover") {
                Some(("rover", 21, 29, 84000))
            } else if !has("depot") {
                Some(("depot", 35, 41, 27000))
            } else if !has("solar") {
                Some(("solar", 24, 34, 33000))
            } else {
                None
            };
            if let Some((kind, x, z, cost)) = next {
                if run.cash >= cost {
                    commands = vec![build(kind, x, z), connect(id)];
                }
            }
        }
        if strategy == "family" && run.opening_stage == 0 {
            commands.push(Command {
                kind: "launch".into(),
                building: 4,
                value: 1,
                ..Default::default()
            });
        }
        run.apply(&commands, 10)
            .unwrap_or_else(|e| panic!("At {}: {e}", run.tick));
        frames.push(json!({"commands":commands,"ticks":10,"run":run}));
    }
    println!(
        "{}",
        json!({"strategy":strategy,"frames":frames,"final":run})
    );
}
