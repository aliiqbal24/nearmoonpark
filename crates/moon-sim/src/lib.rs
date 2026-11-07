pub mod catalog;
pub mod partnerships;
use catalog::{item, ride, tenant};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::VecDeque;

pub const VERSION: &str = "moonpark-v3";
pub const WIDTH: u16 = 32;
pub const HEIGHT: u16 = 24;
pub const LANDING: u16 = 10;
pub const END: u16 = 550;
pub const MAX_TICKS: u16 = 20;
pub const GATE: u16 = 23 * WIDTH + 15;
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Building {
    pub id: u32,
    pub kind: String,
    pub x: u8,
    pub z: u8,
    pub rotation: u8,
    pub variant: u8,
    pub price: i64,
    pub invested: i64,
    pub level: u8,
    pub launch: u8,
    pub enabled: bool,
    pub sold: bool,
    pub ready_at: u16,
    pub connected: bool,
    pub powered: bool,
    pub condition: i32,
    pub queue: Vec<u16>,
    pub riders: Vec<u16>,
    pub cycle_left: u16,
    pub served: u32,
    pub revenue: i64,
    pub cash: i64,
    pub stock: u16,
    pub rent: u8,
    pub delivery_qty: u16,
    pub delivery_at: u16,
    pub recent: u16,
    pub reason: String,
    #[serde(default)]
    pub insolvent: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Guest {
    pub id: u16,
    pub group: u8,
    pub arrival: u16,
    pub cash: i64,
    pub satisfaction: i32,
    pub hunger: u16,
    pub thirst: u16,
    pub cell: u16,
    pub route: Vec<u16>,
    pub status: String,
    pub target: Option<u32>,
    pub timer: u16,
    pub rides: Vec<String>,
    pub visits: u16,
    pub thought: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Trade {
    pub tick: u16,
    pub from: String,
    pub to: String,
    pub amount: i64,
    pub good: String,
    pub qty: u16,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Event {
    pub tick: u16,
    pub text: String,
}
#[derive(Clone, Serialize, Deserialize, Debug, Default, PartialEq)]
pub struct Score {
    pub guests: u32,
    pub finance: u32,
    pub variety: u32,
    pub total: u32,
    pub happy: u16,
    pub equity_gain: i64,
    pub unique: u16,
    pub satisfaction: u32,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Run {
    pub version: String,
    pub tick: u16,
    pub revision: u32,
    pub cash: i64,
    pub opening_equity: i64,
    pub supplier_cash: i64,
    pub builder_cash: i64,
    pub money_supply: i64,
    pub supplies: [u16; 3],
    #[serde(default)]
    pub consumed: [u16; 3],
    pub grant_cash: i64,
    pub grant_escrow: i64,
    pub partnerships: Vec<partnerships::Partnership>,
    pub departures: Vec<u16>,
    pub paths: Vec<u16>,
    pub buildings: Vec<Building>,
    pub guests: Vec<Guest>,
    pub trades: Vec<Trade>,
    pub trade_count: u32,
    pub events: Vec<Event>,
    pub actions: u16,
    pub finished: bool,
    pub score: Score,
    pub hash: String,
}
#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct Command {
    pub kind: String,
    #[serde(default)]
    pub building: u32,
    #[serde(default)]
    pub item: String,
    #[serde(default)]
    pub x: u8,
    #[serde(default)]
    pub z: u8,
    #[serde(default)]
    pub rotation: u8,
    #[serde(default)]
    pub variant: u8,
    #[serde(default)]
    pub value: i64,
}
impl Building {
    pub fn footprint(&self) -> (u8, u8) {
        let a = item(&self.kind).unwrap();
        let (w, h) = if self.kind == "coaster" && self.variant == 1 {
            (8, 6)
        } else {
            (a.w, a.h)
        };
        if self.rotation % 2 == 1 {
            (h, w)
        } else {
            (w, h)
        }
    }
    pub fn entry(&self) -> u16 {
        let (w, h) = self.footprint();
        match self.rotation % 4 {
            0 => (self.z as u16 + h as u16) * WIDTH + self.x as u16 + w as u16 / 2,
            1 => (self.z as u16 + h as u16 / 2) * WIDTH + self.x.saturating_sub(1) as u16,
            2 => (self.z.saturating_sub(1) as u16) * WIDTH + self.x as u16 + w as u16 / 2,
            _ => (self.z as u16 + h as u16 / 2) * WIDTH + self.x as u16 + w as u16,
        }
    }
    fn power(&self) -> u8 {
        let n = item(&self.kind).unwrap().power;
        if self.kind == "coaster" {
            (self.launch + 1) + self.level
        } else {
            n + self.level
        }
    }
    fn seats(&self) -> usize {
        let n = item(&self.kind).unwrap().seats as usize;
        n + n * self.level as usize / 2
    }
    fn duration(&self) -> u16 {
        if self.kind == "coaster" {
            [36, 30, 24][(self.launch - 1) as usize]
        } else {
            item(&self.kind).unwrap().cycle
        }
    }
    pub fn resale_value(&self) -> i64 {
        let condition = if ride(&self.kind) {
            self.condition.clamp(0, 100) as i64
        } else {
            100
        };
        self.invested * 70 * condition / 10000
    }
}
fn make_building(
    id: u32,
    kind: &str,
    x: u8,
    z: u8,
    rotation: u8,
    variant: u8,
    tick: u16,
) -> Building {
    let a = item(kind).unwrap();
    Building {
        id,
        kind: kind.into(),
        x,
        z,
        rotation,
        variant,
        price: a.price,
        invested: a.cost,
        level: 0,
        launch: 2,
        enabled: true,
        sold: false,
        ready_at: tick + 15,
        connected: false,
        powered: false,
        condition: 100,
        queue: vec![],
        riders: vec![],
        cycle_left: 0,
        served: 0,
        revenue: 0,
        cash: if tenant(kind) { 6000 } else { 0 },
        stock: if kind == "depot" {
            8
        } else if tenant(kind) {
            12
        } else {
            0
        },
        rent: 10,
        delivery_qty: 0,
        delivery_at: 0,
        recent: 0,
        reason: "Waiting for the first customers.".into(),
        insolvent: false,
    }
}
impl Run {
    pub fn new() -> Self {
        let mut r = Self {
            version: VERSION.into(),
            tick: 0,
            revision: 0,
            cash: 160000,
            opening_equity: 0,
            supplier_cash: 10000000,
            builder_cash: 1000000,
            money_supply: 0,
            supplies: [2048; 3],
            consumed: [0; 3],
            grant_cash: 60000,
            grant_escrow: 0,
            partnerships: partnerships::offers(),
            departures: vec![0; 14],
            paths: (0..32)
                .map(|x| 20 * WIDTH + x)
                .chain([
                    21 * WIDTH + 15,
                    22 * WIDTH + 15,
                    GATE,
                    19 * WIDTH + 12,
                    19 * WIDTH + 19,
                ])
                .collect(),
            buildings: vec![
                make_building(1, "bounce", 11, 16, 0, 0, 0),
                make_building(2, "food", 18, 17, 0, 0, 0),
            ],
            guests: vec![],
            trades: vec![],
            trade_count: 0,
            events: vec![],
            actions: 0,
            finished: false,
            score: Score::default(),
            hash: String::new(),
        };
        for b in &mut r.buildings {
            b.ready_at = 0;
            r.supplier_cash -= b.cash;
            if tenant(&b.kind) {
                r.supplies[0] -= b.stock;
            }
        }
        for id in 0..96 {
            let group = match id % 8 {
                0..=2 => 0,
                3..=5 => 1,
                _ => 2,
            };
            r.guests.push(Guest {
                id,
                group,
                arrival: 11 + (id / 8) * 40,
                cash: [2400, 3600, 4800][group as usize],
                satisfaction: 65,
                hunger: 20 + (id % 3) * 7,
                thirst: 20 + (id % 4) * 5,
                cell: GATE,
                route: vec![],
                status: "upcoming".into(),
                target: None,
                timer: 0,
                rides: vec![],
                visits: 0,
                thought: "My rocket leaves soon. This had better be good.".into(),
            });
        }
        r.money_supply = r.total_money();
        r.opening_equity = r.equity();
        r.refresh_connections();
        r.event("Welcome to Moonpark. Your first rocket is on final approach.");
        r.rehash();
        r
    }
    pub fn total_money(&self) -> i64 {
        self.cash
            + self.grant_cash
            + self.grant_escrow
            + self.supplier_cash
            + self.builder_cash
            + self.buildings.iter().map(|b| b.cash).sum::<i64>()
            + self.guests.iter().map(|g| g.cash).sum::<i64>()
    }
    pub fn equity(&self) -> i64 {
        self.cash
            + self
                .buildings
                .iter()
                .filter(|b| !b.sold)
                .map(|b| b.resale_value())
                .sum::<i64>()
    }
    pub fn power(&self) -> (u16, u16) {
        let cap = 8 + self
            .buildings
            .iter()
            .filter(|b| b.kind == "solar" && !b.sold && b.connected && b.ready_at <= self.tick)
            .count() as u16
            * 4;
        let used = self
            .buildings
            .iter()
            .filter(|b| b.powered)
            .map(|b| b.power() as u16)
            .sum();
        (used, cap)
    }
    fn event(&mut self, text: impl Into<String>) {
        self.events.push(Event {
            tick: self.tick,
            text: text.into(),
        });
        if self.events.len() > 48 {
            self.events.remove(0);
        }
    }
    fn trade(
        &mut self,
        from: impl Into<String>,
        to: impl Into<String>,
        amount: i64,
        good: &str,
        qty: u16,
    ) {
        let from = from.into();
        let to = to.into();
        if good == "revenue share" && to == "Park" {
            if let Some(id) = from
                .strip_prefix("business:")
                .and_then(|s| s.parse::<u32>().ok())
            {
                if let Some(p) = self
                    .partnerships
                    .iter_mut()
                    .find(|p| p.building == Some(id))
                {
                    p.earned += amount;
                }
            }
        }
        self.trade_count += 1;
        self.trades.push(Trade {
            tick: self.tick,
            from,
            to,
            amount,
            good: good.into(),
            qty,
        });
        if self.trades.len() > 64 {
            self.trades.remove(0);
        }
    }
    fn spend(&mut self, n: i64) -> Result<(), String> {
        if n < 0 || self.cash < n {
            Err("Not enough lunar credits.".into())
        } else {
            self.cash -= n;
            self.builder_cash += n;
            Ok(())
        }
    }
    fn occupied(&self, c: u16) -> bool {
        let (x, z) = (c % WIDTH, c / WIDTH);
        self.buildings.iter().any(|b| {
            let (w, h) = b.footprint();
            !b.sold
                && x >= b.x as u16
                && x < b.x as u16 + w as u16
                && z >= b.z as u16
                && z < b.z as u16 + h as u16
        })
    }
    fn neighbours(c: u16) -> Vec<u16> {
        let (x, z) = (c % WIDTH, c / WIDTH);
        let mut v = vec![];
        if x > 0 {
            v.push(c - 1)
        }
        if x + 1 < WIDTH {
            v.push(c + 1)
        }
        if z > 0 {
            v.push(c - WIDTH)
        }
        if z + 1 < HEIGHT {
            v.push(c + WIDTH)
        }
        v
    }
    fn route(&self, from: u16, to: u16, build: bool) -> Option<Vec<u16>> {
        if from >= WIDTH * HEIGHT || to >= WIDTH * HEIGHT {
            return None;
        }
        let mut prev = vec![u16::MAX; (WIDTH * HEIGHT) as usize];
        let mut distance = vec![u16::MAX; (WIDTH * HEIGHT) as usize];
        let mut q = VecDeque::from([from]);
        prev[from as usize] = from;
        distance[from as usize] = 0;
        while let Some(c) = q.pop_front() {
            if c == to {
                let mut p = vec![];
                let mut c = to;
                while c != from {
                    p.push(c);
                    c = prev[c as usize];
                }
                p.reverse();
                return Some(p);
            }
            for n in Self::neighbours(c) {
                let cost = if build && self.paths.contains(&n) {
                    0
                } else {
                    1
                };
                let candidate = distance[c as usize] + cost;
                if candidate < distance[n as usize]
                    && (if build {
                        !self.occupied(n)
                    } else {
                        self.paths.contains(&n)
                    })
                {
                    prev[n as usize] = c;
                    distance[n as usize] = candidate;
                    if cost == 0 {
                        q.push_front(n)
                    } else {
                        q.push_back(n)
                    }
                }
            }
        }
        None
    }
    pub fn refresh_connections(&mut self) {
        let mut connected = vec![false; (WIDTH * HEIGHT) as usize];
        let mut q = VecDeque::from([GATE]);
        connected[GATE as usize] = true;
        let mut paths = vec![false; connected.len()];
        for c in &self.paths {
            paths[*c as usize] = true;
        }
        while let Some(c) = q.pop_front() {
            for n in Self::neighbours(c) {
                if paths[n as usize] && !connected[n as usize] {
                    connected[n as usize] = true;
                    q.push_back(n)
                }
            }
        }
        let cap = 8 + self
            .buildings
            .iter()
            .filter(|b| {
                !b.sold
                    && b.kind == "solar"
                    && b.ready_at <= self.tick
                    && b.entry() < WIDTH * HEIGHT
                    && connected[b.entry() as usize]
            })
            .count() as u16
            * 4;
        let mut used = 0;
        for b in &mut self.buildings {
            let entry = b.entry();
            b.connected = !b.sold && entry < WIDTH * HEIGHT && connected[entry as usize];
            let p = b.power() as u16;
            b.powered = !b.sold
                && b.connected
                && b.enabled
                && b.ready_at <= self.tick
                && b.condition > 0
                && !b.insolvent
                && used + p <= cap;
            if b.powered {
                used += p;
            }
        }
    }
    pub fn apply(&mut self, commands: &[Command], ticks: u16) -> Result<(), String> {
        if self.finished {
            return Err("Opening day has ended.".into());
        }
        if ticks > MAX_TICKS || commands.len() > 16 {
            return Err("Batch too large.".into());
        }
        if self.actions as usize + commands.len() > 512 {
            return Err("Action limit reached.".into());
        }
        let mut next = self.clone();
        for c in commands {
            next.command(c)?;
            next.actions += 1;
            next.refresh_connections();
            if c.kind == "erase_path" {
                next.repair_routes();
            }
        }
        for _ in 0..ticks {
            if next.tick >= END {
                break;
            }
            next.step();
        }
        next.settle_partnerships();
        next.revision += 1;
        next.score = next.calculate_score();
        next.rehash();
        *self = next;
        Ok(())
    }
    fn command(&mut self, c: &Command) -> Result<(), String> {
        match c.kind.as_str() {
            "partner" => self.accept_partnership(c.value, c.building)?,
            "build" => {
                let a = item(&c.item).ok_or("Unknown blueprint")?;
                if self.buildings.len() >= 32 {
                    return Err("Park building limit reached.".into());
                }
                if c.rotation > 3 || c.variant > 1 {
                    return Err("Invalid blueprint orientation.".into());
                }
                let id = self.buildings.len() as u32 + 1;
                let b = make_building(id, &c.item, c.x, c.z, c.rotation, c.variant, self.tick);
                let (w, h) = b.footprint();
                if c.x == 0
                    || c.z == 0
                    || c.x as u16 + w as u16 >= WIDTH
                    || c.z as u16 + h as u16 >= HEIGHT
                {
                    return Err("Keep the footprint and entrance inside the park.".into());
                }
                for z in c.z..c.z + h {
                    for x in c.x..c.x + w {
                        let cell = z as u16 * WIDTH + x as u16;
                        if self.occupied(cell) || self.paths.contains(&cell) {
                            return Err(
                                "That space is occupied. Rotate or move the blueprint.".into()
                            );
                        }
                    }
                }
                self.spend(a.cost)?;
                if tenant(&c.item) {
                    let good = if c.item == "drink" {
                        1
                    } else if c.item == "depot" {
                        2
                    } else {
                        0
                    };
                    if self.supplies[good] < b.stock {
                        return Err("Supplier out of starting stock.".into());
                    }
                    self.supplies[good] -= b.stock;
                    self.supplier_cash -= b.cash;
                }
                self.event(format!(
                    "{} is under construction. Connect its entrance to a path.",
                    a.name
                ));
                self.buildings.push(b);
            }
            "path" => {
                if c.x >= WIDTH as u8 || c.z >= HEIGHT as u8 {
                    return Err("Outside the park.".into());
                }
                let p = c.z as u16 * WIDTH + c.x as u16;
                if self.occupied(p) {
                    return Err("Paths cannot cross a building.".into());
                }
                if !self.paths.contains(&p) {
                    self.spend(200)?;
                    self.paths.push(p);
                }
            }
            "connect" => {
                let b = self
                    .buildings
                    .iter()
                    .find(|b| b.id == c.building && !b.sold)
                    .ok_or("Building not found")?;
                let entry = b.entry();
                let p = self
                    .route(entry, GATE, true)
                    .ok_or("No space for a connecting path.")?;
                let mut cells = vec![entry];
                cells.extend(p);
                cells.retain(|c| !self.paths.contains(c));
                if cells.iter().any(|c| self.occupied(*c)) {
                    return Err("Entrance blocked.".into());
                }
                self.spend(cells.len() as i64 * 200)?;
                self.paths.extend(cells);
            }
            "erase_path" => {
                let cell = c.z as u16 * WIDTH + c.x as u16;
                if c.x >= WIDTH as u8 || c.z >= HEIGHT as u8 {
                    return Err("Outside the park.".into());
                }
                if cell == GATE {
                    return Err("The park gate must stay connected.".into());
                }
                self.paths.retain(|p| *p != cell);
            }
            "price" | "launch" | "upgrade" | "toggle" | "rent" | "invest" | "sell" => {
                let i = self
                    .buildings
                    .iter()
                    .position(|b| b.id == c.building && !b.sold)
                    .ok_or("Building not found")?;
                let k = self.buildings[i].kind.clone();
                match c.kind.as_str() {
                    "price" => {
                        if !ride(&k) || !(100..=2000).contains(&c.value) || c.value % 100 != 0 {
                            return Err("Ride tickets must be 1–20 credits.".into());
                        }
                        self.buildings[i].price = c.value;
                    }
                    "launch" => {
                        if k != "coaster" || !(1..=3).contains(&c.value) {
                            return Err("Invalid launch setting.".into());
                        }
                        self.buildings[i].launch = c.value as u8;
                    }
                    "upgrade" => {
                        if !ride(&k) || self.buildings[i].level > 0 {
                            return Err("Capacity is already upgraded.".into());
                        }
                        let cost = item(&k).unwrap().cost / 2;
                        self.spend(cost)?;
                        self.buildings[i].invested += cost;
                        self.buildings[i].level = 1;
                        self.buildings[i].ready_at = self.tick + 10;
                    }
                    "toggle" => {
                        self.buildings[i].enabled = !self.buildings[i].enabled;
                    }
                    "rent" => {
                        if self
                            .partnerships
                            .iter()
                            .any(|p| p.building == Some(c.building))
                        {
                            return Err(
                                "Your signed concession fixes the revenue share for opening day."
                                    .into(),
                            );
                        }
                        if !matches!(k.as_str(), "food" | "drink")
                            || !(0..=30).contains(&c.value)
                            || c.value % 5 != 0
                        {
                            return Err("Revenue share must be 0–30%.".into());
                        }
                        self.buildings[i].rent = c.value as u8;
                    }
                    "invest" => {
                        if !tenant(&k) || c.value != 10000 || self.cash < c.value {
                            return Err("An investment costs 100 credits.".into());
                        }
                        self.cash -= c.value;
                        self.buildings[i].cash += c.value;
                        self.buildings[i].insolvent = false;
                        self.trade(
                            "Park",
                            format!("business:{}", c.building),
                            c.value,
                            "investment",
                            1,
                        );
                    }
                    "sell" => {
                        if self
                            .partnerships
                            .iter()
                            .any(|p| p.building == Some(c.building))
                        {
                            return Err(
                                "Your partner's concession stays open for this opening day.".into(),
                            );
                        }
                        if !self.buildings[i].riders.is_empty() {
                            return Err("Wait for the current ride to finish.".into());
                        }
                        let refund = self.buildings[i].resale_value();
                        self.cash += refund;
                        self.builder_cash -= refund;
                        self.buildings[i].sold = true;
                        for g in &mut self.guests {
                            if g.target == Some(c.building) {
                                g.target = None;
                                g.route.clear();
                                g.status = "walking".into();
                            }
                        }
                        self.buildings[i].queue.clear();
                        self.trade("Builder", "Park", refund, "resale", 1);
                    }
                    _ => unreachable!(),
                }
            }
            _ => return Err("Unknown park action.".into()),
        }
        Ok(())
    }
    fn step(&mut self) {
        self.tick += 1;
        self.refresh_connections();
        if self.tick % 40 == 11 && self.tick <= 451 {
            let wave = self.tick / 40 + 1;
            self.event(format!(
                "Shuttle {wave}/12 docked. Eight new visitors are walking into your park."
            ));
        }
        for i in 0..self.buildings.len() {
            if self.buildings[i].sold {
                continue;
            }
            let kind = self.buildings[i].kind.clone();
            if tenant(&kind) {
                self.merchant(i);
            }
            if self.buildings[i].cycle_left > 0 {
                self.buildings[i].cycle_left -= 1;
                if self.buildings[i].cycle_left == 0 {
                    let riders = std::mem::take(&mut self.buildings[i].riders);
                    for id in riders {
                        let g = &mut self.guests[id as usize];
                        g.status = "walking".into();
                        g.target = None;
                        g.cell = self.buildings[i].entry();
                        g.timer = 2;
                        if ride(&kind) {
                            g.visits += 1;
                            let first = !g.rides.contains(&kind);
                            if first {
                                g.rides.push(kind.clone());
                            }
                            let thrill = if kind == "coaster" {
                                self.buildings[i].launch as i32 + 1
                            } else {
                                item(&kind).unwrap().thrill
                            };
                            let wanted = [1, 2, 4][g.group as usize];
                            let delta = if (thrill - wanted).abs() <= 1 {
                                if first {
                                    if thrill == wanted {
                                        26
                                    } else {
                                        18
                                    }
                                } else {
                                    2
                                }
                            } else {
                                -8
                            };
                            g.satisfaction = (g.satisfaction + delta).clamp(0, 100);
                            g.thought = if delta > 0 {
                                "That was worth the trip from Earth!"
                            } else if thrill < wanted {
                                "A little tame for me. Next time, a bigger launch!"
                            } else {
                                "My stomach has requested a gentler launch."
                            }
                            .into();
                        } else {
                            if kind == "food" {
                                g.hunger = 0
                            } else {
                                g.thirst = 0
                            }
                            g.satisfaction = (g.satisfaction + 8).min(100);
                            g.thought = "Just what I needed. Back to the rides!".into();
                        }
                    }
                }
            }
            if self.buildings[i].powered
                && self.buildings[i].cycle_left == 0
                && !self.buildings[i].queue.is_empty()
                && (ride(&kind) || self.buildings[i].stock > 0)
            {
                let seats = if ride(&kind) {
                    self.buildings[i].seats()
                } else {
                    1
                };
                let count = seats.min(self.buildings[i].queue.len());
                let ids: Vec<_> = self.buildings[i].queue.drain(..count).collect();
                for id in ids {
                    let gi = id as usize;
                    let price = self.buildings[i].price;
                    if self.guests[gi].cash < price {
                        self.guests[gi].target = None;
                        self.guests[gi].status = "walking".into();
                        continue;
                    }
                    self.guests[gi].cash -= price;
                    self.buildings[i].revenue += price;
                    self.buildings[i].served += 1;
                    self.buildings[i].riders.push(id);
                    self.guests[gi].status = "riding".into();
                    if ride(&kind) {
                        self.cash += price;
                        self.trade(format!("guest:{id}"), "Park", price, &kind, 1);
                    } else {
                        self.buildings[i].cash += price;
                        self.buildings[i].stock -= 1;
                        self.consumed[if kind == "food" { 0 } else { 1 }] += 1;
                        self.buildings[i].recent += 1;
                        let rent = price * self.buildings[i].rent as i64 / 100;
                        self.buildings[i].cash -= rent;
                        self.cash += rent;
                        self.trade(
                            format!("guest:{id}"),
                            format!("business:{}", i + 1),
                            price,
                            &kind,
                            1,
                        );
                        self.trade(
                            format!("business:{}", i + 1),
                            "Park",
                            rent,
                            "revenue share",
                            1,
                        );
                    }
                }
                if !self.buildings[i].riders.is_empty() {
                    self.buildings[i].cycle_left = self.buildings[i].duration();
                    if ride(&kind) {
                        let fee = (self.buildings[i].power() as i64 * 100).min(self.cash);
                        self.cash -= fee;
                        self.supplier_cash += fee;
                        self.trade("Park", "Lunar Logistics", fee, "operation", 1);
                        let wear = if kind == "coaster" {
                            self.buildings[i].launch as i32 * 2
                        } else {
                            1
                        };
                        self.buildings[i].condition = (self.buildings[i].condition - wear).max(0);
                    }
                }
            }
        }
        let mut active = self
            .guests
            .iter()
            .filter(|g| g.status != "upcoming" && g.status != "gone")
            .count();
        for gi in 0..self.guests.len() {
            if self.guests[gi].arrival <= self.tick
                && self.guests[gi].status == "upcoming"
                && active < 48
            {
                self.guests[gi].status = "arriving".into();
                self.guests[gi].timer = 6;
                active += 1;
                self.guests[gi].thought = "Look at Earth! Now, where is that coaster?".into();
            }
            let status = self.guests[gi].status.clone();
            if status == "upcoming" || status == "gone" || status == "boarding" {
                continue;
            }
            if status == "arriving" {
                if self.guests[gi].timer > 0 {
                    self.guests[gi].timer -= 1;
                } else {
                    self.guests[gi].status = "walking".into();
                }
                continue;
            }
            if self.tick % 6 == 0 {
                self.guests[gi].hunger = (self.guests[gi].hunger + 2).min(100);
                self.guests[gi].thirst = (self.guests[gi].thirst + 3).min(100);
            }
            if self.tick % 15 == 0 && (self.guests[gi].hunger > 75 || self.guests[gi].thirst > 75) {
                self.guests[gi].satisfaction = (self.guests[gi].satisfaction - 4).max(0);
            }
            if status == "riding" {
                continue;
            }
            if status == "queueing" {
                self.guests[gi].timer += 1;
                if self.guests[gi].timer % 10 == 0 && self.guests[gi].timer > 20 {
                    self.guests[gi].satisfaction = (self.guests[gi].satisfaction - 2).max(0);
                    self.guests[gi].thought = "This queue is eating into my moon time.".into();
                }
                if self.guests[gi].timer > 65 {
                    let id = self.guests[gi].id;
                    for b in &mut self.buildings {
                        b.queue.retain(|x| *x != id)
                    }
                    self.guests[gi].status = "walking".into();
                    self.guests[gi].target = None;
                    self.guests[gi].timer = 3;
                }
                continue;
            }
            if !self.guests[gi].route.is_empty() {
                let c = self.guests[gi].route.remove(0);
                self.guests[gi].cell = c;
                if self.guests[gi].route.is_empty() {
                    if self.guests[gi].status == "leaving" {
                        self.guests[gi].status = "boarding".into();
                        self.guests[gi].timer = self.tick;
                    } else if let Some(id) = self.guests[gi].target {
                        if let Some(b) = self.buildings.iter_mut().find(|b| b.id == id && !b.sold) {
                            b.queue.push(self.guests[gi].id);
                            self.guests[gi].status = "queueing".into();
                            self.guests[gi].timer = 0;
                        }
                    }
                }
                continue;
            }
            if self.guests[gi].timer > 0 {
                self.guests[gi].timer -= 1;
                continue;
            }
            if status == "leaving" {
                self.guests[gi].status = "boarding".into();
                self.guests[gi].timer = self.tick;
                continue;
            }
            self.choose(gi);
        }
        if self.tick % 40 == 30 {
            let mut count = 0;
            for g in &mut self.guests {
                let phase = g.timer % 40;
                let boarding_start = if (10..=24).contains(&phase) {
                    g.timer
                } else {
                    g.timer + (50 - phase) % 40
                };
                if g.status == "boarding" && boarding_start + 6 <= self.tick {
                    g.status = "gone".into();
                    count += 1;
                }
            }
            self.departures[(self.tick / 40) as usize] = count;
            if count > 0 {
                self.event(format!(
                    "Shuttle homebound: {count} visitors boarded. See you next time!"
                ));
            }
        }
        self.settle_partnerships();
        if self.tick >= END {
            self.finished = true;
            self.event("Last boarding call. Your first day on the Moon is complete.");
        }
    }
    fn merchant(&mut self, i: usize) {
        let kind = self.buildings[i].kind.clone();
        if self.buildings[i].ready_at > self.tick {
            return;
        }
        if self.buildings[i].delivery_qty > 0 && self.buildings[i].delivery_at <= self.tick {
            let n = self.buildings[i].delivery_qty;
            self.buildings[i].stock += n;
            self.buildings[i].delivery_qty = 0;
            self.event(format!(
                "A supply rover delivered {n} units to {}.",
                item(&kind).unwrap().name
            ));
        }
        if self.tick % 15 == 0 {
            let fee = self.buildings[i].cash.min(200);
            self.buildings[i].cash -= fee;
            self.supplier_cash += fee;
            if fee < 200 || self.buildings[i].cash == 0 {
                self.buildings[i].insolvent = true;
                self.buildings[i].powered = false;
            }
            self.trade(
                format!("business:{}", i + 1),
                "Lunar Logistics",
                fee,
                "operating supplies",
                1,
            );
        }
        let good = if kind == "food" {
            0
        } else if kind == "drink" {
            1
        } else {
            2
        };
        let unit = [200, 100, 500][good];
        let target = if kind == "depot" { 8 } else { 16 };
        let threshold = if kind == "depot" { 2 } else { 4 };
        if self.buildings[i].stock <= threshold
            && self.buildings[i].delivery_qty == 0
            && self.buildings[i].cash > unit + 200
        {
            let qty = ((self.buildings[i].cash - 200) / unit)
                .min((target - self.buildings[i].stock) as i64)
                .min(self.supplies[good] as i64) as u16;
            if qty > 0 {
                let cost = qty as i64 * unit + 200;
                self.buildings[i].cash -= cost;
                self.supplier_cash += cost;
                self.supplies[good] -= qty;
                self.buildings[i].delivery_qty = qty;
                self.buildings[i].delivery_at = self.tick + 15;
                self.trade(
                    format!("business:{}", i + 1),
                    "Lunar Logistics",
                    cost,
                    "restocking",
                    qty,
                );
            }
        }
        if kind != "depot" {
            let b = &mut self.buildings[i];
            b.price = catalog::merchant_price(&kind, b.stock, b.recent);
            b.reason = if b.insolvent {
                "I couldn't cover operating supplies. Closed until an investment restores working capital."
            } else if b.stock == 0 && b.delivery_qty == 0 {
                "No stock and not enough cash to reorder. An investment would help."
            } else if b.delivery_qty > 0 {
                "Restocking order paid. A supply rover is on its way."
            } else if b.stock < 5 {
                "Stock is low, so I raised my price to protect the next delivery."
            } else if b.recent >= 6 {
                "Recent demand is strong, so I raised my price by one credit."
            } else {
                "Stock is healthy. Keeping the regular price."
            }
            .into();
            if self.tick % 30 == 0 {
                b.recent = 0;
            }
        } else if self.tick % 5 == 0
            && self.buildings[i].powered
            && self.buildings[i].stock > 0
            && self.cash >= 1000
        {
            if let Some(j) = self
                .buildings
                .iter()
                .position(|b| !b.sold && ride(&b.kind) && b.connected && b.condition < 65)
            {
                self.cash -= 1000;
                self.buildings[i].cash += 1000;
                self.buildings[i].stock -= 1;
                self.buildings[i].served += 1;
                self.consumed[2] += 1;
                self.buildings[j].condition = (self.buildings[j].condition + 30).min(100);
                self.trade(
                    "Park",
                    format!("business:{}", i + 1),
                    1000,
                    "maintenance",
                    1,
                );
                if self
                    .partnerships
                    .iter()
                    .any(|p| p.building == Some(i as u32 + 1))
                {
                    let share = 1000 * self.buildings[i].rent as i64 / 100;
                    self.buildings[i].cash -= share;
                    self.cash += share;
                    self.trade(
                        format!("business:{}", i + 1),
                        "Park",
                        share,
                        "revenue share",
                        1,
                    );
                }
                self.event(format!(
                    "Nia's robot serviced {}.",
                    item(&self.buildings[j].kind).unwrap().name
                ));
            }
        }
    }
    fn choose(&mut self, gi: usize) {
        let g = &self.guests[gi];
        if self.tick - g.arrival >= 180
            || g.cash < 100
            || (g.visits >= 4 && g.hunger < 55 && g.thirst < 55)
        {
            self.leave(gi);
            return;
        }
        let (parents, distances) = self.walk_tree(g.cell);
        let mut best: Option<(i32, u32, u16, String)> = None;
        for b in &self.buildings {
            if !b.powered
                || (!ride(&b.kind) && !matches!(b.kind.as_str(), "food" | "drink"))
                || b.price > g.cash
                || (!ride(&b.kind) && b.stock == 0)
            {
                continue;
            }
            let entry = b.entry();
            if entry >= WIDTH * HEIGHT || distances[entry as usize] == u16::MAX {
                continue;
            }
            let distance = distances[entry as usize] as i32;
            let wait = b.cycle_left as i32
                + (b.queue.len() / b.seats().max(1)) as i32 * b.duration() as i32;
            let utility = if ride(&b.kind) {
                let thrill = if b.kind == "coaster" {
                    b.launch as i32 + 1
                } else {
                    item(&b.kind).unwrap().thrill
                };
                let wanted = [1, 2, 4][g.group as usize];
                105 - (thrill - wanted).abs() * 18
                    - if g.rides.contains(&b.kind) { 48 } else { 0 }
                    - b.price as i32 / 60
                    - distance * 2
                    - wait / 2
            } else {
                let need = if b.kind == "food" { g.hunger } else { g.thirst };
                if need < 45 {
                    continue;
                }
                need as i32 * 2 - b.price as i32 / 100 - distance * 2 - wait / 2
            };
            if utility > 0 && best.as_ref().map(|v| utility > v.0).unwrap_or(true) {
                best = Some((
                    utility,
                    b.id,
                    entry,
                    if ride(&b.kind) {
                        format!(
                            "Heading to {}. The price and wait look worthwhile.",
                            item(&b.kind).unwrap().name
                        )
                    } else {
                        format!(
                            "I need {}. This stall looks good.",
                            if b.kind == "food" {
                                "a snack"
                            } else {
                                "a drink"
                            }
                        )
                    },
                ));
            }
        }
        if let Some((_, id, entry, thought)) = best {
            let mut path = vec![];
            let mut c = entry;
            while c != g.cell {
                path.push(c);
                c = parents[c as usize];
            }
            path.reverse();
            let g = &mut self.guests[gi];
            g.target = Some(id);
            g.route = path;
            g.thought = thought;
            g.status = "walking".into();
            if g.route.is_empty() {
                g.status = "queueing".into();
                g.timer = 0;
                self.buildings
                    .iter_mut()
                    .find(|b| b.id == id)
                    .unwrap()
                    .queue
                    .push(g.id);
            }
        } else {
            self.guests[gi].timer = 5;
            self.guests[gi].thought =
                "Looking for something affordable with a shorter queue.".into();
            if self.tick - self.guests[gi].arrival > 110 {
                self.leave(gi);
            }
        }
    }
    fn walk_tree(&self, from: u16) -> (Vec<u16>, Vec<u16>) {
        let size = (WIDTH * HEIGHT) as usize;
        let mut paths = vec![false; size];
        for p in &self.paths {
            paths[*p as usize] = true;
        }
        let mut parent = vec![u16::MAX; size];
        let mut distance = vec![u16::MAX; size];
        let mut queue = VecDeque::from([from]);
        parent[from as usize] = from;
        distance[from as usize] = 0;
        while let Some(c) = queue.pop_front() {
            for n in Self::neighbours(c) {
                if paths[n as usize] && distance[n as usize] == u16::MAX {
                    distance[n as usize] = distance[c as usize] + 1;
                    parent[n as usize] = c;
                    queue.push_back(n);
                }
            }
        }
        (parent, distance)
    }
    fn leave(&mut self, gi: usize) {
        let path = self.route(self.guests[gi].cell, GATE, false);
        let g = &mut self.guests[gi];
        if path.is_none() {
            g.route.clear();
            g.target = None;
            g.status = "walking".into();
            g.timer = 5;
            g.thought = "The path ended here. I need a connected way back.".into();
            return;
        }
        g.target = None;
        g.route = path.unwrap();
        g.status = "leaving".into();
        g.thought = if g.satisfaction >= 75 {
            "Best day on the Moon. I'm telling everyone."
        } else {
            "Time to catch the rocket home."
        }
        .into();
    }
    fn repair_routes(&mut self) {
        for i in 0..self.guests.len() {
            let g = &self.guests[i];
            if g.status == "riding" || g.status == "gone" || g.status == "upcoming" {
                continue;
            }
            let broken = g.route.iter().any(|c| !self.paths.contains(c))
                || g.target
                    .map(|id| self.buildings.iter().any(|b| b.id == id && !b.connected))
                    .unwrap_or(false);
            if broken {
                let id = g.id;
                for b in &mut self.buildings {
                    b.queue.retain(|n| *n != id);
                }
                let g = &mut self.guests[i];
                g.route.clear();
                g.target = None;
                g.status = "walking".into();
                g.timer = 0;
                g.thought = "The paths changed. Looking for another way.".into();
            }
        }
    }
    pub fn calculate_score(&self) -> Score {
        let satisfaction = self
            .guests
            .iter()
            .filter(|g| g.visits > 0)
            .map(|g| g.satisfaction.clamp(0, 100) as u32)
            .sum::<u32>();
        let unique = self
            .guests
            .iter()
            .map(|g| g.rides.len().min(3) as u16)
            .sum::<u16>();
        let gain = self.equity() - self.opening_equity;
        let guests = 6000 * satisfaction / 9600;
        let finance = (2500 * gain.clamp(0, 150000) / 150000) as u32;
        let variety = 1500 * unique as u32 / 288;
        Score {
            guests,
            finance,
            variety,
            total: guests + finance + variety,
            happy: self
                .guests
                .iter()
                .filter(|g| g.visits > 0 && g.satisfaction >= 75)
                .count() as u16,
            equity_gain: gain,
            unique,
            satisfaction,
        }
    }
    pub fn rehash(&mut self) {
        self.hash.clear();
        self.hash = format!("{:x}", Sha256::digest(serde_json::to_vec(self).unwrap()));
    }
}
impl Default for Run {
    fn default() -> Self {
        Self::new()
    }
}
#[derive(Deserialize)]
struct Request {
    op: String,
    #[serde(default)]
    run: Option<Run>,
    #[serde(default)]
    commands: Vec<Command>,
    #[serde(default)]
    ticks: u16,
}
pub fn dispatch(s: &str) -> String {
    let result = (|| -> Result<Run, String> {
        let q: Request = serde_json::from_str(s).map_err(|e| e.to_string())?;
        if q.op == "new" {
            return Ok(Run::new());
        }
        let mut r = q.run.ok_or("Missing park")?;
        if r.version != VERSION {
            return Err("Unsupported park version".into());
        }
        r.apply(&q.commands, q.ticks)?;
        Ok(r)
    })();
    match result {
        Ok(run) => serde_json::json!({"run":run}).to_string(),
        Err(error) => serde_json::json!({"error":error}).to_string(),
    }
}
#[no_mangle]
#[cfg(not(feature = "contract"))]
pub extern "C" fn sim_alloc(len: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
}
#[no_mangle]
#[cfg(not(feature = "contract"))]
pub unsafe extern "C" fn sim_free(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}
#[no_mangle]
#[cfg(not(feature = "contract"))]
pub unsafe extern "C" fn sim_call(ptr: *mut u8, len: usize) -> u64 {
    let out = dispatch(std::str::from_utf8(std::slice::from_raw_parts(ptr, len)).unwrap_or("{}"));
    let bytes = out.into_bytes().into_boxed_slice();
    let len = bytes.len();
    let ptr = Box::into_raw(bytes) as *mut u8;
    ((ptr as u64) << 32) | len as u64
}
#[cfg(test)]
mod tests;
