export const VERSION = "moonpark-v7";
export const LANDING = 10;
export const END = 550;
export const DAY_SECONDS = END - LANDING;
export const GOLD_SCORE = 7000;
export const WIDTH = 48;
export const HEIGHT = 48;
export const CUTOFF = "2026-11-18T23:59:00Z";
export type Kind =
  | "bounce"
  | "wheel"
  | "rover"
  | "coaster"
  | "food"
  | "drink"
  | "depot"
  | "solar";
export type Blueprint = {
  kind: Kind;
  name: string;
  cost: number;
  w: number;
  h: number;
  seats: number;
  cycle: number;
  price: number;
  power: number;
  color: string;
  description: string;
};
export const CATALOG: Blueprint[] = [
  {
    kind: "bounce",
    name: "Lunar Bounce",
    cost: 30000,
    w: 3,
    h: 3,
    seats: 6,
    cycle: 20,
    price: 400,
    power: 1,
    color: "#a486ff",
    description: "One small leap. Six very happy astronauts.",
  },
  {
    kind: "wheel",
    name: "Earthrise Wheel",
    cost: 60000,
    w: 4,
    h: 4,
    seats: 8,
    cycle: 40,
    price: 600,
    power: 2,
    color: "#f8cf76",
    description: "The best view of home in the solar system.",
  },
  {
    kind: "rover",
    name: "Rover Rally",
    cost: 80000,
    w: 5,
    h: 4,
    seats: 6,
    cycle: 30,
    price: 700,
    power: 2,
    color: "#ff9d7f",
    description: "A little moon dust. A lot of questionable driving.",
  },
  {
    kind: "coaster",
    name: "Mass-Driver Coaster",
    cost: 120000,
    w: 6,
    h: 8,
    seats: 8,
    cycle: 30,
    price: 1000,
    power: 3,
    color: "#8eddd3",
    description: "Industrial launch technology. Recreational screaming.",
  },
  {
    kind: "food",
    name: "Moon Pie Kitchen",
    cost: 15000,
    w: 2,
    h: 2,
    seats: 1,
    cycle: 3,
    price: 500,
    power: 1,
    color: "#f2ad6b",
    description: "Omar buys his own ingredients and runs the kitchen.",
  },
  {
    kind: "drink",
    name: "Crater Coolers",
    cost: 15000,
    w: 2,
    h: 2,
    seats: 1,
    cycle: 3,
    price: 400,
    power: 1,
    color: "#7ad7f1",
    description: "Mina sets prices from stock and demand.",
  },
  {
    kind: "depot",
    name: "Lunar Care Depot",
    cost: 25000,
    w: 3,
    h: 2,
    seats: 0,
    cycle: 5,
    price: 1000,
    power: 1,
    color: "#ea91ba",
    description: "Nia's robots automatically service connected rides.",
  },
  {
    kind: "solar",
    name: "Solar Canopy",
    cost: 30000,
    w: 3,
    h: 3,
    seats: 0,
    cycle: 0,
    price: 0,
    power: 0,
    color: "#91b9ff",
    description: "Four extra units of clean power.",
  },
];
export const blueprint = (kind: string) =>
  CATALOG.find((x) => x.kind === kind)!;
export const coasterDuration = (b: Building) =>
  [36, 30, 24][b.launch - 1] +
  Math.min(
    12,
    Math.floor(
      (b.design?.track ?? []).reduce((n, p, i, points) => {
        const q = points[(i + 1) % points.length];
        return (
          n + Math.abs(p.x - q.x) + Math.abs(p.z - q.z) + Math.abs(p.y - q.y)
        );
      }, 0) / 100,
    ),
  );
export const isRide = (kind: string) =>
  ["bounce", "wheel", "rover", "coaster"].includes(kind);
export const isTenant = (kind: string) => ["food", "drink"].includes(kind);
export const resaleValue = (b: Building) =>
  Math.floor(
    (b.invested *
      70 *
      (isRide(b.kind) ? Math.max(0, Math.min(100, b.condition)) : 100)) /
      10000,
  );
export type TrackPoint = { x: number; y: number; z: number };
export const isPersistent = (run: Run) =>
  run.version === VERSION || run.version === "moonpark-v6";
export const parkWidth = (run: Run) => (isPersistent(run) ? WIDTH : 32);
export const parkHeight = (run: Run) => (isPersistent(run) ? HEIGHT : 24);
export const parkOriginZ = (run: Run) => (isPersistent(run) ? 36 : 12);
export const parkGate = (run: Run) =>
  isPersistent(run) ? 47 * WIDTH + 23 : 23 * 32 + 15;
export const parkClosed = (run: Run) => run.finished && !isPersistent(run);
export type Design = {
  track?: TrackPoint[];
  name: string;
  palette: number;
  style: number;
  lights: number;
  height: number;
};
export const defaultDesign = (): Design => ({
  name: "",
  palette: 255,
  style: 0,
  lights: 0,
  height: 1,
});
export type Building = {
  blueprint_id?: string;
  design?: Design;
  height_paid?: number;
  design_paid?: number;
  design_revision?: number;
  id: number;
  kind: Kind;
  x: number;
  z: number;
  rotation: number;
  variant: number;
  price: number;
  invested: number;
  level: number;
  launch: number;
  enabled: boolean;
  sold: boolean;
  ready_at: number;
  connected: boolean;
  powered: boolean;
  condition: number;
  queue: number[];
  riders: number[];
  cycle_left: number;
  served: number;
  revenue: number;
  cash: number;
  stock: number;
  rent: number;
  delivery_qty: number;
  delivery_at: number;
  recent: number;
  reason: string;
  insolvent: boolean;
};
export type Guest = {
  id: number;
  group: number;
  arrival: number;
  cash: number;
  satisfaction: number;
  hunger: number;
  thirst: number;
  cell: number;
  route: number[];
  status: string;
  target: number | null;
  timer: number;
  rides: string[];
  visits: number;
  thought: string;
};
export type Trade = {
  tick: number;
  from: string;
  to: string;
  amount: number;
  good: string;
  qty: number;
};
export type Score = {
  guests: number;
  finance: number;
  variety: number;
  total: number;
  happy: number;
  equity_gain: number;
  unique: number;
  satisfaction: number;
};
export type Partnership = {
  id: number;
  owner: string;
  kind: Kind;
  title: string;
  target: number;
  investment: number;
  reward: number;
  available_at: number;
  duration: number;
  status: "offered" | "active" | "completed" | "expired";
  building: number | null;
  baseline: number;
  progress: number;
  deadline: number;
  settled_at: number | null;
  share_percent: number;
  earned: number;
};
export type Run = {
  version: string;
  palette?: number;
  bookings?: number[];
  reputation?: number;
  tick: number;
  revision: number;
  cash: number;
  opening_equity: number;
  supplier_cash: number;
  builder_cash: number;
  money_supply: number;
  supplies: number[];
  consumed: number[];
  grant_cash: number;
  grant_escrow: number;
  partnerships: Partnership[];
  departures: number[];
  paths: number[];
  buildings: Building[];
  guests: Guest[];
  trades: Trade[];
  trade_count: number;
  events: { tick: number; text: string }[];
  actions: number;
  finished: boolean;
  opening_ended_at?: number | null;
  issued_goods?: number[];
  score: Score;
  hash: string;
};
export type Command = {
  kind:
    | "build"
    | "path"
    | "erase_path"
    | "connect"
    | "price"
    | "launch"
    | "upgrade"
    | "toggle"
    | "partner"
    | "design"
    | "theme"
    | "sell";
  blueprint_id?: string;
  design?: Design;
  building?: number;
  item?: Kind;
  x?: number;
  z?: number;
  rotation?: number;
  variant?: number;
  value?: number;
};
export function isCosmeticCommand(run: Run, command: Command): boolean {
  if (isPersistent(run)) return false;
  if (command.kind === "theme") return true;
  if (command.kind !== "design" || !command.design) return false;
  const building = run.buildings.find(
    (b) => b.id === command.building && !b.sold,
  );
  return !!building && command.design.height === (building.design?.height ?? 1);
}
export const merchantOwner = (kind: string) =>
  ({ food: "Omar", drink: "Mina", depot: "Nia" })[kind] ?? "Lunar Logistics";
export const partnershipGoal = (p: Partnership) =>
  p.kind === "depot"
    ? `${p.target} ride repair${p.target === 1 ? "" : "s"}`
    : `${p.target} ${p.kind === "food" ? "meals" : "drinks"} sold`;
export type Entry = {
  player_id: string;
  display_name: string;
  run_id: string;
  owner: string;
  score: Score;
  completed_at: string;
};
export type RecordState = {
  run_id: string;
  park_id?: string;
  owner: string;
  player_id: string;
  display_name: string;
  ranked: boolean;
  started_at: string;
  deadline: string;
  last_request: string;
  run: Run;
};
export type Concession = {
  token_id: string;
  owner_id: string;
  merchant: string;
  share_percent: number;
  earned_credits_cents: number;
  earned_yocto: string;
  claimable_yocto: string;
  paid_yocto: string;
  pending_yocto: string;
  reserved_yocto: string;
  closed: boolean;
  transfer_pending: boolean;
};
export type PrizeStatus = {
  entries: Entry[];
  cutoff: string;
  closed: boolean;
  funding: string;
  escrow_yocto: string;
  award_tier: string;
  currency: string;
  usd_pledge_funded: boolean;
};
export type Placement = {
  kind: Kind | "path" | "erase";
  rotation: number;
  variant: number;
  design?: Design;
  blueprint_id?: string;
  launch?: number;
};
export type Detail = {
  kind: "building" | "guest";
  id: number;
  x: number;
  y: number;
};
export const money = (n: number) =>
  (n / 100).toLocaleString("en-US", { maximumFractionDigits: n % 100 ? 2 : 0 });
export const clock = (n: number) =>
  `${Math.floor(Math.max(0, n) / 60)}:${String(Math.floor(Math.max(0, n) % 60)).padStart(2, "0")}`;
export function footprint(b: Pick<Building, "kind" | "variant" | "rotation">) {
  const a = blueprint(b.kind);
  let w = a.w,
    h = a.h;
  if (b.kind === "coaster" && b.variant === 1) {
    w = 8;
    h = 6;
  }
  return b.rotation % 2 ? { w: h, h: w } : { w, h };
}
export function entrance(
  b: Pick<Building, "kind" | "variant" | "rotation" | "x" | "z">,
) {
  const { w, h } = footprint(b);
  return b.rotation % 4 === 0
    ? { x: b.x + Math.floor(w / 2), z: b.z + h }
    : b.rotation % 4 === 1
      ? { x: b.x - 1, z: b.z + Math.floor(h / 2) }
      : b.rotation % 4 === 2
        ? { x: b.x + Math.floor(w / 2), z: b.z - 1 }
        : { x: b.x + w, z: b.z + Math.floor(h / 2) };
}
export const guestName = (id: number) =>
  [
    "Ari",
    "Noor",
    "Jun",
    "Lena",
    "Samir",
    "Eva",
    "Kai",
    "Amara",
    "Leo",
    "Mina",
    "Omar",
    "Ada",
    "Niko",
    "Zoe",
    "Isla",
    "Idris",
  ][id % 16] +
  " " +
  ["Chen", "Park", "Ortiz", "Laurent", "Reed", "Sato"][Math.floor(id / 16) % 6];
export function gridRoute(
  run: Run,
  from: number,
  to: number,
  build: boolean,
): number[] {
  const WIDTH = parkWidth(run),
    HEIGHT = parkHeight(run);
  const paths = new Set(run.paths),
    occupied = new Set<number>();
  if (build)
    for (const b of run.buildings) {
      if (b.sold) continue;
      const f = footprint(b);
      for (let z = b.z; z < b.z + f.h; z++)
        for (let x = b.x; x < b.x + f.w; x++) occupied.add(z * WIDTH + x);
    }
  if (
    from < 0 ||
    to < 0 ||
    from >= WIDTH * HEIGHT ||
    to >= WIDTH * HEIGHT ||
    (build && occupied.has(from))
  )
    return [];
  const prev = new Int16Array(WIDTH * HEIGHT).fill(-1),
    distance = new Uint16Array(WIDTH * HEIGHT).fill(65535),
    queue = [from];
  prev[from] = from;
  distance[from] = 0;
  while (queue.length) {
    const c = queue.shift()!;
    if (c === to) {
      const out = [to];
      let n = to;
      while (n !== from) {
        n = prev[n];
        out.push(n);
      }
      return out.reverse();
    }
    const x = c % WIDTH,
      z = Math.floor(c / WIDTH);
    for (const n of [
      x > 0 ? c - 1 : -1,
      x + 1 < WIDTH ? c + 1 : -1,
      z > 0 ? c - WIDTH : -1,
      z + 1 < HEIGHT ? c + WIDTH : -1,
    ]) {
      if (n < 0 || (build ? occupied.has(n) : !paths.has(n))) continue;
      const cost = build && paths.has(n) ? 0 : 1,
        next = distance[c] + cost;
      if (next < distance[n]) {
        distance[n] = next;
        prev[n] = c;
        if (cost === 0) queue.unshift(n);
        else queue.push(n);
      }
    }
  }
  return [];
}
export function connectionCost(run: Run, b: Building): number | null {
  const e = entrance(b),
    route = gridRoute(run, e.z * parkWidth(run) + e.x, parkGate(run), true);
  if (!route.length) return null;
  return route.filter((c) => !run.paths.includes(c)).length * 200;
}
export function walkingRoute(run: Run, from: number, to: number): number[] {
  return gridRoute(run, from, to, false);
}
