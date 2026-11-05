use last_signal_sim::{Command, Run};
fn main() {
    for path in [
        [0, 1, 0, 0, 0, 0, 2, 0],
        [1, 1, 2, 0, 0, 0, 2, 0],
        [2, 2, 1, 2, 2, 2, 1, 1],
        [0; 8],
        [1; 8],
        [2; 8],
    ] {
        let mut s = Run::new(42);
        for o in path {
            if s.ending.is_some() {
                break;
            }
            if let Err(e) = s.apply(
                Command {
                    kind: "choice".into(),
                    option: o,
                    target: 0,
                },
                3,
            ) {
                println!("err {e}");
                break;
            }
            println!(
                "sol{} pop{} well{} stock{:?} cash{} cond{:?}",
                s.sol,
                s.population,
                s.wellbeing,
                s.reserves(),
                s.actors[8].credits,
                s.actors[..5]
                    .iter()
                    .map(|a| a.condition)
                    .collect::<Vec<_>>()
            );
        }
        println!(
            "{:?} => {:?} sustainable{}",
            path,
            s.ending,
            s.sustainable()
        );
    }
}
