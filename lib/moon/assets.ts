import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { blueprint, footprint, type Building } from "./model";
export const SCALE = 1.25;
const materials = new Map<string, T.MeshStandardMaterial>();
export function material(color: string | number) {
  const key = String(color);
  let m = materials.get(key);
  if (!m) {
    m = new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.12 });
    materials.set(key, m);
  }
  return m;
}
const boxGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
  sphereGeo = new T.SphereGeometry(1, 24, 16),
  cylGeo = new T.CylinderGeometry(1, 1, 1, 32);

export const palette = {
  ivory: "#f2ecdc",
  navy: "#183441",
  mint: "#70d5bd",
  gold: "#f3ba59",
  steel: "#7c929e",
  rubber: "#25323b",
};
export const glass = new T.MeshStandardMaterial({
  color: "#27596d",
  metalness: 0.72,
  roughness: 0.13,
  emissive: "#254e5d",
  emissiveIntensity: 0.24,
});
const suitMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.48,
  metalness: 0.22,
});
const lit = new Map<string, T.MeshStandardMaterial>();
export function glow(color: string) {
  let m = lit.get(color);
  if (!m) {
    m = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.7,
      roughness: 0.28,
    });
    lit.set(color, m);
  }
  return m;
}
export function ring(
  g: T.Object3D,
  color: string,
  radius: number,
  tube: number,
  x = 0,
  y = 0,
  z = 0,
  flat = true,
) {
  const m = new T.Mesh(
    new T.TorusGeometry(radius, tube, 8, 64),
    material(color),
  );
  m.position.set(x, y, z);
  if (flat) m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  g.add(m);
  return m;
}

// Static details share draw calls. Articulated groups keep their local transforms.
export function batch(g: T.Object3D) {
  for (const child of [...g.children])
    if (!(child instanceof T.Mesh)) batch(child);
  const sets = new Map<T.Material, T.Mesh[]>();
  for (const child of g.children) {
    if (
      !(child instanceof T.Mesh) ||
      Array.isArray(child.material) ||
      child.children.length
    )
      continue;
    const list = sets.get(child.material) ?? [];
    list.push(child);
    sets.set(child.material, list);
  }
  for (const [mat, meshes] of sets) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((m) => {
      m.updateMatrix();
      const geometry = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      return geometry.applyMatrix4(m.matrix);
    });
    const merged = mergeGeometries(geometries);
    geometries.forEach((geo) => geo.dispose());
    if (!merged) continue;
    const mesh = new T.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.forEach((m) => {
      g.remove(m);
      if (!sharedGeometry(m.geometry)) m.geometry.dispose();
    });
    g.add(mesh);
  }
}

function sharedGeometry(geometry: T.BufferGeometry) {
  return geometry === boxGeo || geometry === sphereGeo || geometry === cylGeo;
}

function platformMaterial(columns: number, rows: number, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const paint = canvas.getContext("2d")!;
  paint.fillStyle = "#deded4";
  paint.fillRect(0, 0, 512, 512);
  const tileWidth = 512 / columns,
    tileHeight = 512 / rows;
  for (let x = 0; x < columns; x++)
    for (let z = 0; z < rows; z++) {
      const left = x * tileWidth,
        top = z * tileHeight;
      paint.strokeStyle = "#b7c1bc";
      paint.lineWidth = 1;
      paint.strokeRect(left + 3, top + 3, tileWidth - 6, tileHeight - 6);
      paint.strokeStyle = "#f7f5e9";
      paint.strokeRect(left + 5, top + 5, tileWidth - 10, tileHeight - 10);
      for (const dx of [9, tileWidth - 9])
        for (const dz of [9, tileHeight - 9]) {
          paint.fillStyle = "#9ba9a5";
          paint.beginPath();
          paint.arc(left + dx, top + dz, 1.6, 0, Math.PI * 2);
          paint.fill();
        }
    }
  paint.fillStyle = accent;
  paint.fillRect(14, 14, 5, 42);
  paint.fillStyle = "#607577";
  paint.font = "700 10px monospace";
  paint.fillText("MP / LUNAR DIVISION", 26, 27);
  paint.font = "8px monospace";
  paint.fillText("PRESSURE DECK  //  SERVICE ACCESS", 26, 41);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  return new T.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.08 });
}

function batchSuit(g: T.Object3D) {
  const meshes = g.children.filter(
    (o): o is T.Mesh<T.BufferGeometry, T.MeshStandardMaterial> =>
      o instanceof T.Mesh &&
      o.material instanceof T.MeshStandardMaterial &&
      o.material !== glass,
  );
  const geometries = meshes.map((m) => {
    m.updateMatrix();
    const geometry = m.geometry.index
      ? m.geometry.toNonIndexed()
      : m.geometry.clone();
    geometry.applyMatrix4(m.matrix);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = m.material.color.r;
      colors[i + 1] = m.material.color.g;
      colors[i + 2] = m.material.color.b;
    }
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    return geometry;
  });
  const geometry = mergeGeometries(geometries);
  geometries.forEach((geo) => geo.dispose());
  if (!geometry) return;
  meshes.forEach((m) => g.remove(m));
  const mesh = new T.Mesh(geometry, suitMaterial);
  mesh.castShadow = true;
  g.add(mesh);
}

export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    owned = new Set<T.Material>();
  root.traverse((o) => {
    if (
      o instanceof T.Mesh ||
      o instanceof T.Points ||
      o instanceof T.LineSegments
    )
      geometries.add(o.geometry);
    if (
      o instanceof T.Mesh ||
      o instanceof T.Points ||
      o instanceof T.LineSegments ||
      o instanceof T.Sprite
    ) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => owned.add(m));
    }
  });
  geometries.forEach((g) => {
    if (!sharedGeometry(g)) g.dispose();
  });
  const shared = new Set<T.Material>([
    ...materials.values(),
    ...lit.values(),
    glass,
    suitMaterial,
  ]);
  owned.forEach((m) => {
    if (shared.has(m)) return;
    const maps = m as T.MeshStandardMaterial;
    maps.map?.dispose();
    maps.bumpMap?.dispose();
    m.dispose();
  });
}
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
export function label(
  text: string,
  color = "#d8fff7",
  w = 3,
  billboard = false,
) {
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
  const sign = billboard
    ? new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }))
    : new T.Mesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.1,
          side: T.DoubleSide,
        }),
      );
  sign.scale.set(w, w / 4, 1);
  sign.userData.sign = true;
  return sign;
}
export function astronaut(color: string, size = 1) {
  const g = new T.Group();
  const suit = palette.ivory;
  const torso = sphere(g, suit, 0, 0.4, 0, 0.19);
  torso.scale.multiply(new T.Vector3(1, 1.3, 0.8));
  cylinder(g, palette.steel, 0, 0.6, 0, 0.16, 0.07);
  sphere(g, suit, 0, 0.78, 0, 0.255);
  const visor = sphere(g, palette.navy, 0, 0.79, 0.153, 0.207);
  visor.scale.multiply(new T.Vector3(1.02, 0.77, 0.73));
  visor.material = glass;
  const shine = sphere(g, "#b3e5e0", -0.09, 0.865, 0.283, 0.055);
  shine.scale.multiply(new T.Vector3(0.8, 0.2, 0.16));
  for (const x of [-0.25, 0.25]) {
    const ear = cylinder(g, color, x, 0.77, 0, 0.085, 0.06);
    ear.rotation.z = Math.PI / 2;
  }
  box(g, palette.navy, 0, 0.41, -0.18, 0.28, 0.32, 0.18);
  box(g, color, 0, 0.42, -0.28, 0.23, 0.26, 0.08);
  box(g, color, 0, 0.43, 0.145, 0.23, 0.16, 0.05);
  for (const x of [-0.13, 0.13])
    box(g, "#9caaa7", x, 0.42, 0.14, 0.026, 0.27, 0.035);
  box(g, palette.navy, 0, 0.45, 0.18, 0.15, 0.06, 0.025);
  for (const x of [-0.05, 0, 0.05]) sphere(g, "#fff2bc", x, 0.4, 0.18, 0.015);
  const legs: T.Group[] = [],
    arms: T.Group[] = [];
  for (const x of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(x * 0.095, 0.23, 0);
    box(leg, suit, 0, -0.075, 0, 0.14, 0.22, 0.15);
    box(leg, palette.rubber, 0, -0.18, 0.045, 0.16, 0.1, 0.23);
    box(leg, color, 0, -0.045, 0.08, 0.11, 0.065, 0.025);
    cylinder(leg, "#adb9b3", 0, -0.12, 0, 0.074, 0.035);
    g.add(leg);
    legs.push(leg);
    const arm = new T.Group();
    arm.position.set(x * 0.23, 0.54, 0);
    sphere(arm, color, 0, -0.035, 0, 0.085);
    box(arm, suit, 0, -0.13, 0, 0.12, 0.19, 0.13);
    cylinder(arm, "#adb9b3", 0, -0.2, 0, 0.071, 0.035);
    sphere(arm, palette.rubber, 0, -0.24, 0.025, 0.066);
    g.add(arm);
    arms.push(arm);
  }
  g.scale.setScalar(size);
  g.userData.legs = legs;
  g.userData.arms = arms;
  [...legs, ...arms, g].forEach(batchSuit);
  return g;
}
export function rocket() {
  const g = new T.Group();
  cylinder(g, palette.ivory, 0, 2.65, 0, 0.8, 3.4);
  cylinder(g, palette.navy, 0, 1.1, 0, 0.83, 0.5);
  for (const y of [1.45, 3.7, 4.15]) ring(g, palette.steel, 0.81, 0.035, 0, y);
  cylinder(g, palette.mint, 0, 3.95, 0, 0.81, 0.22);
  const nose = new T.Mesh(
    new T.LatheGeometry(
      [
        new T.Vector2(0.8, 0),
        new T.Vector2(0.77, 0.45),
        new T.Vector2(0.6, 0.9),
        new T.Vector2(0.3, 1.35),
        new T.Vector2(0, 1.65),
      ],
      40,
    ),
    material(palette.ivory),
  );
  nose.position.y = 4.3;
  nose.castShadow = true;
  g.add(nose);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const window = sphere(
      g,
      palette.navy,
      Math.sin(a) * 0.78,
      3.35,
      Math.cos(a) * 0.78,
      0.19,
    );
    window.scale.multiply(new T.Vector3(1, 0.8, 0.35));
    window.rotation.y = a;
    window.material = glass;
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const leg = new T.Group();
    leg.rotation.y = a;
    beam(
      leg,
      new T.Vector3(0.6, 1.6, 0),
      new T.Vector3(1.35, 0.12, 0),
      0.07,
      palette.steel,
    );
    box(leg, palette.navy, 1.35, 0.1, 0, 0.55, 0.16, 0.5);
    box(leg, palette.mint, 0.85, 1.35, 0, 0.16, 1.1, 0.5);
    const nozzle = new T.Mesh(
      new T.CylinderGeometry(0.17, 0.3, 0.45, 24, 1, true),
      material(palette.rubber),
    );
    nozzle.position.set(Math.sin(a) * 0.36, 0.65, Math.cos(a) * 0.36);
    g.add(nozzle);
    g.add(leg);
  }
  box(g, palette.navy, 0, 2.3, 0.8, 0.45, 0.85, 0.04);
  box(g, palette.mint, 0, 2.3, 0.83, 0.34, 0.68, 0.035);
  const l = label("NEAR  /  01", "#c2fff0", 1.3);
  l.position.set(0, 2.95, 0.88);
  g.add(l);
  batch(g);
  const flame = new T.Group();
  for (const [r, h, color, opacity] of [
    [0.44, 2.4, "#67d8f1", 0.45],
    [0.25, 1.6, "#c3f8ff", 0.7],
    [0.12, 1.1, "#ffffff", 0.95],
  ] as const) {
    const m = new T.Mesh(
      new T.ConeGeometry(r, h, 24),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    m.rotation.z = Math.PI;
    m.position.y = 0.4 - h * 0.5;
    flame.add(m);
  }
  g.add(flame);
  g.userData.flame = flame;
  return g;
}
export function serviceRover(color = palette.mint) {
  const g = new T.Group();
  box(g, palette.navy, 0, 0.2, 0, 0.7, 0.22, 0.85);
  box(g, color, 0, 0.42, -0.08, 0.68, 0.35, 0.62);
  for (const x of [-0.36, 0.36])
    for (const z of [-0.27, 0.27]) {
      const tire = cylinder(g, palette.rubber, x, 0.19, z, 0.18, 0.12);
      tire.rotation.z = Math.PI / 2;
      const hub = cylinder(g, palette.steel, x * 1.16, 0.19, z, 0.08, 0.035);
      hub.rotation.z = Math.PI / 2;
    }
  const head = sphere(g, palette.navy, 0, 0.78, 0.13, 0.24);
  head.scale.y *= 0.8;
  for (const x of [-0.085, 0.085])
    sphere(g, palette.mint, x, 0.8, 0.35, 0.04).material = glow(palette.mint);
  cylinder(g, palette.steel, 0.25, 0.85, -0.2, 0.018, 0.5);
  sphere(g, palette.gold, 0.25, 1.12, -0.2, 0.04);
  box(g, palette.ivory, 0, 0.56, 0.42, 0.82, 0.06, 0.35);
  for (const x of [-0.3, 0.3])
    beam(
      g,
      new T.Vector3(x, 0.4, 0.1),
      new T.Vector3(x, 0.56, 0.5),
      0.035,
      palette.steel,
    );
  batch(g);
  return g;
}
export type AnimatedModel = {
  root: T.Group;
  animate: (time: number, b: Building, offset: number) => void;
  curve?: T.CatmullRomCurve3;
};

function dressBuilding(
  model: T.Group,
  b: Building,
  w: number,
  h: number,
  parts: T.Object3D[],
) {
  const a = blueprint(b.kind);
  // Recessed foundation, inset edge lights and service hatches are shared across the park.
  for (const x of [-1, 1]) {
    box(model, palette.navy, x * (w / 2 - 0.14), 0.25, 0, 0.13, 0.22, h - 0.3);
    const strip = box(
      model,
      a.color,
      x * (w / 2 - 0.17),
      0.38,
      0,
      0.035,
      0.03,
      h - 0.55,
    );
    strip.material = glow(a.color);
    for (const z of [-1, 1]) {
      cylinder(
        model,
        palette.steel,
        x * (w / 2 - 0.3),
        0.38,
        z * (h / 2 - 0.3),
        0.065,
        0.04,
      );
    }
  }
  box(model, palette.navy, w * 0.31, 0.39, -h * 0.32, w * 0.23, 0.06, h * 0.2);
  for (let i = 0; i < 5; i++)
    box(
      model,
      palette.steel,
      w * 0.31,
      0.43,
      -h * 0.38 + i * 0.07,
      w * 0.18,
      0.025,
      0.025,
    );
  const front = h / 2 - 0.25;
  box(model, palette.ivory, 0, 0.28, front, Math.min(w * 0.5, 1.6), 0.16, 0.5);
  for (const x of [-0.42, 0.42]) {
    cylinder(model, palette.steel, x, 0.65, front, 0.045, 0.5);
    sphere(model, palette.gold, x, 0.92, front, 0.07);
  }
  if (b.kind === "coaster") {
    const track = model.children.find(
      (o) => o instanceof T.Mesh && o.geometry instanceof T.TubeGeometry,
    ) as T.Mesh<T.TubeGeometry>;
    const curve = track.geometry.parameters.path;
    for (let i = 0; i < 72; i++) {
      const u = i / 72,
        p = curve.getPointAt(u),
        tangent = curve.getTangentAt(u);
      const cross = new T.Vector3(-tangent.z, 0, tangent.x)
        .normalize()
        .multiplyScalar(0.27);
      beam(
        model,
        p.clone().add(cross),
        p.clone().sub(cross),
        0.035,
        palette.navy,
      );
    }
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 181 }, (_, i) => {
        const u = i / 180,
          p = curve.getPointAt(u),
          tangent = curve.getTangentAt(u);
        return p.add(
          new T.Vector3(-tangent.z, 0, tangent.x)
            .normalize()
            .multiplyScalar(side * 0.24),
        );
      });
      const rail = new T.Mesh(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points, true),
          180,
          0.045,
          8,
          true,
        ),
        material(palette.gold),
      );
      model.add(rail);
    }
    for (let i = 0; i < 12; i++) {
      const p = curve.getPointAt(i / 12);
      cylinder(model, palette.navy, p.x, 0.42, p.z, 0.19, 0.16);
      beam(model, new T.Vector3(p.x + 0.32, 0.4, p.z), p, 0.035, palette.steel);
    }
    const z = h * 0.34;
    for (const x of [-w * 0.25, w * 0.25]) {
      cylinder(model, palette.steel, x, 1.16, z, 0.055, 1.2);
      box(model, palette.gold, x, 1.64, z, 0.12, 0.06, 1.28);
    }
    for (let i = 0; i < 10; i++)
      box(
        model,
        palette.ivory,
        (i - 4.5) * w * 0.05,
        1.76,
        z,
        0.035,
        0.06,
        1.23,
      );
    parts.forEach((cart) => {
      const nose = sphere(cart, palette.gold, 0, 0.01, 0.25, 0.32);
      nose.scale.multiply(new T.Vector3(1, 0.5, 0.85));
      for (const x of [-0.19, 0.19])
        sphere(cart, palette.ivory, x, 0.04, 0.49, 0.04).material = glow(
          palette.ivory,
        );
      for (const x of [-0.33, 0.33]) {
        box(cart, palette.mint, x, 0.03, 0, 0.06, 0.2, 0.65);
        beam(
          cart,
          new T.Vector3(x, 0.28, 0.14),
          new T.Vector3(x, 0.28, -0.18),
          0.025,
          palette.navy,
        );
      }
      box(cart, palette.ivory, 0, -0.08, 0.31, 0.5, 0.08, 0.05);
    });
  } else if (b.kind === "wheel") {
    const moving = parts[0].parent!;
    ring(moving, palette.ivory, 2.3, 0.035, 0, 0, 0.15, false);
    for (let i = 0; i < 24; i++) {
      const t = (i * Math.PI) / 12;
      const bulb = sphere(
        moving,
        palette.gold,
        Math.cos(t) * 2.3,
        Math.sin(t) * 2.3,
        0.13,
        0.055,
      );
      bulb.material = glow("#ffe2a2");
    }
    for (const cabin of parts) {
      box(cabin, palette.ivory, 0, 0.13, 0, 0.65, 0.1, 0.64);
      box(cabin, palette.navy, 0, -0.49, 0, 0.5, 0.08, 0.5);
      for (const x of [-0.22, 0.22])
        box(cabin, palette.ivory, x, -0.12, 0.3, 0.035, 0.3, 0.025);
      ring(cabin, palette.gold, 0.1, 0.025, 0, 0.3, 0, false);
    }
    for (const z of [-0.6, 0.6]) {
      const axle = cylinder(model, palette.navy, 0, 3.2, z, 0.3, 0.2);
      axle.rotation.x = Math.PI / 2;
    }
    const sign = label("EARTHRISE", "#f9d99b", 2.8);
    sign.position.set(0, 1.2, 0.85);
    model.add(sign);
  } else if (b.kind === "bounce") {
    ring(model, palette.gold, 1.43, 0.055, 0, 0.66);
    ring(model, palette.navy, 1.12, 0.06, 0, 0.96);
    for (let i = 0; i < 12; i++) {
      const t = (i * Math.PI) / 6;
      const bulb = sphere(
        model,
        "#dac3ff",
        Math.cos(t) * 1.4,
        0.83,
        Math.sin(t) * 1.4,
        0.055,
      );
      bulb.material = glow("#dac3ff");
    }
    for (let i = 0; i < 4; i++) {
      const t = (i * Math.PI) / 2;
      ring(
        model,
        palette.ivory,
        0.12,
        0.03,
        Math.cos(t) * 1.3,
        1.5,
        Math.sin(t) * 1.3,
      );
    }
    cylinder(model, palette.navy, 0, 1.6, 0, 0.12, 2.1);
    cylinder(model, palette.ivory, 0, 2.5, 0, 0.18, 0.35);
    const moon = sphere(model, "#ebd0a0", 0, 3.05, 0, 0.38);
    moon.material = new T.MeshStandardMaterial({
      color: "#eed3a6",
      roughness: 0.82,
    });
    for (const [x, y, r] of [
      [-0.15, 3.2, 0.08],
      [0.17, 3.08, 0.12],
      [-0.06, 2.88, 0.06],
    ]) {
      sphere(model, "#c6ad88", x, y, 0.32, r).scale.z *= 0.18;
    }
    const orbit = ring(model, palette.gold, 0.58, 0.035, 0, 3.05, 0, false);
    orbit.rotation.x = -0.45;
    const sign = label("LUNAR BOUNCE", "#e0c2ff", 2);
    sign.position.set(0, 0.85, h * 0.42);
    model.add(sign);
  } else if (b.kind === "rover") {
    const rock = new T.Mesh(
      new T.IcosahedronGeometry(0.65, 1),
      material("#788b8e"),
    );
    rock.position.set(0, 0.65, 0);
    rock.scale.set(1.1, 0.65, 0.7);
    model.add(rock);
    cylinder(model, palette.steel, 0.2, 1.25, 0, 0.035, 1.7);
    box(model, palette.mint, 0.5, 1.9, 0, 0.6, 0.35, 0.04);
    box(model, palette.ivory, 0.5, 1.9, 0.03, 0.16, 0.16, 0.015).rotation.z =
      Math.PI / 4;
    for (let i = 0; i < 20; i++) {
      const t = (i * Math.PI) / 10;
      box(
        model,
        i % 2 ? palette.ivory : palette.gold,
        Math.cos(t) * w * 0.43,
        0.45,
        Math.sin(t) * h * 0.43,
        0.28,
        0.12,
        0.24,
      );
    }
    for (const car of parts) {
      box(car, palette.navy, 0, 0.29, 0.36, 0.62, 0.12, 0.06);
      for (const x of [-0.2, 0.2]) {
        const light = sphere(car, "#fff2c5", x, 0.32, 0.41, 0.07);
        light.material = glow("#fff2c5");
      }
      beam(
        car,
        new T.Vector3(-0.3, 0.32, -0.25),
        new T.Vector3(-0.3, 0.85, -0.25),
        0.025,
        palette.steel,
      );
      beam(
        car,
        new T.Vector3(0.3, 0.32, -0.25),
        new T.Vector3(0.3, 0.85, -0.25),
        0.025,
        palette.steel,
      );
      box(car, palette.gold, 0, 0.85, -0.25, 0.6, 0.045, 0.08);
    }
    const sign = label("ROVER RALLY", "#ffc68e", 2.4);
    sign.position.set(0, 1.8, -h * 0.38);
    model.add(sign);
  } else if (b.kind === "solar") {
    const panels = model.children.find((o) => o instanceof T.Group)!;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        const cell = box(
          panels,
          "#254b81",
          (i - 3.5) * w * 0.105,
          0.08,
          (j - 2.5) * h * 0.125,
          w * 0.098,
          0.02,
          h * 0.116,
        );
        cell.material = glass;
      }
    }
    box(model, palette.ivory, 0, 0.72, 0, 0.9, 0.72, 0.65);
    box(model, palette.navy, 0, 0.78, 0.34, 0.65, 0.3, 0.035);
    const led = box(model, palette.mint, -0.22, 0.8, 0.37, 0.06, 0.19, 0.025);
    led.material = glow(palette.mint);
  } else {
    for (const x of [-w * 0.32, w * 0.32]) {
      box(model, palette.ivory, x, 1.06, h * 0.39, 0.09, 0.65, 0.09);
      sphere(model, palette.gold, x, 1.43, h * 0.43, 0.055).material = glow(
        palette.gold,
      );
    }
    const awningZ = h * 0.35;
    for (let i = 0; i < 7; i++) {
      box(
        model,
        i % 2 ? palette.ivory : a.color,
        (i - 3) * w * 0.12,
        1.59,
        awningZ,
        w * 0.12,
        0.12,
        0.62,
      );
    }
    box(model, palette.navy, 0, 0.96, h * 0.42, w * 0.65, 0.055, 0.42);
    for (const x of [-w * 0.37, w * 0.37]) {
      cylinder(model, palette.steel, x, 0.95, -h * 0.22, 0.08, 1.1);
      ring(model, a.color, 0.09, 0.02, x, 1.3, -h * 0.22);
    }
    box(model, palette.navy, -w * 0.18, 0.4, -h * 0.36, 0.45, 0.15, 0.3);
    if (b.kind === "food") {
      ring(model, "#ca8948", 0.38, 0.065, 0, 2.22);
      for (let i = 0; i < 3; i++) {
        cylinder(model, "#d58b48", (i - 1) * 0.24, 1.03, h * 0.43, 0.09, 0.045);
        sphere(
          model,
          "#f3ce7b",
          (i - 1) * 0.24,
          1.06,
          h * 0.43,
          0.075,
        ).scale.y *= 0.45;
      }
      for (let i = 0; i < 6; i++) {
        const cut = box(
          model,
          palette.ivory,
          (i - 2.5) * 0.085,
          2.55 - Math.abs(i - 2.5) * 0.025,
          0.08,
          0.025,
          0.025,
          0.2,
        );
        cut.rotation.y = 0.5;
      }
    } else if (b.kind === "drink") {
      for (let i = 0; i < 3; i++) {
        cylinder(
          model,
          ["#e6a78f", "#8de0dd", "#e0bcf4"][i],
          (i - 1) * 0.26,
          1.12,
          h * 0.4,
          0.07,
          0.2,
        );
        cylinder(
          model,
          palette.ivory,
          (i - 1) * 0.26,
          1.22,
          h * 0.4,
          0.08,
          0.035,
        );
      }
      ring(model, palette.ivory, 0.255, 0.035, 0, 2.45);
      box(model, palette.navy, 0, 2.18, 0.253, 0.22, 0.19, 0.025);
      for (let i = 0; i < 5; i++) {
        sphere(
          model,
          "#d9f8f5",
          Math.sin(i * 2) * 0.14,
          2.05 + i * 0.07,
          0.24,
          0.025,
        );
      }
    } else {
      const sign = box(
        model,
        palette.ivory,
        0,
        1.2,
        h * 0.38,
        0.35,
        0.35,
        0.04,
      );
      box(sign, a.color, 0, 0, 0.6, 0.65, 0.2, 0.1);
      box(sign, a.color, 0, 0, 0.6, 0.2, 0.65, 0.1);
      for (const x of [-w * 0.32, w * 0.32])
        box(model, a.color, x, 0.42, -h * 0.3, 0.35, 0.1, 0.5);
    }
  }
}
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
  box(model, "#d1d5d9", 0, 0.3, 0, w - 0.32, 0.1, h - 0.32).material =
    platformMaterial(base.w, base.h, a.color);
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
      const shell = sphere(
        cabin,
        ["#8eddd3", "#f6b6a0", "#b6a0ed"][i % 3],
        0,
        -0.22,
        0,
        0.37,
      );
      shell.scale.multiply(new T.Vector3(1, 0.9, 0.95));
      const window = sphere(cabin, palette.navy, 0, -0.15, 0.26, 0.27);
      window.scale.multiply(new T.Vector3(1, 0.66, 0.36));
      window.material = glass;
      moving.add(cabin);
      parts.push(cabin);
    }
  } else if (b.kind === "coaster") {
    const pts = [
      [-0.34, 0.7, 0.36],
      [0.28, 0.8, 0.36],
      [0.38, 2.2, 0.05],
      [0.29, 9.2, -0.32],
      [-0.12, 8.1, -0.35],
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
    const road: number[] = [],
      uv: number[] = [];
    for (let i = 0; i < 96; i++) {
      const corners = [
        i / 96,
        i / 96,
        (i + 1) / 96,
        i / 96,
        (i + 1) / 96,
        (i + 1) / 96,
      ];
      const sides = [-1, 1, -1, 1, 1, -1];
      corners.forEach((u, j) => {
        const p = curve!.getPointAt(u),
          tangent = curve!.getTangentAt(u);
        const cross = new T.Vector3(-tangent.z, 0, tangent.x)
          .normalize()
          .multiplyScalar(sides[j] * 0.42);
        road.push(p.x + cross.x, p.y - 0.025, p.z + cross.z);
        uv.push(u * 16, sides[j] * 0.5 + 0.5);
      });
    }
    const roadGeometry = new T.BufferGeometry();
    roadGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(road, 3),
    );
    roadGeometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    roadGeometry.computeVertexNormals();
    const track = new T.Mesh(
      roadGeometry,
      new T.MeshStandardMaterial({
        color: "#425761",
        roughness: 0.85,
        side: T.DoubleSide,
      }),
    );
    track.receiveShadow = true;
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
      const robot = serviceRover(a.color);
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
  dressBuilding(model, b, w, h, parts);
  batch(model);
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
