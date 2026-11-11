import * as T from "three";
import {
  palette,
  nearMark,
  artSegments,
  box,
  cylinder,
  ring,
  ellipsoid,
  shapedBox,
  line,
  metal,
  fabric,
  batchColors,
  batch,
} from "./art-kit";

const SKIN = ["#c69b7e", "#875b43", "#b08361", "#563b2e", "#d1b199", "#a77959"];
const HAIR = ["#493c31", "#171b20", "#775230", "#262126", "#777974", "#392b27"];
const visorMaterial = new T.MeshPhysicalMaterial({
  color: "#47616a",
  metalness: 0.68,
  roughness: 0.12,
  transparent: true,
  opacity: 0.3,
  clearcoat: 1,
  envMapIntensity: 1.6,
  side: T.DoubleSide,
  depthWrite: false,
});

/** Shared shoulder, hip and head anchors keep saved visitors and ride rigs compatible. */
export function astronaut(color: string, size = 1, variant = 0) {
  const g = new T.Group();
  g.userData.animated = true;
  const skin = SKIN[variant % SKIN.length],
    hair = HAIR[variant % HAIR.length];
  const torso = ellipsoid(g, "#c9d1d4", 0, 0.83, 0, 0.205, 0.29, 0.15);
  torso.material = fabric("#c9d1d4");
  shapedBox(g, palette.navy, 0, 0.63, 0, 0.38, 0.1, 0.29, 0.025);
  shapedBox(g, color, 0, 0.88, 0.126, 0.27, 0.22, 0.06, 0.025);
  shapedBox(g, palette.navy, 0.025, 0.9, 0.164, 0.16, 0.12, 0.035, 0.014);
  nearMark(g, "#90e2d6", 0.075).position.set(0.025, 0.9, 0.187);
  for (const x of [-0.15, 0.15]) {
    box(g, "#55636d", x, 0.83, 0.14, 0.032, 0.39, 0.035).material =
      fabric("#55636d");
    shapedBox(g, "#acb5bb", x, 0.65, 0.135, 0.08, 0.07, 0.033, 0.012).material =
      metal("#acb5bb");
  }
  for (let i = 0; i < 3; i++)
    box(
      g,
      i === 0 ? "#74d7b0" : "#c3b18a",
      -0.04 + i * 0.04,
      0.8,
      0.17,
      0.018,
      0.013,
      0.012,
    );
  for (const x of [-0.09, 0.09]) {
    const connector = cylinder(g, "#6d7884", x, 0.72, 0.152, 0.035, 0.025);
    connector.rotation.x = Math.PI / 2;
    connector.material = metal("#6d7884");
  }
  line(
    g,
    [
      new T.Vector3(-0.1, 0.72, 0.18),
      new T.Vector3(-0.25, 0.66, 0.14),
      new T.Vector3(-0.23, 0.8, -0.15),
    ],
    0.017,
    "#a6a497",
    "cloth",
  );
  shapedBox(g, "#aebbc0", 0, 0.88, -0.2, 0.33, 0.4, 0.16, 0.045);
  shapedBox(g, palette.navy, 0, 0.88, -0.29, 0.25, 0.3, 0.05, 0.025);
  for (const x of [-0.09, 0.09]) {
    cylinder(g, "#a5adb1", x, 0.87, -0.29, 0.055, 0.28).material =
      metal("#a5adb1");
    for (const y of [0.77, 0.95])
      ring(g, palette.navy, 0.057, 0.014, x, y, -0.29);
  }
  cylinder(g, "#4a5762", 0, 1.095, 0, 0.16, 0.075);
  ring(g, "#adb8bf", 0.165, 0.018, 0, 1.13).material = metal("#adb8bf");

  const head = new T.Group();
  head.position.y = 1.325;
  g.add(head);
  const shell = new T.Mesh(
    new T.SphereGeometry(
      0.222,
      artSegments(32, 18),
      artSegments(22, 12),
      Math.PI,
      Math.PI,
    ),
    fabric("#cbd2d6"),
  );
  shell.scale.set(1.02, 1.05, 1);
  shell.castShadow = true;
  head.add(shell);
  ellipsoid(head, skin, 0, -0.008, 0.01, 0.139, 0.174, 0.128).material =
    fabric(skin);
  const cap = new T.Mesh(
    new T.SphereGeometry(0.144, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    fabric(hair),
  );
  cap.position.set(0, 0.044, 0.008);
  cap.scale.y = 0.8;
  head.add(cap);
  for (const side of [-1, 1]) {
    ellipsoid(head, "#302c2a", side * 0.05, 0.026, 0.131, 0.012, 0.017, 0.007);
    ellipsoid(head, hair, side * 0.052, 0.062, 0.127, 0.028, 0.007, 0.006);
    const ear = cylinder(head, "#788d9c", side * 0.223, 0, 0, 0.071, 0.045);
    ear.rotation.z = Math.PI / 2;
    ear.material = metal("#788d9c");
    const patch = cylinder(head, color, side * 0.248, 0, 0, 0.045, 0.012);
    patch.rotation.z = Math.PI / 2;
  }
  ellipsoid(head, skin, 0, -0.021, 0.144, 0.019, 0.03, 0.025);
  line(
    head,
    [
      new T.Vector3(-0.034, -0.072, 0.129),
      new T.Vector3(0, -0.078, 0.141),
      new T.Vector3(0.034, -0.072, 0.129),
    ],
    0.005,
    "#6c4b40",
  );
  if (variant % 6 === 4) {
    ellipsoid(head, hair, 0, -0.058, 0.139, 0.044, 0.011, 0.008);
  }
  const rim = ring(head, palette.navy, 0.211, 0.02, 0, 0, 0.047, false);
  rim.scale.y = 1.04;
  ring(head, "#8c9ba4", 0.214, 0.008, 0, 0, 0.063, false).material =
    metal("#8c9ba4");
  batchColors(head);
  batch(head);
  const visor = new T.Mesh(
    new T.SphereGeometry(
      0.218,
      artSegments(32, 18),
      artSegments(22, 12),
      0,
      Math.PI,
    ),
    visorMaterial.clone(),
  );
  visor.position.z = 0.008;
  visor.scale.y = 1.04;
  head.add(visor);
  const legs: T.Group[] = [],
    arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.108, 0.62, 0);
    ellipsoid(leg, "#bdc8cd", 0, -0.16, 0, 0.095, 0.22, 0.1).material =
      fabric("#bdc8cd");
    for (const y of [-0.32, -0.35, -0.38])
      ring(leg, "#8798a5", 0.086, 0.012, 0, y);
    shapedBox(leg, color, 0, -0.31, 0.089, 0.116, 0.12, 0.025, 0.02);
    ellipsoid(leg, "#cbd2d5", 0, -0.43, 0, 0.085, 0.14, 0.095).material =
      fabric("#cbd2d5");
    shapedBox(leg, "#637783", 0, -0.545, 0.045, 0.185, 0.11, 0.27, 0.03);
    shapedBox(leg, "#17232c", 0, -0.603, 0.048, 0.193, 0.034, 0.28, 0.013);
    for (const z of [-0.04, 0.02, 0.08, 0.14])
      box(leg, "#a1aeb5", 0, -0.5, z, 0.133, 0.015, 0.018);
    batchColors(leg);
    batch(leg);
    g.add(leg);
    legs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.237, 1.02, 0);
    ellipsoid(arm, color, 0, -0.025, 0, 0.09, 0.1, 0.1);
    ellipsoid(
      arm,
      "#c7d0d4",
      side * 0.018,
      -0.17,
      0,
      0.074,
      0.16,
      0.08,
    ).material = fabric("#c7d0d4");
    for (const y of [-0.27, -0.3, -0.33])
      ring(arm, "#8b9ba6", 0.073, 0.011, side * 0.02, y);
    ellipsoid(
      arm,
      "#c7d0d4",
      side * 0.02,
      -0.38,
      0.012,
      0.068,
      0.1,
      0.075,
    ).material = fabric("#c7d0d4");
    ring(arm, color, 0.071, 0.019, side * 0.02, -0.425);
    ellipsoid(
      arm,
      "#8094a0",
      side * 0.02,
      -0.49,
      0.015,
      0.07,
      0.086,
      0.077,
    ).material = fabric("#8094a0");
    ellipsoid(arm, "#8094a0", -side * 0.04, -0.47, 0.035, 0.028, 0.045, 0.036);
    batchColors(arm);
    batch(arm);
    g.add(arm);
    arms.push(arm);
  }
  batchColors(g);
  batch(g);
  g.userData.legs = legs;
  g.userData.arms = arms;
  g.userData.head = head;
  g.scale.setScalar(size);
  return g;
}
