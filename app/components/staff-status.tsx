"use client";
import { money, type Run } from "@/lib/moon/model";
import type { Config } from "@/lib/moon/near";
import { VendorWallets } from "./vendor-wallets";
export const STAFF = {
  omar: {
    name: "Illia",
    business: "Attention Kitchen",
    kind: "food",
    tagline: "Attention Is All You Knead",
    fullName: "Illia Polosukhin",
    image: "/art/cameo-illia-v1.webp",
  },
  mina: {
    name: "Mert",
    business: "Finality Fizz",
    kind: "drink",
    tagline: "Low latency. Zero thirst.",
    fullName: "Mert Mumtaz",
    image: "/art/cameo-mert-v1.webp",
  },
  nia: {
    name: "Haseeb",
    business: "Dragonfly Garage",
    kind: "depot",
    tagline: "Due diligence, then duct tape.",
    fullName: "Haseeb Qureshi",
    image: "/art/cameo-haseeb-v1.webp",
  },
} as const;
export type StaffRole = keyof typeof STAFF;

export function StaffPortraits({
  run,
  onSelect,
}: {
  run: Run;
  onSelect: (role: StaffRole) => void;
}) {
  return (
    <nav className="mp-staff-portraits" aria-label="Park people">
      {(Object.keys(STAFF) as StaffRole[]).map((role) => {
        const person = STAFF[role];
        const active = run.buildings.some(
          (b) =>
            !b.sold &&
            b.kind === person.kind &&
            b.ready_at <= run.tick &&
            b.connected &&
            b.powered,
        );
        return (
          <button
            key={role}
            onClick={() => onSelect(role)}
            aria-label={`View ${person.name}’s status`}
            title={`${person.name} · ${person.business}`}
          >
            <span className={active ? "mp-staff-face active" : "mp-staff-face"}>
              <img src={person.image} alt="" />
            </span>
            <span>{person.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function StaffStatus({
  role,
  run,
  config,
  runId,
}: {
  role: StaffRole;
  run: Run;
  config: Config | null;
  runId?: string;
}) {
  const person = STAFF[role];
  const outlets = run.buildings.filter(
    (b) => !b.sold && b.kind === person.kind,
  );
  const ready = outlets.filter(
    (b) => b.ready_at <= run.tick && b.connected && b.powered,
  );
  const sum = (key: "cash" | "stock" | "served") =>
    outlets.reduce((total, b) => total + b[key], 0);
  const repairsNeeded = run.buildings.filter(
    (b) =>
      !b.sold &&
      ["coaster", "bounce", "wheel", "rover"].includes(b.kind) &&
      b.condition < 65,
  ).length;
  const status = !outlets.length
    ? "Ready to join your park"
    : !ready.length
      ? "Getting ready"
      : role === "nia"
        ? repairsNeeded
          ? "Looking after the rides"
          : "The rides are in good shape"
        : ready.some((b) => b.stock > 0 && !b.insolvent)
          ? "Open for business"
          : "Waiting for fresh stock";
  return (
    <section className="mp-staff-status">
      <p className="mp-eyebrow">LUNAR CAMEO · {person.fullName}</p>
      <div className="mp-staff-intro">
        <img src={person.image} alt={person.name} />
        <div>
          <strong>{person.business}</strong>
          <p>{status}</p>
          <small>{person.tagline}</small>
        </div>
      </div>
      {role === "nia" ? (
        <>
          <p>
            Haseeb’s park robots handle repairs automatically. Build a Lunar
            Care Depot to give them a base.
          </p>
          <dl>
            <div>
              <dt>Care depots</dt>
              <dd>{ready.length}</dd>
            </div>
            <div>
              <dt>Repairs completed</dt>
              <dd>{sum("served")}</dd>
            </div>
            <div>
              <dt>Rides needing attention</dt>
              <dd>{repairsNeeded}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p>
            {person.name} runs{" "}
            {role === "omar" ? "the kitchens" : "the drink stalls"}, buys stock
            and pays your park a 10% share of every sale.
          </p>
          <dl>
            <div>
              <dt>Business cash</dt>
              <dd>{money(sum("cash"))}</dd>
            </div>
            <div>
              <dt>{role === "omar" ? "Meals in stock" : "Drinks in stock"}</dt>
              <dd>{sum("stock")}</dd>
            </div>
            <div>
              <dt>Customers served</dt>
              <dd>{sum("served")}</dd>
            </div>
            <div>
              <dt>Open outlets</dt>
              <dd>{ready.length}</dd>
            </div>
          </dl>
          {config?.vendors && runId && (
            <VendorWallets
              cfg={config}
              runId={runId}
              role={role}
              initiallyOpen
            />
          )}
        </>
      )}
    </section>
  );
}
