use last_signal_sim::{Command, Run};
use std::collections::BTreeMap;
fn walk(s: Run, path: Vec<u8>, out: &mut BTreeMap<String, (u32, Vec<u8>)>) {
    if let Some(e) = &s.ending {
        let v = out.entry(e.clone()).or_insert((0, path));
        v.0 += 1;
        return;
    }
    for o in 0..3 {
        let mut n = s.clone();
        if n.apply(
            Command {
                kind: "choice".into(),
                option: o,
                target: 0,
            },
            3,
        )
        .is_ok()
        {
            let mut p = path.clone();
            p.push(o);
            walk(n, p, out)
        }
    }
}
fn main() {
    let mut out = BTreeMap::new();
    walk(Run::new(42), vec![], &mut out);
    for (k, v) in out {
        println!("{k}: {v:?}")
    }
}
