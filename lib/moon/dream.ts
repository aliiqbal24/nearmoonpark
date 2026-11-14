import {
  blueprint,
  parkWidth,
  parkGate,
  isPersistent,
  defaultDesign,
  entrance,
  gridRoute,
  walkingRoute,
  isRide,
  type Run,
  type Kind,
} from "./model";
export function dreamPark(initial: Run, expanded = false): Run {
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
  if (expanded && isPersistent(r)) {
    // An aspirational established resort for the film. Every attraction is a playable model.
    kinds.push(
      ["coaster", -4, -15],
      ["wheel", 9, -14],
      ["rover", 18, -15],
      ["coaster", 30, -14],
      ["wheel", 1, -3],
      ["rover", 12, -4],
      ["food", 19, -5],
      ["drink", 23, -5],
      ["solar", 27, -5],
      ["coaster", 31, -3],
      ["drink", -3, -3],
      ["food", 4, -5],
    );
  }
  for (const [k, x, z] of kinds) {
    const a = blueprint(k);
    r.buildings.push({
      ...structuredClone(base),
      id: r.buildings.length + 1,
      kind: k,
      x: x + (isPersistent(r) ? 8 : 0),
      z: z + (isPersistent(r) ? 24 : 0),
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
  if (expanded) {
    let signature = 0;
    for (const b of r.buildings.filter(
      (b) => b.kind === "coaster" && b.id > 9,
    )) {
      signature++;
      b.design = {
        ...defaultDesign(),
        palette: [1, 4, 3][signature % 3],
        style: signature % 3,
        lights: 1,
        track: [
          { x: -32, y: 12, z: 34 },
          { x: 30, y: 12, z: 34 },
          { x: 39, y: 36, z: 0 },
          { x: 28, y: signature === 1 ? 58 : 100, z: -32 },
          { x: -12, y: signature === 1 ? 48 : 82, z: -34 },
          { x: -39, y: 35, z: -16 },
          { x: -18, y: signature === 1 ? 28 : 70, z: 9 },
          { x: 12, y: 24, z: 15 },
        ],
      };
    }
  }
  for (const b of r.buildings) {
    b.powered = true;
    b.connected = true;
    b.queue = [];
    const e = entrance(b),
      route = gridRoute(r, e.z * parkWidth(r) + e.x, parkGate(r), true);
    for (const c of route) if (!r.paths.includes(c)) r.paths.push(c);
  }
  const destinations = r.buildings.filter(
    (b) => b.kind !== "solar" && b.kind !== "depot",
  );
  for (let i = 0; i < (expanded ? 72 : 36); i++) {
    const g = r.guests[i],
      b = destinations[i % destinations.length],
      e = entrance(b);
    g.target = b.id;
    g.route = walkingRoute(r, parkGate(r), e.z * parkWidth(r) + e.x);
    if (i < 12) {
      g.status = "queueing";
      g.cell = e.z * parkWidth(r) + e.x;
      b.queue.push(g.id);
    } else {
      g.status = "walking";
      g.cell = g.route[(i * 3) % g.route.length] ?? parkGate(r);
    }
  }
  return r;
}
