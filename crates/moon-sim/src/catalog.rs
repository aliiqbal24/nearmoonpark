use serde::Serialize;

#[derive(Clone, Copy, Serialize)]
pub struct Item {
    pub kind: &'static str,
    pub name: &'static str,
    pub cost: i64,
    pub w: u8,
    pub h: u8,
    pub seats: u8,
    pub cycle: u16,
    pub price: i64,
    pub power: u8,
    pub thrill: i32,
    pub description: &'static str,
}
pub const CATALOG: [Item; 8] = [
    Item {
        kind: "bounce",
        name: "Lunar Bounce",
        cost: 30000,
        w: 3,
        h: 3,
        seats: 6,
        cycle: 20,
        price: 400,
        power: 1,
        thrill: 1,
        description: "One small leap. Six very happy astronauts.",
    },
    Item {
        kind: "wheel",
        name: "Earthrise Wheel",
        cost: 60000,
        w: 4,
        h: 4,
        seats: 8,
        cycle: 40,
        price: 600,
        power: 2,
        thrill: 1,
        description: "The best view of home in the solar system.",
    },
    Item {
        kind: "rover",
        name: "Rover Rally",
        cost: 80000,
        w: 5,
        h: 4,
        seats: 6,
        cycle: 30,
        price: 700,
        power: 2,
        thrill: 2,
        description: "A little moon dust. A lot of questionable driving.",
    },
    Item {
        kind: "coaster",
        name: "Mass-Driver Coaster",
        cost: 120000,
        w: 6,
        h: 8,
        seats: 8,
        cycle: 30,
        price: 1000,
        power: 3,
        thrill: 3,
        description: "Industrial launch technology. Recreational screaming.",
    },
    Item {
        kind: "food",
        name: "Attention Kitchen",
        cost: 15000,
        w: 2,
        h: 2,
        seats: 1,
        cycle: 3,
        price: 500,
        power: 1,
        thrill: 0,
        description: "Illia's independent kitchen. Fresh pies, finite pockets.",
    },
    Item {
        kind: "drink",
        name: "Finality Fizz",
        cost: 15000,
        w: 2,
        h: 2,
        seats: 1,
        cycle: 3,
        price: 400,
        power: 1,
        thrill: 0,
        description: "Mert's ice drinks. She buys her own stock and sets her prices.",
    },
    Item {
        kind: "depot",
        name: "Dragonfly Garage",
        cost: 25000,
        w: 3,
        h: 2,
        seats: 0,
        cycle: 5,
        price: 1000,
        power: 1,
        thrill: 0,
        description: "Haseeb's repair robots keep connected attractions running.",
    },
    Item {
        kind: "solar",
        name: "Solar Canopy",
        cost: 30000,
        w: 3,
        h: 3,
        seats: 0,
        cycle: 0,
        price: 0,
        power: 0,
        thrill: 0,
        description: "Exports solar energy for 5 credits every 20 seconds.",
    },
];
pub fn item(kind: &str) -> Option<Item> {
    CATALOG.iter().find(|i| i.kind == kind).copied()
}
pub fn ride(kind: &str) -> bool {
    matches!(kind, "bounce" | "wheel" | "rover" | "coaster")
}
pub fn tenant(kind: &str) -> bool {
    matches!(kind, "food" | "drink")
}
// Fixed terms keep vendor finances automatic. Costs are charged on a sale, never while idle.
pub const VENDOR_RENT: u8 = 10;
pub const SHOP_OVERHEAD: i64 = 50;
pub const REPAIR_FEE: i64 = 1000;
pub fn merchant_price(kind: &str, stock: u16, recent: u16) -> i64 {
    let base = if kind == "food" { 500 } else { 400 };
    base + if stock < 5 {
        200
    } else if stock < 9 {
        100
    } else {
        0
    } + if recent >= 6 { 100 } else { 0 }
}
