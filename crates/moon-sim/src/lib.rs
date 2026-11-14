pub mod catalog;
pub mod partnerships;
use catalog::{item, ride, tenant};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::VecDeque;

pub const VERSION: &str = "moonpark-v8";
pub const WIDTH: u16 = 48;
pub const HEIGHT: u16 = 48;
pub const LANDING: u32 = 10;
pub const END: u32 = 550;
pub const MAX_TICKS: u16 = 20;
pub const GATE: u16 = 47 * WIDTH + 23;
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[cfg_attr(
    feature = "contract",
    derive(borsh::BorshDeserialize, borsh::BorshSerialize)
)]
pub struct Design {
    #[serde(default)]
    pub track_w: u8,
    #[serde(default)]
    pub track_h: u8,
    #[serde(default)]
    pub track: Vec<TrackPoint>,
    pub name: String,
    pub palette: u8,
    pub style: u8,
    pub lights: u8,
    pub height: u8,
}
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[cfg_attr(
    feature = "contract",
    derive(borsh::BorshDeserialize, borsh::BorshSerialize)
)]
pub struct TrackPoint {
    pub x: i16,
    pub y: u16,
    pub z: i16,
}
impl Default for Design {
    fn default() -> Self {
        Self {
            track: vec![],
            track_w: 0,
            track_h: 0,
            name: String::new(),
            palette: 255,
            style: 0,
            lights: 0,
            height: 1,
        }
    }
}
impl Design {
    pub fn starter() -> Self {
        Self {
            track_w: 16,
            track_h: 21,
            track: vec![
                TrackPoint {
                    x: 50,
                    y: 12,
                    z: 195,
                },
                TrackPoint {
                    x: 110,
                    y: 12,
                    z: 195,
                },
                TrackPoint {
                    x: 155,
                    y: 95,
                    z: 145,
                },
                TrackPoint {
                    x: 150,
                    y: 300,
                    z: 50,
                },
                TrackPoint {
                    x: 75,
                    y: 360,
                    z: 10,
                },
                TrackPoint {
                    x: 5,
                    y: 150,
                    z: 60,
                },
                TrackPoint {
                    x: 20,
                    y: 200,
                    z: 130,
                },
                TrackPoint {
                    x: 85,
                    y: 65,
                    z: 145,
                },
            ],
            ..Self::default()
        }
    }
    pub fn validate(&self) -> Result<(), String> {
        if self.name.chars().count() > 28
            || self.name.chars().any(char::is_control)
            || (self.palette > 5 && self.palette != 255)
            || self.style > 2
            || self.lights > 2
            || self.height > 2
        {
            return Err("Choose a valid name, palette and design.".into());
        }
        if !self.track.is_empty() {
            if !(4..=32).contains(&self.track.len())
                || !(8..=30).contains(&self.track_w)
                || !(8..=30).contains(&self.track_h)
            {
                return Err("Use 4–32 track points inside a maximum 30×30-tile plot.".into());
            }
            for (i, p) in self.track.iter().enumerate() {
                if p.x < 5
                    || p.z < 5
                    || p.x > self.track_w as i16 * 10 - 5
                    || p.z > self.track_h as i16 * 10 - 5
                    || !(12..=600).contains(&p.y)
                {
                    return Err(
                        "Keep the track inside its plot and between 1.2 and 60 metres high.".into(),
                    );
                }
                let q = &self.track[(i + 1) % self.track.len()];
                let distance = (p.x as i32 - q.x as i32).pow(2) + (p.z as i32 - q.z as i32).pow(2);
                if distance < 25 {
                    return Err("Leave at least half a tile between neighbouring points.".into());
                }
            }
            let a = &self.track[0];
            let b = &self.track[1];
            if a.y != 12
                || b.y != 12
                || a.z != b.z
                || b.x - a.x != 60
                || a.z != self.track_h as i16 * 10 - 15
                || (a.x + b.x) / 2 != self.track_w as i16 * 5
            {
                return Err("Keep the station connected to the entrance.".into());
            }
        } else if self.track_w != 0 || self.track_h != 0 {
            return Err("Add a closed track before choosing its footprint.".into());
        }
        Ok(())
    }
    pub fn construction_cost(&self) -> i64 {
        0
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Building {
    #[serde(default)]
    pub pending_sale: bool,
    pub id: u32,
    #[serde(default)]
    pub design: Design,
    #[serde(default)]
    pub blueprint_id: Option<String>,
    #[serde(default = "default_height")]
    pub height_paid: u8,
    #[serde(default)]
    pub design_paid: i64,
    #[serde(default)]
    pub design_revision: u32,
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
    pub ready_at: u32,
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
    pub delivery_at: u32,
    pub recent: u16,
    pub reason: String,
    #[serde(default)]
    pub insolvent: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Guest {
    pub id: u16,
    pub group: u8,
    pub arrival: u32,
    pub cash: i64,
    pub satisfaction: i32,
    pub hunger: u16,
    pub thirst: u16,
    pub cell: u16,
    pub route: Vec<u16>,
    pub status: String,
    pub target: Option<u32>,
    pub timer: u32,
    pub rides: Vec<String>,
    pub visits: u16,
    pub thought: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Trade {
    pub tick: u32,
    pub from: String,
    pub to: String,
    pub amount: i64,
    pub good: String,
    pub qty: u16,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Event {
    pub tick: u32,
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
    #[serde(default)]
    pub opening_stage: u8,
    #[serde(default)]
    pub palette: u8,
    #[serde(default = "default_bookings")]
    pub bookings: Vec<u8>,
    #[serde(default)]
    pub reputation: u16,
    pub tick: u32,
    pub revision: u32,
    pub cash: i64,
    pub opening_equity: i64,
    pub supplier_cash: i64,
    pub builder_cash: i64,
    pub money_supply: i64,
    pub supplies: [u16; 3],
    #[serde(default)]
    pub consumed: [u32; 3],
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
    pub actions: u32,
    pub finished: bool,
    pub opening_ended_at: Option<u32>,
    pub issued_goods: [u32; 3],
    pub score: Score,
    pub hash: String,
}
#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct Command {
    pub kind: String,
    #[serde(default)]
    pub design: Option<Design>,
    #[serde(default)]
    pub blueprint_id: Option<String>,
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
fn default_bookings() -> Vec<u8> {
    vec![8; 12]
}
fn default_height() -> u8 {
    1
}
impl Building {
    pub fn footprint(&self) -> (u8, u8) {
        let a = item(&self.kind).unwrap();
        let (w, h) = if self.kind == "coaster" && self.design.track_w > 0 {
            (self.design.track_w, self.design.track_h)
        } else if self.kind == "coaster" && self.variant == 1 {
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
    fn seats(&self) -> usize {
        let n = item(&self.kind).unwrap().seats as usize;
        n + n * self.level as usize / 2
    }
    fn thrill(&self) -> i32 {
        if self.kind == "coaster" {
            self.launch as i32
                + self.design.height as i32
                + i32::from(self.design.track.iter().any(|p| p.y >= 80))
        } else {
            item(&self.kind).unwrap().thrill
        }
    }
    fn duration(&self) -> u16 {
        if self.kind == "coaster" {
            let length: u16 = self
                .design
                .track
                .iter()
                .enumerate()
                .map(|(i, p)| {
                    let q = &self.design.track[(i + 1) % self.design.track.len()];
                    (p.x - q.x).unsigned_abs() + (p.z - q.z).unsigned_abs() + p.y.abs_diff(q.y)
                })
                .sum();
            [36, 30, 24][(self.launch - 1) as usize] + (length / 100).min(12)
        } else {
            item(&self.kind).unwrap().cycle
        }
    }
    pub fn resale_value(&self) -> i64 {
        self.invested / 2
    }
}
fn make_building(
    id: u32,
    kind: &str,
    x: u8,
    z: u8,
    rotation: u8,
    variant: u8,
    tick: u32,
) -> Building {
    let a = item(kind).unwrap();
    Building {
        pending_sale: false,
        id,
        design: Design::default(),
        blueprint_id: None,
        height_paid: 1,
        design_paid: 0,
        design_revision: 0,
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
        stock: if tenant(kind) { 12 } else { 0 },
        rent: catalog::VENDOR_RENT,
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
            opening_stage: 0,
            palette: 0,
            bookings: default_bookings(),
            reputation: 65,
            tick: 0,
            revision: 0,
            cash: 320000,
            opening_equity: 0,
            supplier_cash: 10000000,
            builder_cash: 1000000,
            money_supply: 0,
            supplies: [2048; 3],
            consumed: [0; 3],
            grant_cash: 0,
            grant_escrow: 0,
            partnerships: vec![],
            departures: vec![0; 64],
            paths: (8..40)
                .map(|x| 44 * WIDTH + x)
                .chain([
                    45 * WIDTH + 23,
                    46 * WIDTH + 23,
                    GATE,
                    43 * WIDTH + 20,
                    43 * WIDTH + 27,
                ])
                .collect(),
            buildings: vec![],
            guests: vec![],
            trades: vec![],
            trade_count: 0,
            events: vec![],
            actions: 0,
            finished: false,
            opening_ended_at: None,
            issued_goods: [2048; 3],
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
                arrival: 11 + (id as u32 / 8) * 40,
                cash: [2400, 3600, 4800][group as usize],
                satisfaction: 65,
                hunger: 55 + (id % 3) * 7,
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
        r.event("Welcome to Moonpark. Design your mass driver, then open a kitchen. The first rocket will wait for you.");
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
                .map(|b| b.invested)
                .sum::<i64>()
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
        for b in &mut self.buildings {
            let entry = b.entry();
            b.connected = !b.sold && entry < WIDTH * HEIGHT && connected[entry as usize];
            b.powered = !b.sold
                && !b.pending_sale
                && b.connected
                && b.enabled
                && b.ready_at <= self.tick
                && b.condition > 0
                && !b.insolvent;
        }
    }

    pub fn is_cosmetic(&self, command: &Command) -> bool {
        match command.kind.as_str() {
            "theme" => true,
            "design" => {
                let Some(design) = &command.design else {
                    return false;
                };
                self.buildings.iter().any(|b| {
                    b.id == command.building && !b.sold && b.design.height == design.height
                })
            }
            _ => false,
        }
    }
    pub fn apply(&mut self, commands: &[Command], ticks: u16) -> Result<(), String> {
        if ticks > MAX_TICKS || commands.len() > 16 {
            return Err("Batch too large.".into());
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
            next.step();
        }
        if next.opening_stage == 2
            && next
                .buildings
                .iter()
                .any(|b| b.kind == "food" && b.served > 0)
        {
            next.opening_stage = 3;
            next.event("First meal sold. Omar keeps his working capital, buys ingredients and pays your park a 10% share. NEAR settles the wallets automatically.");
        }
        next.settle_partnerships();
        next.revision += 1;
        if !next.finished {
            next.score = next.calculate_score();
        }
        next.rehash();
        *self = next;
        Ok(())
    }
    fn connect_building(&mut self, id: u32, charge: bool) -> Result<(), String> {
        let b = self
            .buildings
            .iter()
            .find(|b| b.id == id && !b.sold)
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
        if charge {
            self.spend(cells.len() as i64 * 200)?;
        }
        self.paths.extend(cells);
        Ok(())
    }
    fn command(&mut self, c: &Command) -> Result<(), String> {
        match c.kind.as_str() {
            "theme" => {
                if !(0..=5).contains(&c.value) {
                    return Err("Invalid park palette.".into());
                }
                if self.palette != c.value as u8 {
                    for b in &mut self.buildings {
                        if !b.sold && b.design.palette == 255 {
                            b.design_revision += 1;
                        }
                    }
                }
                self.palette = c.value as u8;
            }
            "design" => {
                let i = self
                    .buildings
                    .iter()
                    .position(|b| b.id == c.building && !b.sold)
                    .ok_or("Building not found")?;
                let design = c.design.clone().ok_or("Missing design")?;
                design.validate()?;
                if self.buildings[i].kind != "coaster" && design.height != 1 {
                    return Err("Only the mass driver has an adjustable height.".into());
                }
                if self.buildings[i].kind != "coaster" && !design.track.is_empty() {
                    return Err("Track editing is available on the mass driver.".into());
                }
                let structural = design.height != self.buildings[i].design.height
                    || design.track != self.buildings[i].design.track;
                let mut preview = self.buildings[i].clone();
                preview.design = design.clone();
                let (w, h) = preview.footprint();
                if preview.x as u16 + w as u16 >= WIDTH || preview.z as u16 + h as u16 >= HEIGHT {
                    return Err(
                        "This design reaches outside the park. Use a smaller footprint.".into(),
                    );
                }
                for other in self
                    .buildings
                    .iter()
                    .filter(|b| !b.sold && b.id != preview.id)
                {
                    let (ow, oh) = other.footprint();
                    if preview.x < other.x + ow
                        && preview.x + w > other.x
                        && preview.z < other.z + oh
                        && preview.z + h > other.z
                    {
                        return Err("This track would overlap another attraction.".into());
                    }
                }
                if structural
                    && self.paths.iter().any(|cell| {
                        let (x, z) = (cell % WIDTH, cell / WIDTH);
                        x >= preview.x as u16
                            && x < preview.x as u16 + w as u16
                            && z >= preview.z as u16
                            && z < preview.z as u16 + h as u16
                    })
                {
                    return Err("This track would cover a path. Keep its current footprint or clear the path first.".into());
                }
                let cost = design.construction_cost();
                let extra = cost.saturating_sub(self.buildings[i].design_paid).max(0);
                self.spend(extra)?;
                self.buildings[i].invested += extra;
                self.buildings[i].design_paid = self.buildings[i].design_paid.max(cost);
                self.buildings[i].height_paid = self.buildings[i].height_paid.max(design.height);
                if structural {
                    self.buildings[i].served = 0;
                    self.buildings[i].blueprint_id = None;
                }
                if self.buildings[i].design != design {
                    self.buildings[i].design_revision += 1;
                }
                let reconnect = structural && self.buildings[i].connected;
                let old_duration = self.buildings[i].duration();
                self.buildings[i].design = design;
                let new_duration = self.buildings[i].duration();
                self.buildings[i].cycle_left =
                    (self.buildings[i].cycle_left as u32 * new_duration as u32
                        / old_duration.max(1) as u32) as u16;
                if reconnect {
                    self.connect_building(c.building, false)?;
                }
            }
            "build" => {
                let a = item(&c.item).ok_or("Unknown blueprint")?;
                if self.opening_stage == 0 && c.item != "coaster" {
                    return Err("Start by designing your mass-driver coaster.".into());
                }
                if self.opening_stage == 1 && c.item != "food" {
                    return Err("Next, open Moon Pie Kitchen for your first guests.".into());
                }
                if c.item == "coaster" && c.design.as_ref().is_none_or(|d| d.track.is_empty()) {
                    return Err("Design a closed coaster track before building it.".into());
                }
                if self.buildings.len() >= 128 {
                    return Err("Park building limit reached.".into());
                }
                if c.rotation > 3 || c.variant > 1 {
                    return Err("Invalid blueprint orientation.".into());
                }
                let id = self.buildings.len() as u32 + 1;
                let mut b = make_building(id, &c.item, c.x, c.z, c.rotation, c.variant, self.tick);
                if let Some(design) = &c.design {
                    design.validate()?;
                    if c.item != "coaster" && (design.height != 1 || !design.track.is_empty()) {
                        return Err("Only the mass driver has an adjustable height.".into());
                    }
                    b.design = design.clone();
                    b.height_paid = b.height_paid.max(design.height);
                    b.design_paid = design.construction_cost();
                    b.invested += b.design_paid;
                }
                if c.value != 0 {
                    if !(1..=3).contains(&c.value) {
                        return Err("Invalid launch setting.".into());
                    }
                    b.launch = c.value as u8;
                }
                b.blueprint_id = c.blueprint_id.clone();
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
                self.spend(b.invested)?;
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
                if self.opening_stage < 2 {
                    self.connect_building(id, false)?;
                    self.buildings.last_mut().unwrap().ready_at = self.tick;
                    self.opening_stage += 1;
                    if self.opening_stage == 2 {
                        self.event(
                            "Your coaster and kitchen are ready. The first rocket is coming in!",
                        );
                    }
                }
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
            "connect" => self.connect_building(c.building, true)?,
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
                    "price" => return Err("Ride fares are automatic.".into()),
                    "launch" => {
                        if k != "coaster" || !(1..=3).contains(&c.value) {
                            return Err("Invalid launch setting.".into());
                        }
                        if self.buildings[i].launch != c.value as u8 {
                            self.buildings[i].design_revision += 1;
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
                    "toggle" => return Err("Attractions open automatically.".into()),
                    "rent" | "invest" => {
                        return Err("Vendors manage their own working capital and pay a fixed 10% park share.".into());
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
                        self.buildings[i].pending_sale = true;
                        self.buildings[i].queue.clear();
                        for guest in &mut self.guests {
                            if guest.target == Some(c.building) && guest.status != "riding" {
                                guest.target = None;
                                guest.route.clear();
                                guest.status = "walking".into();
                            }
                        }
                        if self.buildings[i].riders.is_empty() {
                            self.finish_sale(i);
                        }
                    }
                    _ => unreachable!(),
                }
            }
            _ => return Err("Unknown park action.".into()),
        }
        Ok(())
    }
    fn finish_sale(&mut self, i: usize) {
        let refund = self.buildings[i].resale_value();
        self.cash += refund;
        self.builder_cash -= refund;
        self.buildings[i].sold = true;
        self.buildings[i].pending_sale = false;
        if self.opening_stage < 2
            && !self
                .buildings
                .iter()
                .any(|b| b.kind == "coaster" && !b.sold)
        {
            self.opening_stage = 0;
        }
        self.trade("Builder", "Park", refund, "resale", 1);
    }
    fn step(&mut self) {
        if self.opening_stage < 2 {
            return;
        }
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
            } else if kind == "depot" {
                self.maintain(i);
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
                            let thrill = self.buildings[i].thrill();
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
            if self.buildings[i].pending_sale && self.buildings[i].riders.is_empty() {
                self.finish_sale(i);
                continue;
            }
            if kind == "solar"
                && self.buildings[i].powered
                && self.tick % 20 == 0
                && self.supplier_cash >= 500
            {
                self.supplier_cash -= 500;
                self.cash += 500;
                self.buildings[i].revenue += 500;
                self.trade("Supplier", "Park", 500, "solar export", 1);
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
                        self.vendor_overhead(i, catalog::SHOP_OVERHEAD);
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
                        let fee = 100.min(self.cash);
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
            .filter(|g| g.status != "upcoming" && g.status != "gone" && g.status != "cancelled")
            .count();
        for gi in 0..self.guests.len() {
            if self.tick.saturating_sub(self.guests[gi].arrival) > 360
                && !matches!(
                    self.guests[gi].status.as_str(),
                    "upcoming" | "gone" | "cancelled" | "riding"
                )
            {
                let id = self.guests[gi].id;
                for b in &mut self.buildings {
                    b.queue.retain(|g| *g != id);
                }
                self.guests[gi].route.clear();
                self.guests[gi].status = "boarding".into();
                self.guests[gi].timer = self.tick.saturating_sub(40);
                self.guests[gi].thought = "The terminal shuttle is taking me home.".into();
            }
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
            if status == "upcoming"
                || status == "gone"
                || status == "boarding"
                || status == "cancelled"
            {
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
            self.departures[(self.tick / 40 % 64) as usize] = count;
            if count > 0 {
                self.event(format!(
                    "Shuttle homebound: {count} visitors boarded. See you next time!"
                ));
            }
        }
        self.settle_partnerships();
        if !self.finished
            && self
                .guests
                .iter()
                .take(96)
                .all(|g| matches!(g.status.as_str(), "gone" | "cancelled"))
        {
            self.score = self.calculate_score();
            self.finished = true;
            self.opening_ended_at = Some(self.tick);
            self.event("Opening cohort complete. Your score is sealed. Your park keeps growing.");
        }
        if self.finished && self.tick % 40 == 11 {
            self.next_visitors();
        }
    }
    fn next_visitors(&mut self) {
        // Returning travellers bring new, explicitly issued test credits. The first
        // cohort and its sealed score remain untouched. Reuse at most 48 live slots.
        for seat in 0..8 {
            let slot = self
                .guests
                .iter()
                .skip(96)
                .position(|g| g.status == "gone")
                .map(|i| i + 96);
            let i = match slot {
                Some(i) => i,
                None if self.guests.len() < 144 => self.guests.len(),
                _ => break,
            };
            let group = (seat % 3) as u8;
            let cash = [2400, 3600, 4800][group as usize];
            if i < self.guests.len() {
                self.supplier_cash += self.guests[i].cash;
            }
            let guest = Guest {
                id: i as u16,
                group,
                arrival: self.tick,
                cash,
                satisfaction: 65,
                hunger: 25,
                thirst: 30,
                cell: GATE,
                route: vec![],
                status: "upcoming".into(),
                target: None,
                timer: 0,
                rides: vec![],
                visits: 0,
                thought: "Back on the Moon. What is new?".into(),
            };
            if i == self.guests.len() {
                self.guests.push(guest);
            } else {
                self.guests[i] = guest;
            }
            self.money_supply += cash;
        }
        for asset in 0..3 {
            if self.supplies[asset] < 128 {
                self.supplies[asset] += 1024;
                self.issued_goods[asset] += 1024;
            }
        }
        self.event("A new rocket has arrived. Regular visitor income funds your next creation.");
    }
    fn vendor_overhead(&mut self, i: usize, amount: i64) {
        self.buildings[i].cash -= amount;
        self.supplier_cash += amount;
        self.trade(
            format!("business:{}", self.buildings[i].id),
            "Lunar Logistics",
            amount,
            "service supplies",
            1,
        );
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
        let good = if kind == "food" { 0 } else { 1 };
        let unit = [200, 100][good];
        let target = 16;
        let threshold = 4;
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
        let b = &mut self.buildings[i];
        b.price = catalog::merchant_price(&kind, b.stock, b.recent);
        b.reason = if b.stock == 0 && b.delivery_qty == 0 {
            "Waiting for Lunar Logistics to replenish supplies."
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
    }
    fn maintain(&mut self, i: usize) {
        if self.tick % 5 != 0
            || !self.buildings[i].powered
            || self.cash < catalog::REPAIR_FEE
            || self.supplies[2] == 0
        {
            return;
        }
        if let Some(j) = self
            .buildings
            .iter()
            .position(|b| !b.sold && ride(&b.kind) && b.connected && b.condition < 65)
        {
            self.cash -= catalog::REPAIR_FEE;
            self.supplier_cash += catalog::REPAIR_FEE;
            self.supplies[2] -= 1;
            self.consumed[2] += 1;
            self.buildings[i].served += 1;
            self.buildings[j].condition = (self.buildings[j].condition + 30).min(100);
            self.trade(
                "Park",
                "Lunar Logistics",
                catalog::REPAIR_FEE,
                "maintenance",
                1,
            );
            self.event(format!(
                "Nia's park robot serviced {}.",
                item(&self.buildings[j].kind).unwrap().name
            ));
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
                let thrill = b.thrill();
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
            .take(96)
            .filter(|g| g.visits > 0)
            .map(|g| g.satisfaction.clamp(0, 100) as u32)
            .sum::<u32>();
        let unique = self
            .guests
            .iter()
            .take(96)
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
                .take(96)
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
