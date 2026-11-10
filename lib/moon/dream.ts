import {
  blueprint,
  defaultDesign,
  entrance,
  gridRoute,
  walkingRoute,
  isRide,
  type Run,
  type Kind,
} from "./model";
export function dreamPark(initial: Run): Run {
  const r = structuredClone(initial);
  const base = r.buildings[0];
  r.tick = 40;
  const kinds: [Kind, number, number][] = [
    ["coaster", 3, 5],
    ["wheel", 22, 5],
    ["rover", 22, 12],
    ["drink", 23, 17],
    ["depot", 27, 17],
    ["solar", 16, 6],
    ["bounce", 15, 11],
  ];
  for (const [k, x, z] of kinds) {
    const a = blueprint(k);
    r.buildings.push({
      ...structuredClone(base),
      id: r.buildings.length + 1,
      kind: k,
      x,
      z,
      price: a.price,
      invested: a.cost,
      ready_at: 0,
      powered: true,
      connected: true,
      stock: 16,
      design: {
        ...defaultDesign(),
        style: ["wheel", "drink", "solar"].includes(k)
          ? 1
          : ["rover", "depot"].includes(k)
            ? 2
            : 0,
      },
      riders: isRide(k) ? [0, 1, 2, 3] : [],
    });
  }
  for (const b of r.buildings) {
    b.powered = true;
    b.connected = true;
    b.queue = [];
    const e = entrance(b),
      route = gridRoute(r, e.z * 32 + e.x, 23 * 32 + 15, true);
    for (const c of route) if (!r.paths.includes(c)) r.paths.push(c);
  }
  const destinations = r.buildings.filter(
    (b) => b.kind !== "solar" && b.kind !== "depot",
  );
  for (let i = 0; i < 36; i++) {
    const g = r.guests[i],
      b = destinations[i % destinations.length],
      e = entrance(b);
    g.target = b.id;
    g.route = walkingRoute(r, 23 * 32 + 15, e.z * 32 + e.x);
    if (i < 12) {
      g.status = "queueing";
      g.cell = e.z * 32 + e.x;
      b.queue.push(g.id);
    } else {
      g.status = "walking";
      g.cell = g.route[(i * 3) % g.route.length] ?? 23 * 32 + 15;
    }
  }
  return r;
}
