import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Run } from "../model";

export const SITES = [
  { name: "Solar fields", x: -21, z: -11, color: "#efb653" },
  { name: "Ice works", x: -20, z: 9, color: "#76c8e5" },
  { name: "Greenhouses", x: 0, z: -15, color: "#a4d867" },
  { name: "Oxygen works", x: 20, z: -1, color: "#73ddd2" },
  { name: "Fabrication", x: 4, z: 16, color: "#f19460" },
];
export type Detail = {
  kind: "building" | "person" | "rover" | "ridge";
  index: number;
  name: string;
  role: string;
  task: string;
  x: number;
  y: number;
};
type Agent = {
  mesh: T.Group;
  legs: T.Object3D[];
  route: T.Vector3[];
  progress: number;
  rate: number;
  index: number;
  name: string;
  role: string;
  task: string;
  kind: "person" | "rover";
  home: number;
  tradeSol?: number;
};
const COLORS = {
  sand: 0xc17c50,
  ivory: 0xf0dfbd,
  dark: 0x35475a,
  teal: 0x237f97,
  orange: 0xf3a24b,
  glass: 0x8dd2df,
  green: 0x84b94b,
};
const NAMES = [
  "Ari Chen",
  "Noor Haddad",
  "Jun Park",
  "Lena Ortiz",
  "Samir Khan",
  "Eva Laurent",
  "Kai Williams",
  "Amara Okeke",
  "Leo Martin",
  "Mina Sato",
  "Omar Patel",
  "Ada Brooks",
  "Niko Ivanov",
  "Zoe Rivera",
  "Isla Kim",
  "Idris Ali",
  "Mei Santos",
  "Ezra Clarke",
  "Anika Rao",
  "Theo Mensah",
  "Sana Reed",
  "Jules Velez",
  "Maya Ellis",
  "Max Okafor",
];
const JOBS = [
  "Solar technician",
  "Water engineer",
  "Botanist",
  "Atmosphere specialist",
  "Fabricator",
  "Medic",
  "Surveyor",
  "Logistics coordinator",
];
let terrainSeed = 17291;
function rand() {
  terrainSeed = (terrainSeed * 1664525 + 1013904223) >>> 0;
  return terrainSeed / 4294967296;
}
const mats = new Map<number, T.MeshStandardMaterial>();
function material(c: number) {
  if (!mats.has(c))
    mats.set(
      c,
      new T.MeshStandardMaterial({
        color: c,
        roughness: 0.78,
        metalness: 0.08,
      }),
    );
  return mats.get(c)!;
}
function part(
  g: T.Group,
  geo: T.BufferGeometry,
  c: number,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geo, material(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function box(
  g: T.Group,
  w: number,
  h: number,
  d: number,
  c: number,
  x = 0,
  y = h / 2,
  z = 0,
) {
  return part(g, new T.BoxGeometry(w, h, d), c, x, y, z);
}
function cyl(
  g: T.Group,
  r: number,
  h: number,
  c: number,
  x = 0,
  y = h / 2,
  z = 0,
  sides = 16,
) {
  return part(g, new T.CylinderGeometry(r, r, h, sides), c, x, y, z);
}
function ball(g: T.Group, r: number, c: number, x = 0, y = r, z = 0) {
  return part(g, new T.SphereGeometry(r, 12, 8), c, x, y, z);
}
function beam(g: T.Group, a: T.Vector3, b: T.Vector3, r: number, c: number) {
  const p = part(g, new T.CylinderGeometry(r, r, a.distanceTo(b), 8), c);
  p.position.copy(a).lerp(b, 0.5);
  p.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return p;
}
function shadow(g: T.Group, r: number, x = 0, z = 0) {
  const m = new T.Mesh(
    new T.CircleGeometry(r, 24),
    new T.MeshBasicMaterial({
      color: 0x623c32,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.025, z);
  g.add(m);
}
function batch(g: T.Group) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(),
    groups = new Map<
      T.Material,
      { geos: T.BufferGeometry[]; meshes: T.Mesh[] }
    >();
  g.traverse((o) => {
    if (
      !(o instanceof T.Mesh) ||
      Array.isArray(o.material) ||
      !(o.material instanceof T.MeshStandardMaterial)
    )
      return;
    let p: T.Object3D | null = o;
    while (p && p !== g) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    const entry = groups.get(o.material) || { geos: [], meshes: [] };
    entry.geos.push(
      o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld)),
    );
    entry.meshes.push(o);
    groups.set(o.material, entry);
  });
  for (const [mat, data] of groups) {
    if (data.meshes.length < 2) {
      data.geos.forEach((x) => x.dispose());
      continue;
    }
    const geo = mergeGeometries(data.geos);
    data.geos.forEach((x) => x.dispose());
    if (!geo) continue;
    data.meshes.forEach((m) => {
      m.removeFromParent();
      m.geometry.dispose();
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}
function road(
  g: T.Group,
  a: [number, number],
  b: [number, number],
  width = 2.4,
) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len = Math.hypot(dx, dz);
  const slab = box(
    g,
    width,
    0.12,
    len,
    0xd0aa7c,
    (a[0] + b[0]) / 2,
    0.1,
    (a[1] + b[1]) / 2,
  );
  slab.rotation.y = Math.atan2(dx, dz);
  for (let i = 0; i < len / 2; i++) {
    const p = ((i + 0.5) * 2) / len;
    const marker = box(
      g,
      0.1,
      0.04,
      0.65,
      0xead8ad,
      a[0] + dx * p,
      0.18,
      a[1] + dz * p,
    );
    marker.rotation.y = Math.atan2(dx, dz);
  }
}
function door(g: T.Group, x: number, z: number, orientation = 0) {
  const d = new T.Group();
  d.position.set(x, 0, z);
  d.rotation.y = orientation;
  box(d, 1.15, 1.7, 0.25, 0x354556, 0, 1, 0);
  box(d, 0.85, 1.38, 0.3, 0x769ca3, 0, 1, 0.04);
  box(d, 0.12, 0.3, 0.1, 0xaff6d1, 0.27, 1, 0.24);
  box(d, 1.8, 0.18, 1.5, 0xcfc8ae, 0, 0.18, 0.7);
  g.add(d);
}
function buildingWindow(g: T.Group, x: number, y: number, z: number, w = 1.1) {
  box(g, w, 0.6, 0.08, 0x2d5366, x, y, z);
  box(g, w - 0.13, 0.12, 0.1, 0xa9e4e3, x, y + 0.12, z + 0.03);
}
function crate(g: T.Group, x: number, z: number, c = 0xd69d58) {
  box(g, 0.72, 0.7, 0.72, c, x, 0.38, z);
  box(g, 0.1, 0.73, 0.76, 0x66706c, x, 0.4, z);
  box(g, 0.77, 0.09, 0.77, 0xf3d4a0, x, 0.75, z);
}
function antenna(g: T.Group, x: number, z: number) {
  cyl(g, 0.14, 3.5, 0xefe3c7, x, 1.8, z);
  const dish = part(
    g,
    new T.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    0xece1c7,
    x,
    3.6,
    z,
  );
  dish.rotation.z = -0.6;
  beam(
    g,
    new T.Vector3(x, 3.5, z),
    new T.Vector3(x + 0.5, 4.2, z),
    0.055,
    0xf1a84f,
  );
}
function tank(g: T.Group, x: number, z: number, r = 1.1, h = 3.1) {
  cyl(g, r, h, COLORS.ivory, x, h / 2, z);
  cyl(g, r + 0.04, 0.35, COLORS.teal, x, h * 0.65, z);
  part(
    g,
    new T.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    COLORS.ivory,
    x,
    h,
    z,
  );
  cyl(g, 0.1, h + 0.8, COLORS.dark, x + r * 0.65, (h + 0.8) / 2, z);
  box(g, 0.5, 0.7, 0.12, COLORS.orange, x, h * 0.55, z + r + 0.08);
}
function habitat(g: T.Group, x: number, z: number, rot = 0) {
  const h = new T.Group();
  h.position.set(x, 0, z);
  h.rotation.y = rot;
  shadow(h, 2.5);
  box(h, 3.4, 0.35, 3.6, 0xa48162);
  const body = cyl(h, 1.55, 2.1, COLORS.ivory, 0, 1.35, 0, 8);
  body.scale.z = 1.12;
  cyl(h, 1.65, 0.24, COLORS.orange, 0, 2.1, 0, 8);
  cyl(h, 1.25, 0.35, COLORS.teal, 0, 2.48, 0, 8);
  door(h, 0, 1.55);
  buildingWindow(h, -0.9, 1.5, 1.35, 0.55);
  cyl(h, 0.15, 1.1, COLORS.dark, -1, 2.9, -0.6);
  g.add(h);
  return h;
}
function greenhouse(g: T.Group, x: number, z: number) {
  const h = new T.Group();
  h.position.set(x, 0, z);
  shadow(h, 4.6);
  cyl(h, 4, 0.38, 0x9b9f85, 0, 0.25, 0, 32);
  for (let row = -2; row <= 2; row++) {
    box(h, 5.9, 0.35, 0.6, 0x73543a, 0, 0.55, row * 1.1);
    for (let j = -3; j <= 3; j++) {
      const plant = part(
        h,
        new T.IcosahedronGeometry(0.3 + (j % 2) * 0.05, 0),
        row % 2 ? 0x6caf3c : 0x96c45b,
        j * 0.75,
        0.95,
        row * 1.1,
      );
      plant.scale.y = 1.5;
    }
  }
  const glass = new T.Mesh(
    new T.SphereGeometry(4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshPhysicalMaterial({
      color: 0xb4e4dc,
      transparent: true,
      opacity: 0.2,
      roughness: 0.22,
      metalness: 0.02,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  glass.position.y = 0.45;
  h.add(glass);
  for (let i = 0; i < 4; i++) {
    const rib = new T.Mesh(
      new T.TorusGeometry(4, 0.055, 5, 48, Math.PI),
      material(COLORS.ivory),
    );
    rib.rotation.y = (i * Math.PI) / 4;
    rib.position.y = 0.45;
    h.add(rib);
  }
  const rim = new T.Mesh(
    new T.TorusGeometry(4, 0.095, 6, 48),
    material(COLORS.ivory),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.45;
  h.add(rim);
  door(h, 0, 3.6);
  g.add(h);
  return h;
}
function solarPanel(g: T.Group, x: number, z: number, angle = 0) {
  const holder = new T.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = angle;
  box(holder, 0.15, 1.0, 0.15, 0x9f9c87);
  const p = box(holder, 3.0, 0.13, 2.1, 0x285268, 0, 1.35, 0);
  p.rotation.x = 0.28;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      const cell = box(
        holder,
        0.82,
        0.03,
        0.57,
        0x246ba4,
        i * 0.94,
        1.47 + j * 0.59 * Math.sin(0.28),
        j * 0.59,
      );
      cell.rotation.x = 0.28;
    }
  g.add(holder);
}
function makeSites(world: T.Group) {
  const groups: T.Group[] = [],
    rotors: T.Object3D[] = [],
    stacks: T.Object3D[] = [],
    stocks: T.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const g = new T.Group();
    g.position.set(SITES[i].x, 0, SITES[i].z);
    g.userData.building = i;
    world.add(g);
    groups.push(g);
    shadow(g, 6);
    box(g, 12, 0.2, 11, 0xc7a37f, 0, 0.12, 0);
    if (i === 0) {
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++) solarPanel(g, x * 3.5, z * 2.8);
      box(g, 3.2, 2.0, 2.3, COLORS.ivory, 5, 1, -2);
      door(g, 5, -0.75);
      for (let j = 0; j < 3; j++)
        box(g, 1.2, 1.3, 1.5, COLORS.teal, 3 + j * 1.4, 0.85, 3.8);
      antenna(g, 5, -4);
    }
    if (i === 1) {
      tank(g, -2, -2, 1.6, 3.5);
      tank(g, 2, -2, 1.6, 3.5);
      box(g, 6, 1.6, 2.4, COLORS.teal, 0, 0.95, 2.5);
      door(g, 0, 3.8);
      for (let i = 0; i < 3; i++)
        beam(
          g,
          new T.Vector3(-3 + i * 3, 0, -4.6),
          new T.Vector3(-2 + i * 2, 6, -4.6),
          0.15,
          COLORS.orange,
        );
      beam(
        g,
        new T.Vector3(-2, 6, -4.6),
        new T.Vector3(2, 6, -4.6),
        0.22,
        COLORS.dark,
      );
      cyl(g, 0.35, 5.3, 0x526e7b, 0, 3, -4.6);
      box(g, 6, 0.2, 1.5, 0x90bdc5, 0, 0.4, -4.5);
      beam(
        g,
        new T.Vector3(-2, 0.5, -2),
        new T.Vector3(-5, 0.5, 4),
        0.2,
        COLORS.teal,
      );
    }
    if (i === 2) {
      g.children
        .filter(
          (c) => c instanceof T.Mesh && c.geometry instanceof T.BoxGeometry,
        )
        .forEach((c) => {
          c.scale.set(1.55, 1, 1.05);
        });
      greenhouse(g, -4.4, 0);
      greenhouse(g, 4.4, 0);
      tank(g, 0, -3.5, 0.75, 2.1);
      box(g, 3, 1.4, 2, COLORS.ivory, 0, 0.8, 3.3);
      door(g, 0, 4.4);
    }
    if (i === 3) {
      tank(g, -2.8, -1, 1.8, 5);
      tank(g, 2, -1, 1.8, 4.2);
      box(g, 8.4, 1.5, 2.5, COLORS.ivory, 0, 0.9, 3.2);
      door(g, 0, 4.5);
      for (let k = 0; k < 2; k++) {
        const r = new T.Group();
        r.position.set(-2.5 + k * 4.7, 2.0, 3.1);
        r.userData.dynamic = true;
        cyl(r, 0.75, 0.15, COLORS.dark, 0, 0, 0);
        for (let j = 0; j < 4; j++) {
          const b = box(r, 0.24, 0.18, 1.15, 0x8cbfc5, 0, 0.15, 0.37);
          b.rotation.y = (j * Math.PI) / 2;
        }
        g.add(r);
        rotors.push(r);
      }
    }
    if (i === 4) {
      box(g, 7.5, 3.2, 5.5, 0xc67a4b, 0, 1.75, 0);
      box(g, 8.1, 0.35, 6.0, COLORS.ivory, 0, 3.55, 0);
      box(g, 3.2, 2.2, 0.2, COLORS.dark, 0, 1.35, 2.85);
      for (let k = -1; k <= 1; k++) buildingWindow(g, k * 2.2, 2.7, 2.86, 1.4);
      for (let j = 0; j < 2; j++) {
        cyl(g, 0.5, 2.5, COLORS.dark, -2 + j * 4.7, 4.8, -1.5);
        cyl(g, 0.6, 0.2, COLORS.orange, -2 + j * 4.7, 6, -1.5);
        const p = new T.Group();
        p.position.set(-2 + j * 4.7, 6, -1.5);
        g.add(p);
        stacks.push(p);
      }
      box(g, 0.35, 5, 0.4, COLORS.orange, 5.6, 2.5, 1.6);
      box(g, 4.6, 0.3, 0.4, COLORS.orange, 4.4, 5.1, 1.6);
      beam(
        g,
        new T.Vector3(2.4, 5, 1.6),
        new T.Vector3(2.4, 3.2, 1.6),
        0.045,
        COLORS.dark,
      );
      crate(g, 5, 3);
      crate(g, 5, 4);
    }
    const stock = new T.Group();
    stock.position.set(-4, 0.25, 5.6);
    stock.userData.dynamic = true;
    for (let c = 0; c < 6; c++) {
      const bin = new T.Group();
      crate(
        bin,
        (c % 3) * 0.85,
        Math.floor(c / 3) * 0.85,
        [0xefba58, 0x72bdcf, 0x8bb459, 0x94cdd4, 0xcb8c5f][i],
      );
      stock.add(bin);
    }
    g.add(stock);
    stocks.push(stock);
    batch(g);
  }
  return { groups, rotors, stacks, stocks };
}
function person(index: number) {
  const g = new T.Group(),
    color = [0xeea74d, 0x8cbdd2, 0xb7d475, 0xf0dfbf][index % 4];
  shadow(g, 0.35);
  const torso = part(
    g,
    new T.CapsuleGeometry(0.19, 0.26, 3, 6),
    color,
    0,
    0.78,
    0,
  );
  box(g, 0.25, 0.3, 0.16, 0x809393, 0, 0.8, -0.2);
  ball(g, 0.27, 0xf1e5c9, 0, 1.28, 0);
  const visor = ball(g, 0.23, 0x315e74, 0, 1.29, 0.1);
  visor.scale.set(0.85, 0.65, 0.8);
  const legs: T.Object3D[] = [];
  for (let s = -1; s <= 1; s += 2) {
    const leg = box(g, 0.15, 0.36, 0.18, 0x465963, s * 0.105, 0.32, 0);
    legs.push(leg);
    const arm = box(g, 0.12, 0.38, 0.14, color, s * 0.28, 0.77, 0);
    legs.push(arm);
  }
  const hitArea = new T.Mesh(
    new T.SphereGeometry(0.58, 8, 6),
    new T.MeshBasicMaterial({ visible: false }),
  );
  hitArea.position.y = 0.9;
  g.add(hitArea);
  g.scale.setScalar(0.8);
  return { g, legs };
}
function rover() {
  const g = new T.Group();
  shadow(g, 1.1);
  box(g, 1.2, 0.55, 2.0, COLORS.ivory, 0, 0.6, 0);
  box(g, 1.1, 0.6, 0.9, COLORS.orange, 0, 1.06, 0.5);
  box(g, 1.12, 0.34, 0.09, COLORS.glass, 0, 1.14, 1.0);
  box(g, 1.02, 0.18, 1.05, COLORS.dark, 0, 0.96, -0.55);
  for (let x = -1; x <= 1; x += 2)
    for (let z = -1; z <= 1; z++) {
      const wheel = part(
        g,
        new T.CylinderGeometry(0.34, 0.34, 0.24, 10),
        COLORS.dark,
        x * 0.72,
        0.36,
        z * 0.75,
      );
      wheel.rotation.z = Math.PI / 2;
    }
  box(g, 0.22, 0.1, 0.1, 0xf4eaba, -0.4, 0.72, 1.06);
  box(g, 0.22, 0.1, 0.1, 0xf4eaba, 0.4, 0.72, 1.06);
  crate(g, 0, -0.5, 0x88b4be);
  return g;
}
const v = (x: number, z: number) => new T.Vector3(x, 0.18, z);
function route(a: T.Vector3, b: T.Vector3) {
  return [a.clone(), v(a.x, 0), v(0, 0), v(b.x, 0), b.clone()];
}
function along(points: T.Vector3[], p: number) {
  const lengths = points.slice(1).map((b, i) => b.distanceTo(points[i])),
    total = lengths.reduce((a, b) => a + b, 0);
  let d = (p % 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const f = d / Math.max(0.01, lengths[i]);
      return {
        position: points[i].clone().lerp(points[i + 1], f),
        angle: Math.atan2(
          points[i + 1].x - points[i].x,
          points[i + 1].z - points[i].z,
        ),
        distance: total,
      };
    }
    d -= lengths[i];
  }
  return { position: points[0], angle: 0, distance: 1 };
}

export function createColony(
  host: HTMLElement,
  getRun: () => Run,
  getSpeed: () => number,
  onDetail: (detail: Detail | null) => void,
  onSelect: (i: number) => void,
  onPin: (detail: Detail) => void,
) {
  terrainSeed = (17291 + getRun().seed) >>> 0;
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.domElement.setAttribute(
    "aria-label",
    "Living Ares colony. Drag to pan, scroll to zoom, and select buildings or residents.",
  );
  renderer.domElement.tabIndex = 0;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0xd99c68);
  scene.fog = new T.Fog(0xd99c68, 100, 180);
  const camera = new T.OrthographicCamera(-45, 45, 35, -35, 0.1, 240);
  camera.position.set(59, 66, 70);
  camera.zoom = 0.82;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.5;
  controls.maxPolarAngle = 0.94;
  controls.minPolarAngle = 0.65;
  controls.mouseButtons = {
    LEFT: T.MOUSE.PAN,
    MIDDLE: T.MOUSE.DOLLY,
    RIGHT: T.MOUSE.ROTATE,
  };
  controls.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_PAN };
  controls.screenSpacePanning = false;
  scene.add(new T.HemisphereLight(0xfff4db, 0x96785c, 1.75));
  const sun = new T.DirectionalLight(0xffe5bc, 2.6);
  sun.position.set(-25, 55, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -48,
    right: 48,
    top: 45,
    bottom: -45,
    near: 0.1,
    far: 150,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  sun.shadow.radius = 3;
  scene.add(sun);
  const world = new T.Group();
  scene.add(world);
  const terrain = new T.Mesh(
    new T.PlaneGeometry(260, 260),
    material(COLORS.sand),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  world.add(terrain);
  // Sand is drawn once into a tile; the world uses no downloaded art or sprites.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#bc7c51";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = i % 2 ? "#e1aa7033" : "#754c331b";
    ctx.fillRect(
      rand() * 512,
      rand() * 512,
      rand() * 3 + 0.2,
      rand() * 2 + 0.2,
    );
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = T.SRGBColorSpace;
  const groundMaterial = new T.MeshStandardMaterial({
    map: texture,
    roughness: 1,
  });
  terrain.material = groundMaterial;
  const paths = new T.Group();
  world.add(paths);
  road(paths, [-32, 0], [29, 0], 3.2);
  road(paths, [0, -25], [0, 27], 3.2);
  for (const s of SITES) {
    road(paths, [s.x, 0], [s.x, s.z], 2.5);
  }
  road(paths, [-10, -7], [12, -7], 1.6);
  road(paths, [-10, 7], [12, 7], 1.6);
  batch(paths);
  const buildings = makeSites(world);
  const center = new T.Group();
  world.add(center);
  center.userData.building = 5;
  shadow(center, 6);
  cyl(center, 5.1, 0.3, 0xbda88c, 0, 0.2, 0, 12);
  cyl(center, 3.8, 3.0, COLORS.ivory, 0, 1.85, 0, 8);
  cyl(center, 4, 0.35, COLORS.orange, 0, 3.05, 0, 8);
  cyl(center, 2.8, 0.8, COLORS.dark, 0, 3.75, 0, 8);
  cyl(center, 2.5, 0.18, COLORS.glass, 0, 4.25, 0, 8);
  door(center, 0, 3.8);
  for (let x = -1; x <= 1; x++) buildingWindow(center, x * 1.4, 2.0, 3.5, 0.85);
  antenna(center, -2, -1.8);
  batch(center);
  const homes = new T.Group();
  world.add(homes);
  for (const [x, z, rot] of [
    [-9, -5, 0],
    [-9, 6, 0],
    [-4, 8, -0.4],
    [7, -4, 0],
    [11, -5, 0.5],
    [11, 6, 0],
    [15, 9, 0.3],
    [-10, -10, 0.2],
    [-12, 14, 0],
  ] as number[][])
    habitat(homes, x, z, rot);
  batch(homes);
  const decor = new T.Group();
  world.add(decor);
  for (let i = 0; i < 170; i++) {
    const a = rand() * Math.PI * 2,
      r = 33 + rand() * 40,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (Math.abs(z) < 3 && x < 0) continue;
    const mesh = part(
      decor,
      new T.DodecahedronGeometry(0.4 + rand() * 1.7, 0),
      [0x9c654b, 0xae7051, 0x835540, 0xd69862][i % 4],
      x,
      0.25,
      z,
    );
    mesh.scale.set(1 + rand(), 0.5 + rand(), 1 + rand());
    mesh.rotation.set(rand(), rand() * 6, rand());
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const x = Math.cos(a) * 45,
      z = Math.sin(a) * 45;
    const rock = part(
      decor,
      new T.ConeGeometry(6 + rand() * 6, 7 + rand() * 7, 6),
      0xb77b58,
      x,
      1,
      z,
    );
    rock.rotation.y = rand() * 6;
    rock.scale.z = 0.7;
  }
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24,
      x = Math.cos(a) * 31,
      z = Math.sin(a) * 26;
    box(decor, 0.25, 1.1, 0.25, 0xafa88e, x, 0.6, z);
    box(decor, 0.4, 0.15, 0.4, COLORS.teal, x, 1.25, z);
    if (i < 23) {
      const b = ((i + 1) * Math.PI * 2) / 24;
      beam(
        decor,
        new T.Vector3(x, 0.8, z),
        new T.Vector3(Math.cos(b) * 31, 0.8, Math.sin(b) * 26),
        0.045,
        0x96836b,
      );
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = -27 + i * 3.2,
      z = i % 2 ? 2.3 : -2.3;
    cyl(decor, 0.09, 1.8, COLORS.dark, x, 0.9, z);
    ball(decor, 0.16, 0xffdf92, x, 1.9, z);
  }
  for (let i = 0; i < 24; i++)
    crate(
      decor,
      -13 + (i % 4) * 0.9,
      17 + Math.floor(i / 4) * 0.9,
      i % 3 ? 0xc68d53 : 0x7fb9bd,
    );
  const pad = new T.Mesh(new T.CircleGeometry(5, 32), material(0x7f786d));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-30, 0.1, 0);
  decor.add(pad);
  box(decor, 4, 0.04, 0.3, COLORS.ivory, -30, 0.14, 0);
  for (let x = -1; x <= 1; x += 2)
    box(decor, 0.3, 0.04, 3, COLORS.ivory, -30 + x * 1.8, 0.14, 0);
  const ship = new T.Group();
  ship.position.set(-30, 0, 0);
  const body = part(
    ship,
    new T.CapsuleGeometry(0.9, 3.4, 6, 12),
    COLORS.ivory,
    0,
    2,
    0,
  );
  body.rotation.x = Math.PI / 2;
  box(ship, 5, 0.14, 1.8, COLORS.orange, 0, 1.5, -0.3);
  box(ship, 1.8, 0.3, 1.3, COLORS.dark, 0, 2.65, 1.7);
  for (let x = -1; x <= 1; x += 2)
    beam(
      ship,
      new T.Vector3(x * 0.6, 1.5, 0),
      new T.Vector3(x * 1.5, 0.3, 0),
      0.13,
      COLORS.dark,
    );
  decor.add(ship);
  batch(decor);
  const ridge = new T.Group();
  ridge.position.set(-38, 0, 23);
  ridge.userData.ridge = true;
  cyl(ridge, 0.25, 4, COLORS.orange);
  antenna(ridge, 0, 0);
  box(ridge, 3, 1.5, 2, COLORS.ivory, 2, 0.9, 0);
  world.add(ridge);
  batch(ridge);
  const upgradeGroups: T.Group[] = [],
    scaffolds: T.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new T.Group();
    g.position.set(
      i === 0 ? -25 : i === 1 ? 25 : 10,
      0,
      i === 0 ? 17 : i === 1 ? 7 : 20,
    );
    g.visible = false;
    world.add(g);
    upgradeGroups.push(g);
    box(g, 5, 0.18, 4, 0xbfa184, 0, 0.1, 0);
    if (i === 0) {
      tank(g, -1, 0, 0.9, 2.4);
      tank(g, 1, 0, 0.9, 2.4);
      beam(
        g,
        new T.Vector3(-1, 0.5, 1),
        new T.Vector3(1, 0.5, 1),
        0.15,
        COLORS.teal,
      );
    } else if (i === 1) {
      tank(g, 0, 0, 1.3, 4.2);
    } else {
      box(g, 4, 2.3, 3, COLORS.teal, 0, 1.3, 0);
      box(g, 4.5, 0.18, 3.5, COLORS.ivory, 0, 2.55, 0);
      door(g, 0, 1.6);
    }
    const scaffold = new T.Group();
    scaffold.userData.dynamic = true;
    for (let x = -1; x <= 1; x += 2)
      for (let z = -1; z <= 1; z += 2)
        box(scaffold, 0.12, 4, 0.12, COLORS.orange, x * 2.4, 2, z * 2);
    for (let y = 1; y <= 3; y++)
      beam(
        scaffold,
        new T.Vector3(-2.4, y, 2),
        new T.Vector3(2.4, y, 2),
        0.06,
        COLORS.orange,
      );
    g.add(scaffold);
    scaffolds.push(scaffold);
    batch(g);
  }
  const alertCanvas = document.createElement("canvas");
  alertCanvas.width = alertCanvas.height = 64;
  const alertCtx = alertCanvas.getContext("2d")!;
  alertCtx.fillStyle = "#e8a54e";
  alertCtx.beginPath();
  alertCtx.roundRect(5, 5, 54, 54, 14);
  alertCtx.fill();
  alertCtx.strokeStyle = "#fff0ce";
  alertCtx.lineWidth = 3;
  alertCtx.stroke();
  alertCtx.fillStyle = "#664934";
  alertCtx.font = "bold 42px sans-serif";
  alertCtx.textAlign = "center";
  alertCtx.fillText("!", 32, 48);
  const alertTexture = new T.CanvasTexture(alertCanvas);
  const alerts = SITES.map((s) => {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: alertTexture, depthTest: false }),
    );
    sprite.position.set(s.x, 8, s.z);
    sprite.scale.set(1.6, 1.6, 1);
    world.add(sprite);
    sprite.visible = false;
    return sprite;
  });
  const pickables: T.Object3D[] = [...buildings.groups, center, ridge];
  const agents: Agent[] = [];
  for (let i = 0; i < 32; i++) {
    const p = person(i),
      home = i % 5,
      dest = (i * 3 + 2) % 5;
    const a = sitesPoint(home),
      b = sitesPoint(dest === home ? (dest + 1) % 5 : dest);
    const agent: Agent = {
      mesh: p.g,
      legs: p.legs,
      route: route(a, b),
      progress: i / 32,
      rate: 0.02 + (i % 3) * 0.003,
      index: i,
      name:
        i === 2
          ? "Dr. Mara Velez"
          : i === 4
            ? "Imani Okafor"
            : i === 5
              ? "Tomas Reed"
              : NAMES[i % NAMES.length],
      role:
        i === 2
          ? "Agricultural director"
          : i === 4
            ? "Chief engineer"
            : i === 5
              ? "Civilian representative"
              : JOBS[i % 5],
      task: "Walking to a scheduled shift",
      kind: "person",
      home,
    };
    p.g.userData.agent = agent;
    p.g.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
    world.add(p.g);
    agents.push(agent);
    pickables.push(p.g);
  }
  for (let i = 0; i < 5; i++) {
    const mesh = rover(),
      a = sitesPoint(i),
      b = v(0, 4);
    const agent: Agent = {
      mesh,
      legs: [],
      route: route(a, b),
      progress: i / 5,
      rate: 0.028,
      index: i,
      name: `Cargo rover ${String(i + 1).padStart(2, "0")}`,
      role: "Autonomous logistics",
      task: "Standby / local supply route",
      kind: "rover",
      home: i,
    };
    mesh.userData.agent = agent;
    mesh.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
    world.add(mesh);
    agents.push(agent);
    pickables.push(mesh);
  }
  const steam: T.Mesh[] = [];
  for (let j = 0; j < 12; j++) {
    const puff = new T.Mesh(
      new T.IcosahedronGeometry(0.3, 1),
      new T.MeshBasicMaterial({
        color: 0xffe3c1,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    scene.add(puff);
    steam.push(puff);
  }
  const marker = new T.Mesh(
    new T.RingGeometry(5.6, 5.75, 64),
    new T.MeshBasicMaterial({
      color: 0xffe4a1,
      transparent: true,
      opacity: 0.85,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  world.add(marker);
  const dustGeo = new T.BufferGeometry();
  const dustPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    dustPositions[i * 3] = (rand() - 0.5) * 100;
    dustPositions[i * 3 + 1] = rand() * 8;
    dustPositions[i * 3 + 2] = (rand() - 0.5) * 80;
  }
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPositions, 3));
  const dustMaterial = new T.PointsMaterial({
    color: 0xffd9a8,
    size: 0.075,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const dust = new T.Points(dustGeo, dustMaterial);
  scene.add(dust);
  let target: T.Vector3 | null = null,
    targetZoom = 1,
    frame = 0,
    last = performance.now(),
    clock = 0,
    request = 0,
    selected = -1,
    prevRevision = -1,
    previousSol = -1,
    lastAutoEvent = 0,
    disposed = false,
    autoCamera = true,
    dragged = false,
    downX = 0,
    downY = 0,
    hoverKey = "";
  const pointer = new T.Vector2(-5, -5);
  const raycaster = new T.Raycaster();

  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    const aspect = w / h;
    camera.left = -35 * aspect;
    camera.right = 35 * aspect;
    camera.top = 35;
    camera.bottom = -35;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const focus = (index: number) => {
    selected = index;
    const s = SITES[index];
    if (!s) return;
    target = new T.Vector3(s.x * 0.72, 0, s.z * 0.72);
    targetZoom = Math.max(1.2, Math.min(camera.zoom, 1.75));
    marker.position.set(s.x, 0.25, s.z);
    marker.scale.setScalar(index === 2 ? 1.45 : 1);
    marker.visible = true;
    autoCamera = true;
  };
  const home = () => {
    target = new T.Vector3(0, 0, 0);
    targetZoom = host.clientWidth < 700 ? 0.78 : 1;
    autoCamera = true;
    marker.visible = false;
    selected = -1;
  };
  function detailAt() {
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) return null;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      let obj: T.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.agent) {
          const a = obj.userData.agent as Agent;
          return {
            object: obj,
            detail: {
              kind: a.kind,
              index: a.index,
              name: a.name,
              role: a.role,
              task: a.task,
              x: ((pointer.x + 1) * host.clientWidth) / 2,
              y: ((1 - pointer.y) * host.clientHeight) / 2,
            } as Detail,
          };
        }
        if (obj.userData.building !== undefined) {
          const i = obj.userData.building;
          return {
            object: obj,
            detail: {
              kind: "building",
              index: i,
              name: i < 5 ? SITES[i].name : "Central habitat",
              role: i < 5 ? "Autonomous institution" : "120 people. One home.",
              task:
                i < 5
                  ? getRun().actors[i].reason
                  : "The heart of the settlement",
              x: ((pointer.x + 1) * host.clientWidth) / 2,
              y: ((1 - pointer.y) * host.clientHeight) / 2,
            } as Detail,
          };
        }
        if (obj.userData.ridge)
          return {
            object: obj,
            detail: {
              kind: "ridge",
              index: 6,
              name: "Northern ridge station",
              role: "Remote survey outpost",
              task:
                getRun().rescued > 0
                  ? "Rescue operation authorized"
                  : "12 surveyors are waiting for word.",
              x: ((pointer.x + 1) * host.clientWidth) / 2,
              y: ((1 - pointer.y) * host.clientHeight) / 2,
            } as Detail,
          };
        obj = obj.parent;
      }
    }
    return null;
  }
  const move = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) dragged = true;
  };
  let pressedHit: ReturnType<typeof detailAt> = null;
  const down = (e: PointerEvent) => {
    move(e);
    pressedHit = detailAt();
    downX = e.clientX;
    downY = e.clientY;
    dragged = false;
    autoCamera = false;
    target = null;
  };
  const up = () => {
    if (dragged) return;
    const hit = pressedHit || detailAt();
    pressedHit = null;
    if (hit?.detail.kind === "building" && hit.detail.index < 5) {
      focus(hit.detail.index);
      onSelect(hit.detail.index);
    } else if (hit) {
      target = hit.object.position.clone();
      targetZoom = 1.65;
      autoCamera = true;
      onPin(hit.detail);
    }
  };
  const leave = () => {
    pointer.set(-5, -5);
    onDetail(null);
    hoverKey = "";
  };
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointerleave", leave);
  const key = (e: KeyboardEvent) => {
    if (e.target !== renderer.domElement) return;
    const amount = 2.5 / camera.zoom;
    if (e.key === "ArrowLeft") controls.target.x -= amount;
    if (e.key === "ArrowRight") controls.target.x += amount;
    if (e.key === "ArrowUp") controls.target.z -= amount;
    if (e.key === "ArrowDown") controls.target.z += amount;
    if (e.key === "Home") home();
    if (e.key === "+" || e.key === "=")
      camera.zoom = Math.min(2.5, camera.zoom * 1.15);
    if (e.key === "-") camera.zoom = Math.max(0.65, camera.zoom / 1.15);
    camera.updateProjectionMatrix();
    if (e.key.startsWith("Arrow")) e.preventDefault();
  };
  renderer.domElement.addEventListener("keydown", key);
  const sync = (run: Run) => {
    if (prevRevision === run.revision) return;
    renderer.shadowMap.needsUpdate = true;
    upgradeGroups.forEach((g, i) => {
      g.visible =
        run.upgrades[i] || (run.project_left > 0 && run.project === i);
      scaffolds[i].visible = !run.upgrades[i];
    });
    alerts.forEach(
      (g, i) =>
        (g.visible = run.actors[i].shortfall > 0 || run.actors[i].unpaid >= 2),
    );
    const newDays = run.days.filter((d) => d.sol > previousSol);
    previousSol = run.sol;
    prevRevision = run.revision;
    buildings.stocks.forEach((g, i) => {
      const goods = [4, 1, 0, 2, 3][i],
        qty = run.actors[i].inventory[goods];
      g.children.forEach(
        (o, j) => (o.visible = j < Math.min(6, Math.ceil(qty / 25))),
      );
    });
    const trades = newDays
      .flatMap((d) => d.trades.map((t) => ({ ...t, sol: d.sol })))
      .filter((t) => t.good !== 4 && (t.from < 5 || t.to < 5));
    agents
      .filter((a) => a.kind === "rover")
      .forEach((a, i) => {
        const t = trades[(i * 3) % Math.max(1, trades.length)];
        if (t) {
          const to = t.from < 5 ? sitesPoint(t.from) : v(0, 4);
          a.route = route(a.mesh.position.clone(), to);
          a.progress = 0;
          a.task = `${t.qty} ${["food", "water", "oxygen", "parts", "power"][t.good]} · ${t.paid} credits · confirmed sol ${t.sol}`;
          a.tradeSol = t.sol;
        }
      });
    agents
      .filter((a) => a.kind === "person")
      .forEach((a) => {
        const institution = run.actors[a.home];
        a.task =
          a.index === 5
            ? run.wellbeing < 50
              ? "Checking on families who cannot afford essentials."
              : "Visiting households and listening to their concerns."
            : institution.unpaid >= 2
              ? "Payroll is overdue. The institution is operating at reduced capacity."
              : institution.shortfall > 0
                ? "The shift is power-limited. Production needs a reliable allocation."
                : run.pending
                  ? "Walking between the habitat and the next shift. Awaiting your decision."
                  : `Working at ${institution.name}. Last output: ${institution.output} units.`;
      });
    const event = run.events
      .slice(-12)
      .find((e) => e.kind === "rescue" || e.kind === "project");
    if (event && event.id !== lastAutoEvent && run.sol > 0) {
      lastAutoEvent = event.id;
      if (autoCamera) {
        const point =
          event.kind === "rescue"
            ? v(-24, 1)
            : sitesPoint(run.project === 0 ? 1 : run.project === 1 ? 3 : 4);
        target = point.clone().multiplyScalar(0.55);
        targetZoom = 1.08;
      }
    }
  };
  const animate = () => {
    if (disposed) return;
    request = requestAnimationFrame(animate);
    const now = performance.now(),
      dt = Math.min((now - last) / 1000, 0.08);
    last = now;
    if (document.hidden) return;
    const run = getRun(),
      speed = getSpeed();
    clock += dt * speed;
    frame++;
    sync(run);
    if (frame % 10 === 0) {
      renderer.domElement.dataset.sol = String(run.sol);
      renderer.domElement.dataset.speed = String(speed);
      renderer.domElement.dataset.motion = clock.toFixed(2);
      renderer.domElement.dataset.zoom = camera.zoom.toFixed(2);
      renderer.domElement.dataset.agents = String(agents.length);
      renderer.domElement.dataset.residents = JSON.stringify(
        agents.slice(0, 20).map((a) => {
          const p = a.mesh.position
            .clone()
            .add(new T.Vector3(0, 0.9, 0))
            .project(camera);
          return {
            name: a.name,
            x: ((p.x + 1) * host.clientWidth) / 2,
            y: ((1 - p.y) * host.clientHeight) / 2,
          };
        }),
      );
      renderer.domElement.dataset.camera = `${controls.target.x.toFixed(2)},${controls.target.z.toFixed(2)}`;
    }
    if (target) {
      const delta = target
        .clone()
        .sub(controls.target)
        .multiplyScalar(1 - Math.exp(-dt * 2));
      controls.target.add(delta);
      camera.position.add(delta);
      camera.zoom = T.MathUtils.damp(camera.zoom, targetZoom, 3, dt);
      camera.updateProjectionMatrix();
      if (delta.length() < 0.001 && Math.abs(camera.zoom - targetZoom) < 0.001)
        target = null;
    }
    controls.update();
    const storm = run.sol >= 19 && run.sol <= 21;
    sun.intensity = T.MathUtils.damp(sun.intensity, storm ? 1.15 : 2.6, 1, dt);
    scene.background = (scene.background as T.Color).lerp(
      new T.Color(storm ? 0xb88768 : 0xd99c68),
      dt,
    );
    dustMaterial.opacity = storm ? 0.65 : 0.18;
    for (const a of agents) {
      const active =
        a.kind === "person" ? 1 : a.tradeSol !== undefined ? 1 : 0.48;
      a.progress += dt * speed * a.rate * active;
      const state = along(a.route, a.progress);
      a.mesh.position.copy(state.position);
      a.mesh.rotation.y +=
        Math.atan2(
          Math.sin(state.angle - a.mesh.rotation.y),
          Math.cos(state.angle - a.mesh.rotation.y),
        ) * Math.min(1, dt * 8);
      a.legs.forEach(
        (leg, i) =>
          (leg.rotation.x =
            Math.sin(clock * 8 + a.index + (i === 0 || i === 3 ? 0 : Math.PI)) *
            0.38),
      );
      if (a.kind === "person")
        a.mesh.position.y += Math.abs(Math.sin(clock * 8 + a.index)) * 0.035;
    }
    buildings.rotors.forEach(
      (r, i) =>
        (r.rotation.y +=
          dt * speed * (run.actors[3].output ? 2.4 : 0.3) * (i ? 1 : -1)),
    );
    steam.forEach((p, i) => {
      const phase = (clock * 0.28 + i / 6) % 1;
      const stack = buildings.stacks[i % 2];
      const origin = stack.getWorldPosition(new T.Vector3());
      p.position
        .copy(origin)
        .add(new T.Vector3(phase * 1.2, phase * 3, phase * 0.4));
      p.scale.setScalar(0.4 + phase * 1.4);
      (p.material as T.MeshBasicMaterial).opacity =
        (1 - phase) * 0.18 * (run.actors[4].output > 0 ? 1 : 0.2);
    });
    const pos = dust.geometry.attributes.position as T.BufferAttribute;
    for (let i = 0; i < 180; i++) {
      pos.array[i * 3] += dt * (storm ? 5 : 1.3);
      if (pos.array[i * 3] > 55) pos.array[i * 3] = -55;
    }
    pos.needsUpdate = true;
    marker.material.opacity = 0.65 + Math.sin(now * 0.003) * 0.15;
    if (frame % 5 === 0) {
      const hit = detailAt();
      const id = hit
        ? `${hit.detail.kind}${hit.detail.index}${Math.round(hit.detail.x / 3)}${Math.round(hit.detail.y / 3)}`
        : "";
      if (id !== hoverKey) {
        hoverKey = id;
        onDetail(hit?.detail || null);
      }
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    }
    renderer.render(scene, camera);
  };
  home();
  animate();
  return {
    focus,
    home,
    zoom: (factor: number) => {
      targetZoom = T.MathUtils.clamp(camera.zoom * factor, 0.65, 2.5);
      target = controls.target.clone();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(request);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("keydown", key);
      scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          const arr = Array.isArray(o.material) ? o.material : [o.material];
          arr.forEach((m) => m.dispose());
        }
      });
      texture.dispose();
      dustGeo.dispose();
      dustMaterial.dispose();
      alertTexture.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      mats.clear();
    },
  };
}
function sitesPoint(i: number) {
  const s = SITES[i % 5];
  return v(s.x, s.z + 5.5);
}
