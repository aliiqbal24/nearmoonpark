export type Actor = {
  name: string;
  credits: number;
  inventory: number[];
  condition: number;
  price: number;
  output: number;
  shortfall: number;
  unpaid: number;
  reason: string;
};
export type EconomicEvent = {
  id: number;
  sol: number;
  kind: string;
  actor: number;
  text: string;
  causes: number[];
};
export type Trade = {
  from: number;
  to: number;
  good: number;
  qty: number;
  paid: number;
};
export type Day = {
  sol: number;
  reserves: number[];
  production: number[];
  wellbeing: number;
  population: number;
  treasury: number;
  hash: string;
  trades: Trade[];
};
export type Run = {
  version: string;
  seed: number;
  sol: number;
  revision: number;
  population: number;
  wellbeing: number;
  fatigue: number;
  actors: Actor[];
  policy: number;
  priority: number;
  project: number;
  project_left: number;
  upgrades: boolean[];
  aid_left: number;
  aid_chapter: number;
  emergency: number[];
  battery: number;
  rescued: number;
  rescue_eta: number;
  life_debt: number;
  hardship: number;
  storm_policy: number;
  final_policy: number;
  reduced: boolean;
  pending: boolean;
  ending: string | null;
  decisions: { chapter: number; option: number; sol: number; event: number }[];
  events: EconomicEvent[];
  days: Day[];
  hash: string;
};
export type Command = {
  kind: "choice" | "aid" | "advance";
  option?: number;
  target?: number;
};
export type RecordState = { run: Run; run_id: string; owner: string };
export const GOODS = ["food", "water", "oxygen", "parts", "power"];
export const INSTITUTIONS = [
  "Power utility",
  "Ice works",
  "Greenhouse",
  "Atmospheric plant",
  "Fabrication workshop",
];
export const VERSION = "last-signal-v1";
export function reserves(r: Run) {
  return [0, 1, 2].map((g) => r.actors.reduce((n, a) => n + a.inventory[g], 0));
}
export function demand(r: Run) {
  return [
    Math.floor(r.population / 3),
    Math.floor(r.population / 2),
    Math.floor((r.population * 2) / 5),
  ];
}
