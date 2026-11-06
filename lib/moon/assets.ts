import * as T from "three";
import { blueprint, footprint, type Building } from "./model";
export const SCALE = 1.25;
const materials = new Map<string, T.MeshStandardMaterial>();
export function material(color: string | number) {
  const key = String(color);
  let m = materials.get(key);
  if (!m) {
    m = new T.MeshStandardMaterial({ color, roughness: 0.66, metalness: 0.15 });
    materials.set(key, m);
  }
  return m;
}
const boxGeo = new T.BoxGeometry(1, 1, 1),
  sphereGeo = new T.SphereGeometry(1, 12, 8),
  cylGeo = new T.CylinderGeometry(1, 1, 1, 12);
export function box(
  g: T.Object3D,
  color: string | number,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  const m = new T.Mesh(boxGeo, material(color));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function sphere(
  g: T.Object3D,
  color: string | number,
  x: number,
  y: number,
  z: number,
  r: number,
) {
  const m = new T.Mesh(sphereGeo, material(color));
  m.position.set(x, y, z);
  m.scale.setScalar(r);
  m.castShadow = true;
  g.add(m);
  return m;
}
export function cylinder(
  g: T.Object3D,
  color: string | number,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
) {
  const m = new T.Mesh(cylGeo, material(color));
  m.position.set(x, y, z);
  m.scale.set(r, h, r);
  m.castShadow = true;
  g.add(m);
  return m;
}
export function beam(
  g: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  color: string | number,
) {
  const m = cylinder(g, color, 0, 0, 0, r, a.distanceTo(b));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return m;
}
export function label(text: string, color = "#d8fff7", w = 3) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#182332";
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 120, 22);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 67, 470);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({ map: tex, depthWrite: false }),
  );
  sprite.scale.set(w, w / 4, 1);
  return sprite;
}
export function astronaut(color: string, size = 1) {
  const g = new T.Group();
  const body = sphere(g, "#e8e7e5", 0, 0.35, 0, 0.18);
  body.scale.multiply(new T.Vector3(1, 1.25, 0.8));
  sphere(g, "#ecedf1", 0, 0.7, 0, 0.23);
  const visor = sphere(g, "#253850", 0, 0.71, 0.17, 0.18);
  visor.scale.multiply(new T.Vector3(1, 0.72, 0.72));
  box(g, color, 0, 0.37, -0.16, 0.26, 0.3, 0.16);
  const legs = [
    box(g, "#c5ccd5", -0.09, 0.11, 0, 0.12, 0.24, 0.14),
    box(g, "#c5ccd5", 0.09, 0.11, 0, 0.12, 0.24, 0.14),
  ];
  const arms = [
    box(g, color, -0.24, 0.4, 0, 0.1, 0.28, 0.1),
    box(g, color, 0.24, 0.4, 0, 0.1, 0.28, 0.1),
  ];
  g.scale.setScalar(size);
  g.userData.legs = legs;
  g.userData.arms = arms;
  return g;
}
export function rocket() {
  const g = new T.Group();
  cylinder(g, "#e4e5e8", 0, 2.4, 0, 0.7, 3.5);
  cylinder(g, "#263342", 0, 1.15, 0, 0.72, 0.35);
  const nose = new T.Mesh(
    new T.ConeGeometry(0.7, 1.5, 20),
    material("#e4e5e8"),
  );
  nose.position.y = 4.9;
  g.add(nose);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const fin = box(
      g,
      "#8eddd3",
      Math.cos(a) * 0.8,
      0.7,
      Math.sin(a) * 0.8,
      0.3,
      1.2,
      0.9,
    );
    fin.rotation.y = -a;
  }
  const l = label("NEAR", "#a7eee0", 1.2);
  l.position.set(0, 2.6, 0.73);
  g.add(l);
  const flame = new T.Mesh(
    new T.ConeGeometry(0.48, 2, 16),
    new T.MeshBasicMaterial({
      color: "#91e6ef",
      transparent: true,
      opacity: 0.8,
    }),
  );
  flame.rotation.z = Math.PI;
  flame.position.y = -0.4;
  g.add(flame);
  g.userData.flame = flame;
  return g;
}
export type AnimatedModel = {
  root: T.Group;
  animate: (time: number, b: Building, offset: number) => void;
  curve?: T.CatmullRomCurve3;
};
export function createBuilding(b: Building): AnimatedModel {
  const a = blueprint(b.kind),
    root = new T.Group(),
    model = new T.Group(),
    parts: T.Object3D[] = [];
  root.add(model);
  const base = footprint({ ...b, rotation: 0 }),
    w = base.w * SCALE,
    h = base.h * SCALE;
  model.rotation.y = (-b.rotation * Math.PI) / 2;
  box(model, "#60667b", 0, 0.13, 0, w - 0.12, 0.26, h - 0.12);
  box(model, "#d1d5d9", 0, 0.3, 0, w - 0.32, 0.1, h - 0.32);
  let curve: T.CatmullRomCurve3 | undefined;
  let moving: T.Group | undefined;
  if (b.kind === "bounce") {
    cylinder(model, "#453f70", 0, 0.5, 0, 1.5, 0.35);
    cylinder(model, a.color, 0, 0.8, 0, 1.25, 0.28);
    const pad = new T.Group();
    pad.position.y = 1;
    model.add(pad);
    cylinder(pad, "#eae5ff", 0, 0, 0, 1.05, 0.15);
    for (let i = 0; i < 6; i++) {
      const t = (i * Math.PI) / 3;
      const person = astronaut(a.color, 0.7);
      person.position.set(Math.cos(t) * 0.7, 0.1, Math.sin(t) * 0.7);
      pad.add(person);
    }
    parts.push(pad);
    for (let i = 0; i < 4; i++) {
      const t = (i * Math.PI) / 2;
      cylinder(
        model,
        "#8c80b5",
        Math.cos(t) * 1.3,
        1.2,
        Math.sin(t) * 1.3,
        0.08,
        1.4,
      );
      sphere(
        model,
        "#f2d28d",
        Math.cos(t) * 1.3,
        1.95,
        Math.sin(t) * 1.3,
        0.13,
      );
    }
  } else if (b.kind === "wheel") {
    for (const z of [-0.5, 0.5]) {
      beam(
        model,
        new T.Vector3(-1.6, 0.4, z),
        new T.Vector3(0, 3.2, z),
        0.12,
        "#ebe7dd",
      );
      beam(
        model,
        new T.Vector3(1.6, 0.4, z),
        new T.Vector3(0, 3.2, z),
        0.12,
        "#ebe7dd",
      );
    }
    moving = new T.Group();
    moving.position.y = 3.2;
    model.add(moving);
    const ring = new T.Mesh(
      new T.TorusGeometry(2.3, 0.09, 8, 48),
      material(a.color),
    );
    moving.add(ring);
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4;
      beam(
        moving,
        new T.Vector3(),
        new T.Vector3(Math.cos(t) * 2.3, Math.sin(t) * 2.3, 0),
        0.035,
        "#f8cf76",
      );
      const cabin = new T.Group();
      cabin.position.set(Math.cos(t) * 2.3, Math.sin(t) * 2.3, 0);
      box(
        cabin,
        ["#8eddd3", "#f6b6a0", "#b6a0ed"][i % 3],
        0,
        -0.22,
        0,
        0.55,
        0.6,
        0.55,
      );
      box(cabin, "#253f54", 0, -0.12, 0.285, 0.42, 0.25, 0.02);
      moving.add(cabin);
      parts.push(cabin);
    }
  } else if (b.kind === "coaster") {
    const pts = [
      [-0.34, 0.7, 0.36],
      [0.28, 0.8, 0.36],
      [0.38, 2.2, 0.05],
      [0.29, 5.5, -0.32],
      [-0.12, 4.9, -0.35],
      [-0.4, 0.9, -0.16],
      [-0.2, 2.6, 0.1],
      [0.13, 2.1, -0.04],
      [-0.35, 0.7, 0.36],
    ];
    curve = new T.CatmullRomCurve3(
      pts.slice(0, -1).map(([x, y, z]) => new T.Vector3(x * w, y, z * h)),
      true,
      "catmullrom",
      0.35,
    );
    const rail = new T.Mesh(
      new T.TubeGeometry(curve, 180, 0.11, 6, true),
      material("#8eddd3"),
    );
    rail.castShadow = true;
    model.add(rail);
    const spine = new T.Mesh(
      new T.TubeGeometry(curve, 100, 0.055, 6, true),
      material("#e2fff2"),
    );
    spine.position.y = 0.18;
    model.add(spine);
    for (let i = 0; i < 18; i++) {
      const p = curve.getPointAt(i / 18);
      beam(model, new T.Vector3(p.x, 0.4, p.z), p, 0.065, "#e2d8bd");
    }
    const station = box(
      model,
      "#283a4d",
      -0.1,
      0.8,
      h * 0.34,
      w * 0.55,
      0.3,
      1,
    );
    box(
      model,
      a.color,
      station.position.x,
      1.65,
      station.position.z,
      w * 0.6,
      0.15,
      1.2,
    );
    moving = new T.Group();
    model.add(moving);
    for (let i = 0; i < 3; i++) {
      const cart = new T.Group();
      box(cart, "#f8cf76", 0, 0, 0, 0.65, 0.35, 0.65);
      box(cart, "#223447", 0, 0.22, -0.1, 0.55, 0.26, 0.15);
      const p = astronaut("#ed9b81", 0.5);
      p.position.y = 0.15;
      cart.add(p);
      moving.add(cart);
      parts.push(cart);
    }
    const sign = label("MASS DRIVER", "#b9fff0", 2.8);
    sign.position.set(0, 2.3, h * 0.4);
    model.add(sign);
  } else if (b.kind === "rover") {
    const points = [];
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      points.push(
        new T.Vector3(
          Math.cos(t) * w * 0.36,
          0.5 + Math.sin(t * 3) * 0.12,
          Math.sin(t) * h * 0.35,
        ),
      );
    }
    curve = new T.CatmullRomCurve3(points, true);
    const track = new T.Mesh(
      new T.TubeGeometry(curve, 64, 0.25, 8, true),
      material("#6e6874"),
    );
    model.add(track);
    moving = new T.Group();
    model.add(moving);
    for (let i = 0; i < 3; i++) {
      const car = new T.Group();
      box(
        car,
        ["#f8cf76", "#8eddd3", "#f0a7c2"][i],
        0,
        0.2,
        0,
        0.65,
        0.25,
        0.8,
      );
      for (const x of [-0.34, 0.34])
        for (const z of [-0.22, 0.22]) {
          const tire = cylinder(car, "#253346", x, 0.1, z, 0.15, 0.12);
          tire.rotation.z = Math.PI / 2;
        }
      const p = astronaut(a.color, 0.5);
      p.position.y = 0.24;
      car.add(p);
      moving.add(car);
      parts.push(car);
    }
  } else if (b.kind === "solar") {
    for (const x of [-1, 1]) cylinder(model, "#d3dbe0", x, 1.2, 0, 0.09, 1.8);
    const panels = new T.Group();
    panels.position.y = 2;
    panels.rotation.x = -0.25;
    model.add(panels);
    box(panels, "#253757", 0, 0, 0, w * 0.88, 0.12, h * 0.8);
    for (let i = 0; i < 5; i++)
      box(panels, "#7faae3", (i - 2) * 0.6, 0.075, 0, 0.025, 0.02, h * 0.78);
    for (let i = 0; i < 4; i++)
      box(panels, "#7faae3", 0, 0.075, (i - 1.5) * 0.7, w * 0.87, 0.02, 0.025);
  } else {
    box(model, "#e1e3e7", 0, 0.95, 0, w * 0.75, 1.2, h * 0.72);
    box(model, a.color, 0, 1.63, 0, w * 0.93, 0.25, h * 0.88);
    box(model, "#213c52", 0, 1.1, h * 0.37, w * 0.53, 0.5, 0.08);
    box(model, a.color, 0, 0.65, h * 0.43, w * 0.8, 0.2, 0.45);
    const dome = sphere(
      model,
      a.color,
      0,
      1.85,
      0,
      b.kind === "depot" ? 0.6 : 0.45,
    );
    dome.scale.y *= 0.5;
    if (b.kind === "food") {
      cylinder(model, "#edca83", 0, 2.2, 0, 0.45, 0.18);
      sphere(model, "#c98a57", 0, 2.32, 0, 0.3);
    } else if (b.kind === "drink") {
      cylinder(model, "#8be9f3", 0, 2.2, 0, 0.25, 0.6);
      box(model, "#fff0be", 0.1, 2.7, 0, 0.06, 0.5, 0.06);
    } else {
      const robot = new T.Group();
      box(robot, "#eaa4c1", 0, 0.25, 0, 0.6, 0.35, 0.7);
      sphere(robot, "#315369", 0, 0.6, 0, 0.25);
      model.add(robot);
      parts.push(robot);
    }
    const sign = label(
      b.kind === "food"
        ? "MOON PIES"
        : b.kind === "drink"
          ? "COOLERS"
          : "LUNAR CARE",
      a.color,
      2.2,
    );
    sign.position.set(0, 2.8, 0);
    model.add(sign);
  }
  const lamp = sphere(model, a.color, w * 0.35, 0.6, h * 0.35, 0.12);
  lamp.material = new T.MeshStandardMaterial({
    color: a.color,
    emissive: a.color,
    emissiveIntensity: 0.4,
  });
  const animate = (time: number, state: Building, offset: number) => {
    const active = state.powered && state.condition > 0;
    const t = active ? time : 0;
    const fraction = offset;
    const duration =
      b.kind === "coaster" ? [36, 30, 24][state.launch - 1] : a.cycle;
    const progress =
      state.cycle_left > 0
        ? (duration - state.cycle_left + fraction) / duration
        : state.riders.length > 0
          ? (time / duration) % 1
          : 0;
    if (b.kind === "bounce") {
      parts[0].position.y =
        1 +
        (state.riders.length > 0
          ? Math.pow(Math.sin(progress * Math.PI * 8), 4) * 1.1
          : 0);
      parts[0].children
        .slice(1)
        .forEach((p, i) => (p.visible = i < state.riders.length));
    }
    if (b.kind === "wheel" && moving) {
      moving.rotation.z = progress * Math.PI * 2;
      for (const p of parts) p.rotation.z = -moving.rotation.z;
    }
    if ((b.kind === "coaster" || b.kind === "rover") && curve && moving) {
      for (let i = 0; i < parts.length; i++) {
        const u =
          (((progress - i * (b.kind === "coaster" ? 0.025 : 0.3)) % 1) + 1) % 1;
        const p = curve.getPointAt(u),
          ahead = curve.getPointAt((u + 0.005) % 1);
        parts[i].position.copy(p);
        parts[i].lookAt(ahead);
        const passenger = parts[i].children.find((c) => c.userData.legs);
        if (passenger) passenger.visible = i < state.riders.length;
      }
    }
    if (b.kind === "depot" && parts.length) {
      parts[0].position.x = Math.sin(t * 0.3) * 0.8;
      parts[0].position.z = h * 0.5 + 0.2;
    }
  };
  return { root, animate, curve };
}
