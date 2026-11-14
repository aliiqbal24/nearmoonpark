use moonpark_sim::{Command, Run};
use serde_json::json;
fn build(k: &str, x: u8, z: u8) -> Command {
    Command {
        kind: "build".into(),
        item: k.into(),
        x: x + 8,
        z: z + 24,
        ..Default::default()
    }
}
fn action(k: &str, id: u32, value: i64) -> Command {
    Command {
        kind: k.into(),
        building: id,
        value,
        ..Default::default()
    }
}
fn main() {
    let mut run = Run::new();
    let mut frames = vec![];
    let strategy = std::env::args().nth(1).unwrap_or("balanced".into());
    let price = std::env::args()
        .nth(2)
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(1000);
    let launch = std::env::args()
        .nth(3)
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(2);
    while !run.finished {
        let mut commands = vec![];
        let has = |k: &str| run.buildings.iter().any(|b| b.kind == k && !b.sold);
        if run.tick == 0 && strategy != "idle" {
            commands = if strategy == "family" {
                vec![
                    build("wheel", 22, 12),
                    action("connect", 3, 0),
                    build("drink", 23, 17),
                    action("connect", 4, 0),
                ]
            } else {
                vec![build("coaster", 3, 8), action("connect", 3, 0)]
            };
        } else if strategy == "balanced" || strategy == "family" || strategy == "gold" {
            let id = run.buildings.len() as u32 + 1;
            if !has("drink") && run.cash >= 15200 {
                commands = vec![build("drink", 23, 17), action("connect", id, 0)];
            } else if !has("wheel") && run.cash >= 61000 {
                commands = vec![build("wheel", 22, 12), action("connect", id, 0)];
            } else if strategy == "family" && !has("coaster") && run.cash >= 122000 {
                commands = vec![build("coaster", 3, 8), action("connect", id, 0)];
            } else if has("wheel")
                && has("coaster")
                && !has("solar")
                && run.cash >= 31000
                && run.tick >= 180
            {
                commands = vec![build("solar", 16, 6), action("connect", id, 0)];
            } else if has("solar") && !has("depot") && run.cash >= 25200 {
                commands = vec![build("depot", 27, 17), action("connect", id, 0)];
            } else if has("depot") && !has("rover") && run.cash >= 81000 {
                commands = vec![build("rover", 13, 10), action("connect", id, 0)];
            }
        }
        if commands
            .iter()
            .any(|c| c.kind == "build" && c.item == "coaster")
        {
            let id = run.buildings.len() as u32 + 1;
            commands.push(action("price", id, price));
            commands.push(action("launch", id, launch));
        }
        let before = run.clone();
        if let Err(e) = run.apply(&commands, 10) {
            eprintln!("At {}: {}", before.tick, e);
            run = before;
            commands.clear();
            run.apply(&[], 10).unwrap();
        }
        frames.push(json!({"commands":commands,"ticks":10,"run":run}));
    }
    println!(
        "{}",
        json!({"strategy":strategy,"frames":frames,"final":run})
    );
}
