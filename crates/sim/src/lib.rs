mod pricing;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const VERSION: &str = "last-signal-v1";
pub const NAMES: [&str; 9] = [
    "Power utility",
    "Ice works",
    "Greenhouse",
    "Atmospheric plant",
    "Fabrication workshop",
    "Established households",
    "Working families",
    "New arrivals",
    "Public treasury",
];
pub const GOODS: [&str; 5] = ["food", "water", "oxygen", "parts", "power"];
const OUT: [usize; 5] = [4, 1, 0, 2, 3];
const BASE: [i64; 5] = [8, 4, 6, 24, 1];
const FLOOR: [i64; 5] = [6, 3, 4, 21, 1];
const WAGES: [i64; 5] = [160, 70, 95, 70, 80];
const POWER: [i64; 5] = [0, 80, 110, 85, 105];
const CAP: [i64; 5] = [490, 105, 58, 64, 12];

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Actor {
    pub name: String,
    pub credits: i64,
    pub inventory: [i64; 5],
    pub condition: i64,
    pub price: i64,
    pub output: i64,
    pub shortfall: i64,
    pub unpaid: u8,
    pub reason: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Event {
    pub id: u32,
    pub sol: u8,
    pub kind: String,
    pub actor: usize,
    pub text: String,
    pub causes: Vec<u32>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Trade {
    pub from: usize,
    pub to: usize,
    pub good: usize,
    pub qty: i64,
    pub paid: i64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Day {
    pub sol: u8,
    pub reserves: [i64; 3],
    pub production: [i64; 3],
    pub wellbeing: i64,
    pub population: i64,
    pub treasury: i64,
    pub hash: String,
    pub trades: Vec<Trade>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Decision {
    pub chapter: u8,
    pub option: u8,
    pub sol: u8,
    pub event: u32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Run {
    pub version: String,
    pub seed: u32,
    pub sol: u8,
    pub revision: u32,
    pub population: i64,
    pub wellbeing: i64,
    pub fatigue: i64,
    pub actors: Vec<Actor>,
    pub policy: u8,
    pub priority: u8,
    pub project: u8,
    pub project_left: u8,
    pub upgrades: [bool; 3],
    pub aid_left: u8,
    pub aid_chapter: i8,
    pub emergency: [i64; 3],
    pub battery: i64,
    pub rescued: i64,
    pub rescue_eta: u8,
    pub life_debt: i64,
    pub hardship: u8,
    pub storm_policy: u8,
    pub final_policy: u8,
    #[serde(default)]
    pub reduced: bool,
    pub pending: bool,
    pub ending: Option<String>,
    pub decisions: Vec<Decision>,
    pub trades: Vec<Trade>,
    pub events: Vec<Event>,
    pub days: Vec<Day>,
    pub last_shortage: [u32; 5],
    pub hash: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Command {
    pub kind: String,
    #[serde(default)]
    pub option: u8,
    #[serde(default)]
    pub target: usize,
}
#[derive(Deserialize)]
struct Request {
    op: String,
    #[serde(default)]
    seed: u32,
    run: Option<Run>,
    command: Option<Command>,
    #[serde(default)]
    max_sols: u8,
}

impl Run {
    pub fn new(seed: u32) -> Self {
        let mut actors: Vec<Actor> = NAMES
            .iter()
            .enumerate()
            .map(|(i, n)| Actor {
                name: n.to_string(),
                credits: if i < 5 {
                    1500
                } else {
                    [900, 450, 180, 2600][i - 5]
                },
                inventory: [0; 5],
                condition: if i < 5 { 86 } else { 100 },
                price: if i < 5 { BASE[OUT[i]] } else { 0 },
                output: 0,
                shortfall: 0,
                unpaid: 0,
                reason: "Awaiting the first operating sol.".into(),
            })
            .collect();
        actors[1].inventory[1] = 180;
        actors[2].inventory[0] = 120;
        actors[3].inventory[2] = 96;
        actors[4].inventory[3] = 42;
        actors[2].inventory[1] = 40;
        let mut s = Self {
            version: VERSION.into(),
            seed,
            sol: 0,
            revision: 0,
            population: 120,
            wellbeing: 75,
            fatigue: 0,
            actors,
            policy: 0,
            priority: 0,
            project: 0,
            project_left: 0,
            upgrades: [false; 3],
            aid_left: 3,
            aid_chapter: -1,
            emergency: [80, 120, 96],
            battery: 180,
            rescued: 0,
            rescue_eta: 0,
            life_debt: 0,
            hardship: 0,
            storm_policy: 0,
            final_policy: 0,
            reduced: false,
            pending: true,
            ending: None,
            decisions: vec![],
            trades: vec![],
            events: vec![],
            days: vec![],
            last_shortage: [0; 5],
            hash: String::new(),
        };
        s.event("story",8,"Earth is gone. 120 people remain in the settlement. Twelve surveyors are stranded at the northern ridge. Dust season arrives on sol 19.".into(),vec![]);
        s.rehash();
        s
    }
    pub fn chapter(&self) -> u8 {
        self.sol / 3
    }
    pub fn total_credits(&self) -> i64 {
        self.actors.iter().map(|a| a.credits).sum()
    }
    pub fn reserves(&self) -> [i64; 3] {
        std::array::from_fn(|r| self.actors.iter().map(|a| a.inventory[r]).sum())
    }
    pub fn demand(&self) -> [i64; 3] {
        [
            self.population / 3,
            self.population / 2,
            self.population * 2 / 5,
        ]
    }
    fn event(&mut self, kind: &str, actor: usize, text: String, causes: Vec<u32>) -> u32 {
        let id = self.events.len() as u32 + 1;
        self.events.push(Event {
            id,
            sol: self.sol,
            kind: kind.into(),
            actor,
            text,
            causes: causes.into_iter().filter(|x| *x > 0).collect(),
        });
        id
    }
    fn pay(&mut self, from: usize, to: usize, amount: i64) -> i64 {
        let n = amount.max(0).min(self.actors[from].credits);
        self.actors[from].credits -= n;
        self.actors[to].credits += n;
        n
    }
    fn buy(&mut self, buyer: usize, seller: usize, r: usize, wanted: i64) -> i64 {
        let p = self.actors[seller].price.max(1);
        let qty = wanted
            .max(0)
            .min(self.actors[seller].inventory[r])
            .min(self.actors[buyer].credits / p);
        if qty > 0 {
            self.pay(buyer, seller, qty * p);
            self.actors[seller].inventory[r] -= qty;
            self.actors[buyer].inventory[r] += qty;
            self.trades.push(Trade {
                from: buyer,
                to: seller,
                good: r,
                qty,
                paid: qty * p,
            });
        }
        qty
    }
    fn require_cost(&self, credits: i64, parts: i64) -> Result<(), String> {
        if self.actors[8].credits < credits {
            return Err("Public treasury cannot fund this option.".into());
        }
        if self.actors[4].inventory[3] < parts {
            return Err("The workshop does not have enough parts.".into());
        }
        Ok(())
    }
    fn public_cost(&mut self, credits: i64, parts: i64) {
        self.pay(8, 4, credits);
        self.actors[4].inventory[3] -= parts;
    }
    pub fn apply(&mut self, cmd: Command, max_sols: u8) -> Result<(), String> {
        let mut next = self.clone();
        next.apply_inner(cmd, max_sols)?;
        *self = next;
        Ok(())
    }
    fn apply_inner(&mut self, cmd: Command, max_sols: u8) -> Result<(), String> {
        if self.ending.is_some() {
            return Err("This run has ended. Start a separate replay.".into());
        }
        if max_sols > 3 {
            return Err("Advance at most three sols.".into());
        }
        match cmd.kind.as_str() {
            "choice" => {
                if !self.pending || cmd.option > 2 {
                    return Err("No such decision is available.".into());
                }
                let c = self.chapter();
                let o = cmd.option;
                match c {
                    0 => {
                        self.priority = o;
                    }
                    1 => {
                        self.policy = o;
                    }
                    2 => {
                        let cost = [380, 300, 0][o as usize];
                        let parts = [8, 6, 0][o as usize];
                        self.require_cost(cost, parts)?;
                        self.public_cost(cost, parts);
                        self.project = o;
                        self.project_left = if o == 2 { 6 } else { 3 };
                    }
                    3 => {
                        let t = self.distressed();
                        match o {
                            0 => {
                                self.require_cost(400, 0)?;
                                self.pay(8, t, 400);
                            }
                            1 => {
                                self.require_cost(220, 0)?;
                                let r = OUT[t];
                                let amount = 220 / self.actors[t].price.max(1);
                                self.buy(8, t, r, amount);
                            }
                            _ => {
                                self.actors[t].unpaid = 0;
                                self.actors[t].condition = (self.actors[t].condition + 8).min(100);
                                self.wellbeing -= 4;
                                self.fatigue += 5;
                            }
                        }
                    }
                    4 => match o {
                        0 => {
                            self.require_cost(90, 14)?;
                            self.public_cost(90, 14);
                            for a in &mut self.actors[..5] {
                                a.condition = (a.condition + 20).min(100);
                            }
                        }
                        1 => {
                            self.fatigue += 18;
                            self.wellbeing -= 3;
                            for a in &mut self.actors[..5] {
                                a.condition = (a.condition + 11).min(100);
                            }
                        }
                        _ => {
                            self.reduced = true;
                            self.wellbeing += 3;
                        }
                    },
                    5 => match o {
                        0 => {
                            self.require_cost(240, 8)?;
                            self.public_cost(240, 8);
                            self.rescue_eta = self.sol + 2;
                            self.rescued = 12;
                            self.battery = (self.battery - 35).max(0);
                        }
                        1 => {
                            self.require_cost(90, 0)?;
                            self.pay(8, 0, 90);
                            self.rescue_eta = self.sol + 4;
                            self.rescued = 8;
                            self.wellbeing -= 3;
                        }
                        _ => {
                            self.rescued = -1;
                            self.wellbeing -= 15;
                        }
                    },
                    6 => {
                        self.storm_policy = o;
                    }
                    7 => {
                        self.final_policy = o;
                        if o == 0 {
                            self.wellbeing = (self.wellbeing + 8).min(100);
                        }
                        if o == 1 {
                            self.fatigue += 8;
                        }
                    }
                    _ => return Err("Campaign complete.".into()),
                }
                let id = self.event(
                    "decision",
                    8,
                    format!("Chapter {}: option {} committed.", c + 1, o + 1),
                    vec![],
                );
                self.decisions.push(Decision {
                    chapter: c,
                    option: o,
                    sol: self.sol,
                    event: id,
                });
                self.pending = false;
            }
            "aid" => {
                if self.aid_left == 0 || self.aid_chapter == self.chapter() as i8 {
                    return Err("No aid remains for this chapter.".into());
                }
                match cmd.option {
                    0 => {
                        if self.emergency.iter().all(|x| *x == 0) {
                            return Err("The emergency cache is empty.".into());
                        }
                        for r in 0..3 {
                            let n = self.emergency[r].min(self.demand()[r]);
                            self.emergency[r] -= n;
                            self.actors[8].inventory[r] += n;
                        }
                    }
                    1 => {
                        if cmd.target >= 5 {
                            return Err("Select an institution.".into());
                        }
                        self.require_cost(0, 5)?;
                        self.actors[4].inventory[3] -= 5;
                        self.actors[cmd.target].condition =
                            (self.actors[cmd.target].condition + 20).min(100);
                    }
                    2 => {
                        if cmd.target == 0 || cmd.target >= 5 || self.battery < 40 {
                            return Err(
                                "Select a consuming institution; 40 battery energy is required."
                                    .into(),
                            );
                        }
                        self.battery -= 40;
                        self.actors[cmd.target].inventory[4] += 40;
                    }
                    _ => return Err("Unknown aid.".into()),
                }
                self.aid_left -= 1;
                self.aid_chapter = self.chapter() as i8;
                self.event(
                    "aid",
                    cmd.target.min(8),
                    format!(
                        "Emergency aid {} deployed. {} uses remain.",
                        cmd.option + 1,
                        self.aid_left
                    ),
                    vec![],
                );
            }
            "advance" => {
                if self.pending {
                    return Err("Choose a response before advancing.".into());
                }
            }
            _ => return Err("Unknown command.".into()),
        }
        self.revision += 1;
        for _ in 0..max_sols {
            if self.pending || self.ending.is_some() {
                break;
            }
            self.tick();
        }
        self.rehash();
        Ok(())
    }
    pub fn distressed(&self) -> usize {
        (0..5).min_by_key(|i| self.actors[*i].credits).unwrap()
    }
    fn tick(&mut self) {
        self.sol += 1;
        let mut causes: Vec<u32> = self
            .decisions
            .last()
            .map(|d| vec![d.event])
            .unwrap_or_default();
        // Scenario variation is indexed by sol, independent of player action count.
        let noise = self
            .seed
            .wrapping_mul(1664525)
            .wrapping_add(self.sol as u32 * 1013904223u32.wrapping_div(24));
        let weather = if (19..=21).contains(&self.sol) {
            55
        } else if self.sol == 9 + (self.seed % 3) as u8 {
            85
        } else {
            100
        };
        if weather < 100 {
            let id = self.event(
                "weather",
                0,
                format!("Dust reduces solar generation to {}% of normal.", weather),
                causes.clone(),
            );
            causes = vec![id];
        }
        if self.sol == 12 {
            self.actors[1].condition -= 12;
            let id = self.event(
                "fault",
                1,
                "The ice pump seal is failing. Delayed repairs now reduce water output.".into(),
                vec![self.last_shortage[4]],
            );
            self.last_shortage[1] = id;
        }
        if self.rescue_eta == self.sol && self.rescued > 0 {
            self.population += self.rescued;
            self.wellbeing = (self.wellbeing + 6).min(100);
            self.event(
                "rescue",
                8,
                format!(
                    "{} surveyors returned. The settlement is now home to {} people.",
                    self.rescued, self.population
                ),
                causes.clone(),
            );
        }
        if self.project_left > 0 {
            self.project_left -= 1;
            if self.project_left == 0 {
                self.upgrades[self.project as usize] = true;
                self.event(
                    "project",
                    4,
                    [
                        "Water recycling is online. Essential water demand falls 20%.",
                        "Oxygen storage is online. The plant runs 20% more efficiently.",
                        "Workshop expansion is online. Parts capacity rises 50%.",
                    ][self.project as usize]
                        .into(),
                    causes.clone(),
                );
            }
        }
        // Wages circulate existing money to households; no credits are minted.
        for i in 0..5 {
            let wage = WAGES[i];
            let paid = self.actors[i].credits.min(wage);
            for (g, share) in [(5, 40), (6, 35), (7, 25)] {
                let n = if g == 7 {
                    paid - paid * 40 / 100 - paid * 35 / 100
                } else {
                    paid * share / 100
                };
                self.pay(i, g, n);
            }
            self.actors[i].unpaid = if paid < wage {
                self.actors[i].unpaid.saturating_add(1)
            } else {
                0
            };
        }
        let labor = (100 - self.fatigue / 3 - (70 - self.wellbeing).max(0) / 2).clamp(45, 100);
        let power = CAP[0] * self.actors[0].condition / 100 * weather / 100 * labor / 100;
        self.actors[0].inventory[4] = power;
        self.actors[0].output = power;
        let mut order = match self.priority {
            0 => vec![2, 1, 3, 4],
            1 => vec![4, 1, 3, 2],
            _ => vec![1, 3, 2, 4],
        };
        if weather < 70 && self.storm_policy == 0 {
            order = vec![3, 1, 2, 4]
        }
        if self.storm_policy == 2 && weather < 70 {
            let n = self.battery.min(60);
            self.battery -= n;
            self.actors[0].inventory[4] += n;
        }
        for i in order {
            let mut want = POWER[i];
            if self.priority == 2 {
                want = want * 90 / 100;
            }
            if self.reduced && self.sol < 22 {
                want = want * 85 / 100;
            }
            if self.sol >= 22 && self.final_policy == 1 {
                want = want * 115 / 100;
            }
            let bought = self.buy(i, 0, 4, (want - self.actors[i].inventory[4]).max(0));
            self.actors[i].shortfall = (want - self.actors[i].inventory[4]).max(0);
            if self.actors[i].shortfall > 0 {
                let id = self.event(
                    "shortage",
                    i,
                    format!(
                        "{} received {} of {} requested power. Production is constrained.",
                        NAMES[i], bought, want
                    ),
                    causes.clone(),
                );
                self.last_shortage[i] = id;
            }
        }
        // Opening stocks supply industry before this sol's production.
        let water_need = if self.upgrades[0] { 13 } else { 18 };
        self.buy(
            2,
            1,
            1,
            (water_need * 2 - self.actors[2].inventory[1]).max(0),
        );
        for i in 1..5 {
            let r = OUT[i];
            let mut cap = CAP[i];
            if i == 3 && self.upgrades[1] {
                cap = cap * 120 / 100;
            }
            if i == 4 && self.upgrades[2] {
                cap = cap * 150 / 100;
            }
            if self.sol >= 22 && self.final_policy == 1 {
                cap = cap * 115 / 100;
            }
            if self.reduced && self.sol < 22 || (self.sol >= 22 && self.final_policy == 2) {
                cap = cap * 90 / 100;
            }
            let effort = (self.actors[i].inventory[4] * 100 / POWER[i]).min(100);
            let mut produced =
                cap * self.actors[i].condition.max(0) / 100 * effort / 100 * labor / 100;
            if self.actors[i].unpaid >= 2 {
                produced /= 2;
            }
            if i == 2 {
                produced = produced.min(self.actors[i].inventory[1] * CAP[2] / water_need);
                let used = (produced * water_need + CAP[2] - 1) / CAP[2];
                self.actors[i].inventory[1] -= used;
            }
            if i == 4 && self.project == 2 && self.project_left > 0 {
                produced = produced * 75 / 100;
            }
            if i == 2 && noise % 17 == 0 {
                produced = produced * 90 / 100;
                self.event(
                    "harvest",
                    2,
                    "A weak harvest reduced greenhouse output by 10%.".into(),
                    vec![],
                );
            }
            self.actors[i].inventory[r] += produced;
            self.actors[i].inventory[4] = 0;
            self.actors[i].output = produced;
        }
        self.actors[0].inventory[4] = 0;
        // Public rations buy supplies; vouchers move money, never create goods.
        if self.policy == 1 {
            for g in 5..8 {
                self.pay(8, g, if g == 7 { 56 } else { 24 });
            }
        }
        if self.policy == 0 || self.sol >= 22 && self.final_policy == 0 {
            for r in 0..3 {
                let seller = [2, 1, 3][r];
                self.buy(8, seller, r, self.demand()[r] / 3);
            }
        }
        let mut total_missing = 0;
        let mut essential_missing = 0;
        for r in 0..3 {
            let seller = [2, 1, 3][r];
            let mut demand = self.demand()[r];
            if r == 1 && self.upgrades[0] {
                demand = demand * 80 / 100;
            }
            if self.sol >= 22 && self.final_policy == 2 {
                demand = demand * 85 / 100;
            }
            let public = self.actors[8].inventory[r].min(demand);
            self.actors[8].inventory[r] -= public;
            let available = self.actors[seller].inventory[r];
            let remaining = demand - public;
            // Each group receives a proportional stock entitlement, and a budget for all remaining essentials.
            for (g, share) in [(5, 40), (6, 35), (7, 25)] {
                let need = if g == 7 {
                    remaining - remaining * 40 / 100 - remaining * 35 / 100
                } else {
                    remaining * share / 100
                };
                let entitlement = if available >= remaining {
                    need
                } else {
                    available * need / remaining.max(1)
                };
                let budget = self.actors[g].credits / (3 - r as i64);
                let affordable = budget / self.actors[seller].price.max(1);
                let got = self.buy(g, seller, r, need.min(entitlement).min(affordable));
                self.actors[g].inventory[r] -= got;
                let mut missing = need - got;
                if self.sol <= 12 {
                    let n = missing.min(self.emergency[r]);
                    self.emergency[r] -= n;
                    missing -= n;
                }
                total_missing += missing;
                if r > 0 {
                    essential_missing += missing;
                }
            }
        }
        if total_missing > 0 {
            self.wellbeing = (self.wellbeing - 2 - total_missing / 12).max(0);
            self.hardship = self.hardship.saturating_add(1);
            let id=self.event("households",7,format!("Households missed {} units of essentials. Physical stock and affordability both matter.",total_missing),vec![self.last_shortage[1],self.last_shortage[2],self.last_shortage[3]]);
            self.life_debt += essential_missing + total_missing / 2;
            if self.sol > 12 && self.life_debt > self.population {
                let lost = (self.life_debt / self.population.max(1)).min(8);
                self.population = (self.population - lost).max(0);
                self.life_debt /= 2;
                self.event(
                    "loss",
                    8,
                    format!(
                        "{} residents died after prolonged life-support shortages.",
                        lost
                    ),
                    vec![id],
                );
            }
        } else {
            self.wellbeing = (self.wellbeing + 2).min(100);
            self.life_debt = (self.life_debt - 12).max(0);
        }
        for i in 0..5 {
            if i != 4 {
                let got = self.buy(i, 4, 3, 2);
                self.actors[i].inventory[3] -= got;
                self.actors[i].condition = (self.actors[i].condition - 4 + got * 2).clamp(15, 100);
                if got < 2 {
                    let id = self.event(
                        "maintenance",
                        i,
                        format!(
                            "{} deferred maintenance: {} of 2 parts acquired.",
                            NAMES[i], got
                        ),
                        vec![self.last_shortage[4]],
                    );
                    self.last_shortage[i] = id;
                }
            } else {
                let used = self.actors[4].inventory[3].min(1);
                self.actors[4].inventory[3] -= used;
                self.actors[4].condition = (self.actors[4].condition - 3 + used * 3).clamp(15, 100);
            }
            let tax = (self.actors[i].credits - 1800).max(0) / 8;
            self.pay(i, 8, tax);
            let r = OUT[i];
            let target = if i == 0 { CAP[0] } else { CAP[i] * 2 };
            let stock = if i == 0 {
                power
            } else {
                self.actors[i].inventory[r]
            };
            let old = self.actors[i].price;
            let new = pricing::quote(old, stock, target, FLOOR[r], BASE[r] * 3);
            self.actors[i].price = new;
            self.actors[i].reason=format!("{} units in stock; target {}. Price {} → {} credits. Condition {}%; {} unpaid payrolls.",stock,target,old,new,self.actors[i].condition,self.actors[i].unpaid);
        }
        self.event("market",8,format!("Settled payroll, input purchases, essential distribution and maintenance. Treasury: {} credits.",self.actors[8].credits),causes);
        self.fatigue = (self.fatigue - 1).max(0);
        if self.population < 90
            || (self.sol > 15 && self.wellbeing < 35 && self.hardship >= 6 && self.life_debt > 0)
        {
            self.ending = Some("The Last Light".into());
        }
        if self.sol == 24 && self.ending.is_none() {
            self.ending = Some(self.evaluate());
        }
        if self.sol % 3 == 0 && self.ending.is_none() {
            self.pending = true;
        }
        let p = [
            self.actors[2].output,
            self.actors[1].output,
            self.actors[3].output,
        ];
        self.rehash();
        self.days.push(Day {
            sol: self.sol,
            reserves: self.reserves(),
            production: p,
            wellbeing: self.wellbeing,
            population: self.population,
            treasury: self.actors[8].credits,
            hash: self.hash.clone(),
            trades: std::mem::take(&mut self.trades),
        });
    }
    pub fn sustainable(&self) -> bool {
        let mut future = self.clone();
        future.sol = 24;
        future.pending = false;
        future.ending = Some("projection".into());
        future.emergency = [0; 3];
        future.battery = 0;
        future.final_policy = 0;
        future.reduced = false;
        let population = future.population;
        let starting = future.reserves();
        let mut minimum_production = [i64::MAX; 3];
        for _ in 0..3 {
            future.tick();
            let day = future.days.last().unwrap();
            for r in 0..3 {
                minimum_production[r] = minimum_production[r].min(day.production[r]);
            }
        }
        let d = self.demand();
        let demand = [
            d[0],
            if self.upgrades[0] {
                d[1] * 80 / 100 + 13
            } else {
                d[1] + 18
            },
            d[2],
        ];
        future.population == population
            && future.wellbeing >= self.wellbeing
            && (0..3)
                .all(|r| minimum_production[r] >= demand[r] && future.reserves()[r] >= starting[r])
            && future.actors[..5]
                .iter()
                .all(|a| a.unpaid < 2 && a.condition >= 65)
    }

    fn evaluate(&self) -> String {
        let reserve = self.reserves();
        let d = self.demand();
        if self.population - self.rescued.max(0) >= 108
            && self.wellbeing >= 60
            && self.sustainable()
            && (0..3).all(|r| reserve[r] >= d[r] * 2)
        {
            "A New Dawn"
        } else if self.population < 108 || self.wellbeing < 40 {
            "Survival at a Cost"
        } else {
            "A Fragile Home"
        }
        .into()
    }
    pub fn rehash(&mut self) {
        self.hash.clear();
        let bytes = serde_json::to_vec(self).unwrap();
        self.hash = format!("{:x}", Sha256::digest(bytes));
    }
}

pub fn dispatch(input: &str) -> String {
    let result = (|| -> Result<Run, String> {
        let q: Request = serde_json::from_str(input).map_err(|e| e.to_string())?;
        if q.op == "new" {
            Ok(Run::new(q.seed))
        } else {
            let mut s = q.run.ok_or("Missing run")?;
            if s.version != VERSION {
                return Err("Unsupported version".into());
            }
            s.apply(q.command.ok_or("Missing command")?, q.max_sols)?;
            Ok(s)
        }
    })();
    match result {
        Ok(run) => serde_json::json!({"run":run}).to_string(),
        Err(error) => serde_json::json!({"error":error}).to_string(),
    }
}
#[no_mangle]
pub extern "C" fn sim_alloc(len: usize) -> *mut u8 {
    let v = vec![0u8; len].into_boxed_slice();
    Box::into_raw(v) as *mut u8
}
#[no_mangle]
pub unsafe extern "C" fn sim_free(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}
#[no_mangle]
pub unsafe extern "C" fn sim_call(ptr: *mut u8, len: usize) -> u64 {
    let input = std::slice::from_raw_parts(ptr, len);
    let out = dispatch(std::str::from_utf8(input).unwrap_or("{}"));
    let bytes = out.into_bytes().into_boxed_slice();
    let size = bytes.len();
    let p = Box::into_raw(bytes) as *mut u8;
    ((p as u64) << 32) | size as u64
}

#[cfg(test)]
mod tests;
