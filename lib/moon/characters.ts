import * as T from "three";
import {
  palette,
  nearMark,
  artSegments,
  box,
  sphere,
  cylinder,
  ring,
  ellipsoid,
  shapedBox,
  line,
  metal,
  fabric,
  glass,
  batchColors,
  batch,
} from "./art-kit";

const SKIN = ["#eeb38c", "#a66b4d", "#d2936e", "#754b39", "#f3c5a1", "#bd8059"];
const HAIR = ["#5a3428", "#201f24", "#b47636", "#352720", "#beb7a5", "#47352f"];

/** Articulated visitors share the same six animation anchors throughout the game. */
export function astronaut(color: string, size = 1, variant = 0) {
  const g = new T.Group();
  g.userData.animated = true;
  const skin = SKIN[variant % SKIN.length],
    hair = HAIR[variant % HAIR.length];
  const torso = ellipsoid(g, palette.ivory, 0, 0.53, 0, 0.225, 0.29, 0.168);
  torso.material = fabric(palette.ivory);
  shapedBox(g, color, 0, 0.54, 0.152, 0.29, 0.28, 0.07, 0.055);
  box(g, palette.navy, 0, 0.36, 0, 0.39, 0.095, 0.28);
  for (const x of [-0.155, 0.155]) {
    box(g, palette.gold, x, 0.51, 0.195, 0.025, 0.35, 0.025).material = metal(
      palette.gold,
    );
    shapedBox(g, palette.ivory, x, 0.325, 0.11, 0.115, 0.13, 0.08, 0.025);
  }
  shapedBox(
    g,
    palette.gold,
    0,
    0.36,
    0.157,
    0.105,
    0.07,
    0.035,
    0.018,
  ).material = metal(palette.gold);
  shapedBox(g, palette.navy, 0, 0.6, 0.204, 0.17, 0.12, 0.015, 0.02);
  nearMark(g, "#a7efd4", 0.085).position.set(0, 0.6, 0.22);
  for (const x of [-0.045, 0, 0.045])
    sphere(g, "#fce6a5", x, 0.52, 0.206, 0.013);
  const patch = cylinder(g, palette.gold, 0.08, 0.66, 0.202, 0.038, 0.015);
  patch.rotation.x = Math.PI / 2;
  patch.material = metal(palette.gold);
  shapedBox(g, palette.navy, 0, 0.56, -0.185, 0.29, 0.34, 0.16, 0.07);
  shapedBox(g, color, 0, 0.56, -0.29, 0.24, 0.28, 0.08, 0.04);
  for (const x of [-0.105, 0.105]) {
    cylinder(g, palette.ivory, x, 0.57, -0.3, 0.065, 0.25);
    ring(g, palette.gold, 0.066, 0.015, x, 0.48, -0.3).material = metal(
      palette.gold,
    );
  }
  line(
    g,
    [
      new T.Vector3(-0.2, 0.54, -0.2),
      new T.Vector3(-0.29, 0.4, -0.08),
      new T.Vector3(-0.19, 0.38, 0.12),
    ],
    0.021,
    palette.gold,
    "metal",
  );
  cylinder(g, palette.navy, 0, 0.79, 0, 0.2, 0.08);
  ring(g, palette.gold, 0.205, 0.022, 0, 0.82).material = metal(palette.gold);

  const head = new T.Group();
  head.position.y = 0.99;
  g.add(head);
  const shell = new T.Mesh(
    new T.SphereGeometry(
      0.32,
      artSegments(24, 16),
      artSegments(16, 10),
      Math.PI,
      Math.PI,
    ),
    fabric(palette.ivory),
  );
  shell.scale.set(1.02, 1.05, 1);
  shell.castShadow = true;
  head.add(shell);
  ellipsoid(head, skin, 0, -0.015, 0.045, 0.23, 0.255, 0.21).material =
    fabric(skin);
  // Sculpted hair stays inside the helmet, leaving the expressive face readable.
  const cap = new T.Mesh(
    new T.SphereGeometry(
      0.235,
      artSegments(24, 16),
      artSegments(12, 8),
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5,
    ),
    fabric(hair),
  );
  cap.position.set(0, 0.075, 0.035);
  cap.scale.set(1, 0.7, 0.93);
  head.add(cap);
  for (let i = 0; i < 3; i++) {
    const lock = ellipsoid(
      head,
      hair,
      -0.1 + i * 0.085,
      0.175 - i * 0.015,
      0.15,
      0.105,
      0.052,
      0.088,
    );
    lock.rotation.z = -0.22;
  }
  if (variant % 3 === 1) {
    for (const x of [-0.19, 0.19])
      ellipsoid(head, hair, x, -0.035, -0.02, 0.065, 0.17, 0.13);
  }
  for (const x of [-1, 1]) {
    const cheek = ellipsoid(
      head,
      "#de8d75",
      x * 0.133,
      -0.085,
      0.208,
      0.039,
      0.027,
      0.012,
    );
    cheek.material = fabric("#de8d75");
    ellipsoid(head, "#382c2b", x * 0.081, 0.025, 0.237, 0.028, 0.039, 0.016);
    sphere(head, "#fff8df", x * 0.081 - 0.008, 0.038, 0.252, 0.009);
    const eyebrow = box(
      head,
      hair,
      x * 0.08,
      0.092,
      0.228,
      0.068,
      0.018,
      0.015,
    );
    eyebrow.rotation.z = x * 0.12;
    const ear = cylinder(head, color, x * 0.31, 0, 0, 0.09, 0.065);
    ear.rotation.z = Math.PI / 2;
    const outer = cylinder(head, palette.gold, x * 0.35, 0, 0, 0.053, 0.021);
    outer.rotation.z = Math.PI / 2;
    outer.material = metal(palette.gold);
  }
  ellipsoid(head, skin, 0, -0.039, 0.254, 0.035, 0.042, 0.041);
  line(
    head,
    [
      new T.Vector3(-0.075, -0.11, 0.239),
      new T.Vector3(0, -0.137, 0.255),
      new T.Vector3(0.075, -0.11, 0.239),
    ],
    0.011,
    "#774139",
  );
  line(
    head,
    [
      new T.Vector3(-0.052, -0.119, 0.25),
      new T.Vector3(0, -0.127, 0.261),
      new T.Vector3(0.05, -0.12, 0.25),
    ],
    0.005,
    "#fff4dc",
  );
  if (variant % 6 === 4) {
    for (const x of [-1, 1])
      ellipsoid(head, hair, x * 0.039, -0.084, 0.25, 0.047, 0.02, 0.019);
  }
  const rim = ring(head, palette.ivory, 0.303, 0.032, 0, 0, 0.075, false);
  rim.scale.y = 1.04;
  const trim = ring(head, palette.gold, 0.306, 0.009, 0, 0, 0.099, false);
  trim.scale.y = 1.04;
  trim.material = metal(palette.gold);
  batchColors(head);
  batch(head);
  const visor = new T.Mesh(
    new T.SphereGeometry(
      0.312,
      artSegments(24, 16),
      artSegments(16, 10),
      0,
      Math.PI,
    ),
    glass,
  );
  visor.position.z = 0.015;
  visor.scale.y = 1.04;
  head.add(visor);
  const highlight = ellipsoid(
    head,
    "#f2fffc",
    -0.14,
    0.14,
    0.246,
    0.055,
    0.018,
    0.009,
  );
  highlight.rotation.z = 0.5;
  highlight.castShadow = false;

  const legs: T.Group[] = [],
    arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.115, 0.3, 0);
    const thigh = shapedBox(
      leg,
      palette.ivory,
      0,
      -0.08,
      0,
      0.17,
      0.24,
      0.18,
      0.065,
    );
    thigh.material = fabric(palette.ivory);
    shapedBox(leg, color, 0, -0.085, 0.102, 0.125, 0.11, 0.038, 0.03);
    ring(leg, palette.gold, 0.082, 0.018, 0, -0.18).material = metal(
      palette.gold,
    );
    shapedBox(leg, palette.ivory, 0, -0.24, 0.045, 0.19, 0.145, 0.28, 0.055);
    shapedBox(leg, palette.rubber, 0, -0.312, 0.048, 0.2, 0.055, 0.29, 0.024);
    box(leg, color, 0, -0.235, 0.179, 0.16, 0.05, 0.018);
    batchColors(leg);
    batch(leg);
    g.add(leg);
    legs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.255, 0.71, 0);
    ellipsoid(arm, color, 0, -0.035, 0, 0.105, 0.105, 0.11);
    const sleeve = ellipsoid(
      arm,
      palette.ivory,
      0,
      -0.16,
      0.006,
      0.083,
      0.145,
      0.087,
    );
    sleeve.material = fabric(palette.ivory);
    ring(arm, palette.gold, 0.077, 0.018, 0, -0.25).material = metal(
      palette.gold,
    );
    ellipsoid(arm, color, 0, -0.305, 0.035, 0.079, 0.075, 0.09);
    ellipsoid(arm, color, -side * 0.065, -0.287, 0.064, 0.035, 0.048, 0.042);
    batchColors(arm);
    batch(arm);
    g.add(arm);
    arms.push(arm);
  }
  batchColors(g);
  batch(g);
  g.scale.setScalar(size);
  g.userData.legs = legs;
  g.userData.arms = arms;
  g.userData.head = head;
  return g;
}
