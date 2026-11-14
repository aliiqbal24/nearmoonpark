import * as T from "three";
import type { Building } from "./model";
import {
  palette,
  nearMark,
  material,
  metal,
  fabric,
  glass,
  glow,
  box,
  sphere,
  cylinder,
  ring,
  beam,
  line,
  arch,
  shapedBox,
  ellipsoid,
  batch,
  label,
} from "./art-kit";
import { astronaut } from "./characters";
import {
  vault,
  marquee,
  equipmentPanel,
  safetyRail,
  windowPanel,
  type ResortColors,
  type StyledBuilding,
} from "./resort-props";

export type RideRig = {
  train?: T.Group;
  curve?: T.CatmullRomCurve3;
  upAt?: (u: number) => T.Vector3;
  animate: (time: number, b: Building, progress: number) => void;
};
const RIDER_COLORS = [
  "#e7ad79",
  "#68bfae",
  "#af8ed3",
  "#dc8166",
  "#84b8d5",
  "#dbb64f",
];
function rider(
  parent: T.Object3D,
  index: number,
  x: number,
  y: number,
  z: number,
  size = 0.4,
) {
  const person = astronaut(RIDER_COLORS[index % 6], size, index);
  person.position.set(x, y, z);
  person.visible = false;
  for (const arm of person.userData.arms as T.Object3D[]) arm.rotation.x = -0.6;
  parent.add(person);
  return person;
}
function showRiders(people: T.Object3D[], b: Building) {
  people.forEach((person, i) => {
    person.visible = i < b.riders.length;
  });
}
function capsule(
  parent: T.Object3D,
  c: ResortColors,
  index: number,
  people: T.Object3D[],
) {
  const car = new T.Group();
  shapedBox(car, c.dark, 0, 0.03, 0, 0.65, 0.18, 0.88, 0.08);
  shapedBox(car, c.light, 0, 0.23, 0, 0.66, 0.31, 0.86, 0.14);
  shapedBox(car, c.primary, 0, 0.22, 0.04, 0.67, 0.19, 0.72, 0.08);
  shapedBox(car, c.dark, 0, 0.35, -0.23, 0.54, 0.31, 0.14, 0.055);
  for (const x of [-0.18, 0.18]) {
    shapedBox(car, c.primary, x, 0.4, -0.08, 0.21, 0.06, 0.29, 0.02).material =
      fabric(c.primary);
    sphere(car, "#ffefb4", x, 0.22, 0.415, 0.055).material = glow("#ffdc8d");
    const person = rider(
      car,
      index * 2 + (x > 0 ? 1 : 0),
      x,
      0.38,
      -0.05,
      0.36,
    );
    people.push(person);
  }
  const windshield = ellipsoid(car, "#8bd1dd", 0, 0.41, 0.27, 0.28, 0.18, 0.12);
  windshield.material = glass;
  windshield.castShadow = false;
  line(
    car,
    [
      new T.Vector3(-0.29, 0.32, 0.12),
      new T.Vector3(-0.24, 0.59, 0.04),
      new T.Vector3(0.24, 0.59, 0.04),
      new T.Vector3(0.29, 0.32, 0.12),
    ],
    0.026,
    c.accent,
    "metal",
  );
  for (const x of [-0.26, 0.26]) {
    const wheel = cylinder(car, palette.rubber, x, -0.035, -0.24, 0.075, 0.05);
    wheel.rotation.z = Math.PI / 2;
  }
  batch(car);
  parent.add(car);
  return car;
}

export function massDriver(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
): RideRig {
  const style = b.design.style;
  const coordinates =
    b.design.track?.length === 8
      ? b.design.track.map((p) => [p.x / 100, p.y / 10, p.z / 100])
      : b.variant === 1
        ? [
            [-0.33, 1.1, 0.32],
            [0.34, 1.1, 0.32],
            [0.39, 3.0, -0.02],
            [0.28, 9.9, -0.35],
            [-0.08, 10.7, -0.32],
            [-0.4, 4.4, -0.17],
            [-0.23, 1.15, 0.1],
            [0.18, 3.0, 0.02],
            [-0.08, 4.0, -0.09],
            [-0.37, 1.25, 0.13],
          ]
        : [
            [-0.34, 1.12, 0.34],
            [0.3, 1.12, 0.34],
            [0.4, 3.6, 0.05],
            [0.27, 10.5, -0.32],
            [-0.1, 10.9, -0.35],
            [-0.39, 2.0, -0.17],
            [-0.21, 3.8, 0.1],
            [0.16, 2.8, -0.035],
            [-0.12, 1.25, 0.22],
          ];
  const authored = !!b.design.track_w;
  const curve = new T.CatmullRomCurve3(
    authored
      ? b.design.track!.map(
          (p) =>
            new T.Vector3(
              (p.x / 10) * 1.25 - w / 2,
              p.y / 10,
              (p.z / 10) * 1.25 - h / 2,
            ),
        )
      : coordinates.map(([x, y, z]) => new T.Vector3(x * w, y, z * h)),
    true,
    b.design.track?.length ? "centripetal" : "catmullrom",
    0.36,
  );
  if (b.design.track?.length) {
    const evaluate = curve.getPoint.bind(curve);
    curve.getPoint = (t, target) => {
      const p = evaluate(t, target);
      p.y = Math.max(1.2, Math.min(60, p.y));
      if (authored) {
        p.x = T.MathUtils.clamp(p.x, -w / 2 + 0.4, w / 2 - 0.4);
        p.z = T.MathUtils.clamp(p.z, -h / 2 + 0.4, h / 2 - 0.4);
      }
      return p;
    };
  }
  // Smooth the roll through near-vertical track, where a world-up frame is ambiguous.
  const segments = 512;
  const frames = curve.computeFrenetFrames(segments, true);
  const rolls = frames.normals.map((normal, i) =>
    Math.atan2(frames.binormals[i].y, normal.y),
  );
  for (let i = 1; i <= segments; i++) {
    rolls[i] =
      rolls[i - 1] +
      T.MathUtils.euclideanModulo(
        rolls[i] - rolls[i - 1] + Math.PI,
        Math.PI * 2,
      ) -
      Math.PI;
  }
  const winding = rolls[segments] - rolls[0];
  const smoothed = rolls.map((_, i) => {
    let sum = 0,
      weight = 0;
    for (let offset = -16; offset <= 16; offset++) {
      const index = i + offset;
      const lap = Math.floor(index / segments);
      const value =
        rolls[T.MathUtils.euclideanModulo(index, segments)] + lap * winding;
      const influence = 17 - Math.abs(offset);
      sum += value * influence;
      weight += influence;
    }
    return sum / weight;
  });
  const upAt = (u: number) => {
    const at = T.MathUtils.euclideanModulo(u, 1) * segments;
    const i = Math.floor(at),
      fraction = at - i;
    const normal = frames.normals[i]
      .clone()
      .lerp(frames.normals[i + 1], fraction);
    const binormal = frames.binormals[i]
      .clone()
      .lerp(frames.binormals[i + 1], fraction);
    const roll = T.MathUtils.lerp(smoothed[i], smoothed[i + 1], fraction);
    const up = normal
      .multiplyScalar(Math.cos(roll))
      .addScaledVector(binormal, Math.sin(roll));
    const tangent = curve.getTangentAt(T.MathUtils.euclideanModulo(u, 1));
    return up.addScaledVector(tangent, -up.dot(tangent)).normalize();
  };
  const railPoints = [[], []] as T.Vector3[][];
  const spinePoints: T.Vector3[] = [];
  for (let i = 0; i <= 240; i++) {
    const u = i / 240,
      p = curve.getPointAt(u),
      right = curve.getTangentAt(u).cross(upAt(u)).normalize();
    spinePoints.push(p.clone().addScaledVector(upAt(u), -0.22));
    railPoints[0].push(p.clone().addScaledVector(right, -0.24));
    railPoints[1].push(p.clone().addScaledVector(right, 0.24));
  }
  for (const points of railPoints) {
    const rail = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points, false, "catmullrom", 0.3),
        480,
        0.09,
        8,
        false,
      ),
      metal(style === 2 ? c.accent : c.primary),
    );
    rail.castShadow = true;
    g.add(rail);
  }
  const spine = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3(spinePoints),
      480,
      0.13,
      8,
      false,
    ),
    material(c.dark),
  );
  spine.castShadow = true;
  g.add(spine);
  const tower = new T.Group();
  tower.position.set(w * 0.29, 0, -h * 0.37);
  const towerColor = style === 2 ? "#435b6b" : "#8298a6";
  for (const x of [-0.45, 0.45])
    for (const z of [-0.38, 0.38]) {
      box(tower, towerColor, x, 5.4, z, 0.11, 10.0, 0.11).material =
        metal(towerColor);
      shapedBox(tower, c.dark, x, 0.48, z, 0.37, 0.16, 0.34, 0.025);
    }
  for (let level = 0; level < 8; level++) {
    const y = 0.7 + level * 1.22;
    box(tower, c.dark, 0, y, 0, 1.18, 0.075, 1.04);
    for (const z of [-0.38, 0.38]) {
      beam(
        tower,
        new T.Vector3(-0.4, y, z),
        new T.Vector3(0.4, y + 1.16, z),
        0.032,
        towerColor,
      ).material = metal(towerColor);
      beam(
        tower,
        new T.Vector3(0.4, y, z),
        new T.Vector3(-0.4, y + 1.16, z),
        0.032,
        towerColor,
      ).material = metal(towerColor);
    }
    if (level % 2 === 0) {
      const rail = safetyRail(tower, 1.17);
      rail.position.set(0, y, 0.54);
    }
    box(tower, c.primary, 0, y + 0.2, 0.56, 0.035, 0.15, 0.02).material = glow(
      c.primary,
    );
  }
  const towerBrand = label("NEAR", "#a2e8db", 0.88);
  towerBrand.position.set(0, 7.4, 0.57);
  tower.add(towerBrand);
  nearMark(tower, "#8dd5ce", 0.57).position.set(0, 8.7, 0.57);
  if (authored) {
    const peak = curve
      .getPoints(240)
      .reduce((highest, p) => (p.y > highest.y ? p : highest));
    tower.position.set(peak.x, 0, peak.z);
    tower.scale.y = Math.max(0.5, peak.y / 10.7);
  }
  g.add(tower);
  for (let i = 0; i < 104; i++) {
    const u = i / 104,
      p = curve.getPointAt(u),
      up = upAt(u),
      right = curve.getTangentAt(u).cross(up).normalize();
    const center = p.addScaledVector(up, -0.08);
    beam(
      g,
      center.clone().addScaledVector(right, -0.29),
      center.clone().addScaledVector(right, 0.29),
      0.023,
      c.accent,
    ).material = metal(c.accent);
  }
  for (const u of [
    0.02, 0.13, 0.23, 0.3, 0.37, 0.44, 0.51, 0.59, 0.69, 0.79, 0.89, 0.96,
  ]) {
    const p = curve.getPointAt(u);
    const z = p.z,
      spread = style === 1 ? 0.67 : 0.48;
    for (const side of [-1, 1]) {
      const foot = new T.Vector3(p.x + side * spread, 0.4, z);
      cylinder(g, c.dark, foot.x, 0.44, z, 0.23, 0.18);
      cylinder(g, c.accent, foot.x, 0.55, z, 0.17, 0.07).material = metal(
        c.accent,
      );
      const peak = p.clone().add(new T.Vector3(side * 0.2, -0.23, 0));
      if (style === 1) {
        line(
          g,
          [
            foot,
            new T.Vector3(p.x + side * spread * 1.35, p.y * 0.55, z),
            peak,
          ],
          0.07,
          c.light,
        );
      } else {
        beam(g, foot, peak, style === 2 ? 0.12 : 0.105, c.light);
      }
      if (p.y > 3.5) {
        beam(
          g,
          new T.Vector3(p.x - side * spread, 0.6, z),
          new T.Vector3(p.x + side * 0.25, p.y * 0.56, z),
          0.035,
          c.accent,
        ).material = metal(c.accent);
        beam(
          g,
          new T.Vector3(p.x + side * spread, p.y * 0.5, z),
          p.clone().add(new T.Vector3(-side * 0.17, -0.3, 0)),
          0.025,
          c.dark,
        );
      }
    }
    beam(
      g,
      p.clone().add(new T.Vector3(-0.28, -0.19, 0)),
      p.clone().add(new T.Vector3(0.28, -0.19, 0)),
      0.075,
      c.dark,
    );
  }
  // Magnetic launch collars align with the exact track frame, including banking.
  for (const [index, u] of [0.18, 0.205, 0.23, 0.255, 0.28].entries()) {
    const collar = new T.Group(),
      p = curve.getPointAt(u),
      tangent = curve.getTangentAt(u);
    collar.position.copy(p);
    collar.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), tangent);
    const radius = index === 4 ? 1.4 : 1.16;
    const casing = new T.Mesh(
      new T.TorusGeometry(
        radius,
        index === 4 ? 0.23 : 0.17,
        8,
        style === 2 ? 8 : 48,
      ),
      material(c.dark),
    );
    collar.add(casing);
    const copper = new T.Mesh(
      new T.TorusGeometry(
        radius,
        index === 4 ? 0.11 : 0.07,
        8,
        style === 2 ? 8 : 48,
      ),
      metal(c.accent),
    );
    copper.position.z = 0.14;
    collar.add(copper);
    const field = new T.Mesh(
      new T.TorusGeometry(radius - 0.16, 0.024, 6, 48),
      glow(c.primary),
    );
    field.position.z = 0.08;
    collar.add(field);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      box(
        collar,
        c.light,
        Math.cos(a) * radius,
        Math.sin(a) * radius,
        -0.05,
        0.14,
        0.13,
        0.35,
      ).rotation.z = a;
      sphere(
        collar,
        c.accent,
        Math.cos(a) * radius,
        Math.sin(a) * radius,
        0.22,
        0.031,
      ).material = metal(c.accent);
    }
    batch(collar);
    g.add(collar);
  }
  const stationWidth = authored ? 7.5 : w;
  const station = new T.Group();
  station.position.set(-0.03 * w, 0, h * 0.34);
  shapedBox(station, c.dark, 0, 0.6, 0, stationWidth * 0.77, 0.2, 1.47, 0.15);
  for (const x of [-stationWidth * 0.32, stationWidth * 0.32]) {
    box(station, c.light, x, 1.42, 0, 0.12, 1.75, 1.3);
    box(station, c.primary, x, 1.4, 0.68, 0.13, 1.43, 0.035);
  }
  if (style === 1) {
    const canopy = new T.Mesh(
      new T.SphereGeometry(1, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
    );
    canopy.scale.set(stationWidth * 0.42, 0.85, 1.06);
    canopy.position.y = 2.15;
    station.add(canopy);
    for (const z of [-0.83, 0, 0.83]) {
      const hoop = arch(station, c.accent, stationWidth * 0.42, 2.15, z, 0.04);
      hoop.scale.y = 0.85 / (stationWidth * 0.42);
      hoop.position.y = 2.15 * (1 - hoop.scale.y);
    }
  } else {
    const roof = vault(
      station,
      style === 2 ? c.primary : c.light,
      1.9,
      0.4,
      stationWidth * 0.84,
      2.16,
    );
    roof.rotation.y = Math.PI / 2;
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * stationWidth * 0.077;
      box(station, c.accent, x, 2.21, 0.9, 0.028, 0.12, 0.06).material = metal(
        c.accent,
      );
    }
  }
  marquee(
    station,
    b.design.name || "MASS DRIVER",
    c.light,
    Math.min(stationWidth * 0.65, 4.5),
    2.24,
    0.97,
  );
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.48;
    cylinder(station, c.accent, x, 0.89, 0.89, 0.025, 0.6).material = metal(
      c.accent,
    );
  }
  const protocol = label("NEAR LAUNCH SYSTEMS", "#b0efd5", 2.1);
  protocol.position.set(0.16, 1.13, 1.04);
  station.add(protocol);
  nearMark(station, c.primary, 0.29).position.set(-1.09, 1.13, 1.05);
  const stationRail = safetyRail(station, stationWidth * 0.61);
  stationRail.position.set(0, 0.71, -0.72);
  for (const side of [-1, 1]) {
    const unit = equipmentPanel(station, 0.66, 0.55);
    unit.position.set(side * stationWidth * 0.29, 1.25, -0.74);
    unit.rotation.y = Math.PI;
  }
  for (let i = 0; i < 8; i++)
    box(
      station,
      "#a9bac1",
      (i - 3.5) * stationWidth * 0.084,
      2.19,
      -0.09,
      0.035,
      0.045,
      1.75,
    ).material = metal("#a9bac1");
  g.add(station);
  const moving = new T.Group();
  moving.userData.animated = true;
  g.add(moving);
  const people: T.Object3D[] = [],
    cars: T.Group[] = [];
  for (let i = 0; i < 6; i++) cars.push(capsule(moving, c, i, people));
  const spacing = 0.91 / curve.getLength();
  return {
    train: moving,
    curve,
    upAt,
    animate: (_time, state, progress) => {
      showRiders(people, state);
      for (let i = 0; i < cars.length; i++) {
        const u = (((progress - i * spacing) % 1) + 1) % 1,
          p = curve.getPointAt(u),
          up = upAt(u);
        cars[i].position.copy(p).addScaledVector(up, 0.06);
        cars[i].up.copy(up);
        cars[i].lookAt(curve.getPointAt((u + 0.004) % 1));
      }
    },
  };
}

export function earthrise(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
): RideRig {
  const hubY = 3.38,
    radius = 2.48,
    style = b.design.style;
  for (const z of [-0.5, 0.5]) {
    if (style === 1) {
      line(
        g,
        [
          new T.Vector3(-1.7, 0.4, z),
          new T.Vector3(-2.0, 2.3, z),
          new T.Vector3(0, hubY, z),
          new T.Vector3(2.0, 2.3, z),
          new T.Vector3(1.7, 0.4, z),
        ],
        0.13,
        c.light,
      );
    } else {
      for (const x of [-1.68, 1.68]) {
        beam(
          g,
          new T.Vector3(x, 0.45, z),
          new T.Vector3(0, hubY, z),
          0.13,
          c.light,
        );
        cylinder(g, c.dark, x, 0.45, z, 0.27, 0.2);
      }
      if (style === 2) {
        for (let i = 0; i < 4; i++)
          beam(
            g,
            new T.Vector3(-1.4 + i * 0.36, 0.8 + i * 0.52, z),
            new T.Vector3(1.4 - i * 0.36, 0.8 + i * 0.52, z),
            0.037,
            c.accent,
          );
      }
    }
  }
  const moving = new T.Group();
  moving.userData.animated = true;
  moving.position.y = hubY;
  g.add(moving);
  for (const z of [-0.19, 0.19]) {
    const rim = new T.Mesh(
      new T.TorusGeometry(radius, 0.085, 8, style === 2 ? 8 : 80),
      metal(c.accent),
    );
    rim.position.z = z;
    moving.add(rim);
    const light = new T.Mesh(
      new T.TorusGeometry(radius - 0.07, 0.02, 6, 80),
      glow(c.primary),
    );
    light.position.z = z;
    moving.add(light);
  }
  const people: T.Object3D[] = [],
    cabins: T.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      px = Math.cos(a) * radius,
      py = Math.sin(a) * radius;
    for (const z of [-0.18, 0.18])
      beam(
        moving,
        new T.Vector3(0, 0, z),
        new T.Vector3(px, py, z),
        0.03,
        c.light,
      );
    sphere(moving, c.accent, px, py, 0.22, 0.075).material = metal(c.accent);
    const pod = new T.Group();
    pod.position.set(px, py, 0);
    moving.add(pod);
    cabins.push(pod);
    const color = [c.primary, c.accent, "#dc8a75"][i % 3];
    shapedBox(pod, c.dark, 0, -0.38, 0, 0.68, 0.17, 0.6, 0.08);
    if (style === 2) {
      shapedBox(pod, c.light, 0, -0.18, 0, 0.65, 0.48, 0.54, 0.07);
      const window = shapedBox(
        pod,
        c.primary,
        0,
        -0.11,
        0.28,
        0.49,
        0.26,
        0.014,
        0.015,
      );
      window.material = glass;
      for (const x of [-0.3, 0.3])
        box(pod, color, x, -0.12, 0.29, 0.04, 0.4, 0.03);
    } else {
      ellipsoid(pod, color, 0, -0.31, 0, 0.4, 0.18, 0.34);
      const shell = ellipsoid(pod, "#b6e1e3", 0, -0.05, 0, 0.365, 0.4, 0.31);
      shell.material = glass;
      shell.castShadow = false;
      const frame = ring(pod, c.light, 0.36, 0.025, 0, -0.05, 0, false);
      frame.scale.y = 1.12;
      ring(pod, c.accent, 0.35, 0.025, 0, -0.36).material = metal(c.accent);
    }
    for (const x of [-0.11, 0.11])
      people[i + (x > 0 ? 8 : 0)] = rider(
        pod,
        i + (x > 0 ? 8 : 0),
        x,
        -0.31,
        0.03,
        0.29,
      );
    sphere(pod, "#ffdf9d", 0, 0.33, 0, 0.048).material = glow("#ffdc8d");
    batch(pod);
  }
  cylinder(g, c.dark, 0, hubY, 0, 0.37, 0.75).rotation.x = Math.PI / 2;
  const motor = equipmentPanel(g, 0.9, 0.7);
  motor.position.set(0, hubY, -0.63);
  motor.rotation.y = Math.PI;
  for (const side of [-1, 1]) {
    const loadingRail = safetyRail(g, 1.0);
    loadingRail.position.set(side * 1.31, 0.39, h / 2 - 0.27);
    const cabinet = equipmentPanel(g, 0.62, 0.48);
    cabinet.position.set(side * 1.66, 0.97, -0.39);
  }
  sphere(g, c.accent, 0, hubY, 0.48, 0.3).material = metal(c.accent);
  const medallion = label("✦", c.light, 0.4);
  medallion.position.set(0, hubY, 0.76);
  g.add(medallion);
  if (style === 1) {
    const outer = new T.Mesh(
      new T.TorusGeometry(2.78, 0.055, 8, 96),
      material(c.light),
    );
    outer.position.set(0, hubY, -0.35);
    outer.rotation.y = 0.18;
    g.add(outer);
  }
  marquee(g, b.design.name || "EARTHRISE", c.light, 2.36, 1.25, h / 2 - 0.1);
  return {
    animate: (_time, state, progress) => {
      moving.rotation.z = progress * Math.PI * 2;
      cabins.forEach((pod) => (pod.rotation.z = -moving.rotation.z));
      showRiders(people, state);
    },
  };
}

export function lunarBounce(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
): RideRig {
  const style = b.design.style;
  for (const side of [-1, 1]) {
    const controls = equipmentPanel(g, 0.6, 0.49);
    controls.position.set(side * 1.1, 0.72, -0.82);
    controls.rotation.y = side * 0.8;
    const fence = safetyRail(g, 1.05);
    fence.position.set(side * 0.9, 0.35, h / 2 - 0.16);
  }
  cylinder(g, c.dark, 0, 0.54, 0, 1.48, 0.32);
  cylinder(g, c.primary, 0, 0.77, 0, 1.37, 0.22);
  ring(g, c.accent, 1.43, 0.045, 0, 0.86).material = metal(c.accent);
  const platform = new T.Group();
  platform.userData.animated = true;
  platform.position.y = 1.02;
  g.add(platform);
  cylinder(platform, c.light, 0, 0, 0, 1.18, 0.16);
  const people: T.Object3D[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2,
      seat = new T.Group();
    seat.position.set(Math.sin(a) * 0.9, 0.1, Math.cos(a) * 0.9);
    seat.rotation.y = a;
    shapedBox(seat, c.primary, 0, 0.04, 0, 0.3, 0.12, 0.34, 0.04);
    shapedBox(seat, c.dark, 0, 0.2, -0.14, 0.31, 0.34, 0.08, 0.04);
    people.push(rider(seat, i, 0, 0.12, 0.01, 0.36));
    line(
      seat,
      [
        new T.Vector3(-0.15, 0.12, 0.1),
        new T.Vector3(-0.12, 0.4, 0.14),
        new T.Vector3(0.12, 0.4, 0.14),
        new T.Vector3(0.15, 0.12, 0.1),
      ],
      0.02,
      c.accent,
      "metal",
    );
    platform.add(seat);
    batch(seat);
  }
  cylinder(g, c.dark, 0, 2.08, 0, 0.13, 2.5);
  for (const y of [1.2, 1.65, 2.1, 2.55])
    cylinder(g, c.accent, 0, y, 0, 0.17, 0.14).material = metal(c.accent);
  ellipsoid(g, c.light, 0, 3.58, 0, 0.55, 0.55, 0.55);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4;
    const crater = ellipsoid(
      g,
      "#d3c7ad",
      Math.sin(a) * 0.4,
      3.58 + Math.cos(a) * 0.35,
      0.35,
      0.1,
      0.07,
      0.055,
    );
    crater.rotation.z = a;
  }
  const orbit = ring(g, c.accent, 0.8, 0.04, 0, 3.55);
  orbit.rotation.z = 0.35;
  orbit.material = metal(c.accent);
  if (style === 1) {
    const halo = ring(g, c.primary, 1.45, 0.06, 0, 2.68);
    halo.rotation.z = 0.18;
    for (const x of [-1.32, 1.32])
      line(
        g,
        [
          new T.Vector3(x, 0.45, 0),
          new T.Vector3(x * 1.18, 1.9, 0),
          new T.Vector3(x * 0.75, 3.0, 0),
        ],
        0.09,
        c.light,
      );
  } else {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3,
        foot = new T.Vector3(Math.sin(a) * 1.37, 0.5, Math.cos(a) * 1.37);
      beam(
        g,
        foot,
        new T.Vector3(0, 3.05, 0),
        style === 2 ? 0.09 : 0.06,
        c.light,
      );
      if (style === 2)
        beam(
          g,
          foot,
          new T.Vector3(-Math.sin(a) * 0.55, 1.8, -Math.cos(a) * 0.55),
          0.03,
          c.accent,
        );
      const light = sphere(g, "#ffda92", foot.x, 1.1, foot.z, 0.075);
      light.material = glow("#ffda92");
    }
  }
  marquee(
    g,
    b.design.name || "LUNAR BOUNCE",
    c.light,
    2.03,
    0.65,
    h / 2 - 0.06,
  );
  return {
    animate: (_time, state, progress) => {
      platform.position.y =
        1.02 +
        (state.riders.length
          ? Math.pow(Math.sin(progress * Math.PI * 8), 4) * 1.22
          : 0);
      showRiders(people, state);
    },
  };
}

export function roverRally(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
): RideRig {
  const style = b.design.style;
  const raceControl = new T.Group();
  raceControl.position.set(-w * 0.33, 0, -h * 0.34);
  shapedBox(raceControl, c.dark, 0, 1.12, 0, 0.68, 1.4, 0.64, 0.06);
  const controlWindow = windowPanel(raceControl, 0.55, 0.58, false);
  controlWindow.position.set(0, 1.5, 0.35);
  shapedBox(
    raceControl,
    "#acbbc3",
    0,
    1.92,
    0,
    0.89,
    0.09,
    0.86,
    0.025,
  ).material = metal("#acbbc3");
  const raceStatus = label("ROVER CONTROL", "#9bdcd3", 0.7);
  raceStatus.position.set(0, 1.0, 0.35);
  raceStatus.scale.y *= 0.6;
  raceControl.add(raceStatus);
  g.add(raceControl);
  const curve = new T.CatmullRomCurve3(
    [
      new T.Vector3(-w * 0.32, 0.65, h * 0.29),
      new T.Vector3(w * 0.27, 0.65, h * 0.29),
      new T.Vector3(w * 0.35, 0.8, -h * 0.21),
      new T.Vector3(-w * 0.19, 0.95, -h * 0.3),
      new T.Vector3(-w * 0.35, 0.72, 0),
    ],
    true,
    "catmullrom",
    0.45,
  );
  const positions: number[] = [],
    uvs: number[] = [];
  for (let i = 0; i <= 160; i++) {
    const u = i / 160,
      p = curve.getPointAt(u),
      right = curve
        .getTangentAt(u)
        .cross(new T.Vector3(0, 1, 0))
        .normalize();
    for (const side of [-1, 1]) {
      const point = p.clone().addScaledVector(right, side * 0.48);
      positions.push(point.x, point.y, point.z);
      uvs.push(u * 20, (side + 1) / 2);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < 160; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new T.Mesh(geometry, material(c.dark));
  road.receiveShadow = true;
  g.add(road);
  for (let i = 0; i < 40; i++) {
    const u = i / 40,
      p = curve.getPointAt(u),
      right = curve
        .getTangentAt(u)
        .cross(new T.Vector3(0, 1, 0))
        .normalize();
    for (const side of [-1, 1]) {
      const at = p.clone().addScaledVector(right, side * 0.5);
      const curb = box(
        g,
        i % 2 ? c.accent : c.light,
        at.x,
        at.y + 0.035,
        at.z,
        0.1,
        0.09,
        0.29,
      );
      curb.rotation.y = Math.atan2(right.z, -right.x);
    }
    if (i % 2 === 0) {
      const stripe = box(g, c.light, p.x, p.y + 0.015, p.z, 0.04, 0.016, 0.2);
      stripe.rotation.y = Math.atan2(
        curve.getTangentAt(u).x,
        curve.getTangentAt(u).z,
      );
    }
  }
  cylinder(g, c.primary, 0, 0.52, 0, 0.88, 0.3);
  ellipsoid(g, c.light, 0, 1.2, 0, 0.65, 0.65, 0.65);
  const ringMesh = ring(g, c.accent, 0.91, 0.035, 0, 1.2);
  ringMesh.rotation.z = 0.4;
  ringMesh.material = metal(c.accent);
  if (style === 1) {
    const dome = ellipsoid(g, "#abd9de", 0, 1.05, 0, 1.12, 0.9, 1.06);
    dome.material = glass;
    ring(g, c.light, 1.13, 0.045, 0, 1.06);
    for (let i = 0; i < 3; i++) {
      const rib = arch(g, c.accent, 1.14, 1.05, 0, 0.04);
      rib.rotation.y = (i * Math.PI) / 3;
      rib.material = metal(c.accent);
    }
  } else if (style === 2) {
    for (const x of [-0.8, 0.8]) {
      box(g, c.dark, x, 1.14, 0, 0.07, 1.2, 0.07);
      beam(
        g,
        new T.Vector3(x, 0.52, -0.55),
        new T.Vector3(-x, 1.72, 0.55),
        0.025,
        c.accent,
      );
    }
    box(g, c.primary, 0, 1.8, 0, 1.75, 0.14, 1.27);
  }
  const moving = new T.Group();
  moving.userData.animated = true;
  g.add(moving);
  const people: T.Object3D[] = [],
    cars: T.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const car = new T.Group();
    shapedBox(car, c.primary, 0, 0.23, 0, 0.58, 0.26, 0.78, 0.1);
    shapedBox(car, c.light, 0, 0.39, 0, 0.52, 0.15, 0.59, 0.07);
    for (const x of [-0.32, 0.32])
      for (const z of [-0.24, 0.24]) {
        const tire = cylinder(car, palette.rubber, x, 0.15, z, 0.16, 0.13);
        tire.rotation.z = Math.PI / 2;
        const hub = cylinder(car, c.accent, x * 1.2, 0.15, z, 0.07, 0.035);
        hub.rotation.z = Math.PI / 2;
        hub.material = metal(c.accent);
      }
    for (const x of [-0.13, 0.13])
      people.push(rider(car, i * 2 + (x > 0 ? 1 : 0), x, 0.42, -0.06, 0.34));
    line(
      car,
      [
        new T.Vector3(-0.27, 0.3, -0.26),
        new T.Vector3(-0.27, 0.8, -0.26),
        new T.Vector3(0.27, 0.8, -0.26),
        new T.Vector3(0.27, 0.3, -0.26),
      ],
      0.025,
      c.accent,
      "metal",
    );
    for (const x of [-0.18, 0.18])
      sphere(car, "#fbe7b8", x, 0.39, 0.39, 0.055).material = glow("#ffdc8d");
    batch(car);
    moving.add(car);
    cars.push(car);
  }
  marquee(g, b.design.name || "ROVER RALLY", c.light, 2.7, 1.25, h / 2 - 0.06);
  return {
    curve,
    animate: (_time, state, progress) => {
      showRiders(people, state);
      cars.forEach((car, i) => {
        const u = (progress + i / 5) % 1;
        car.position.copy(curve.getPointAt(u));
        car.lookAt(curve.getPointAt((u + 0.005) % 1));
      });
    },
  };
}
