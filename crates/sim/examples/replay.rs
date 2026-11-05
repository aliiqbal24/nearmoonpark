use last_signal_sim::dispatch;
use std::io::{self, BufRead};
fn main() {
    for line in io::stdin().lock().lines() {
        println!("{}", dispatch(&line.unwrap()));
    }
}
