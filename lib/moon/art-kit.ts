import * as T from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { NEAR_MARK_PATH } from "../near-brand";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export const SCALE = 1.25;
let compactArt = false;
export function configureArt(quality: "full" | "compact") {
  compactArt = quality === "compact";
}
export const artSegments = (full: number, compact: number) =>
  compactArt ? compact : full;
const materials = new Map<string, T.MeshStandardMaterial>();
export type Finish = "paint" | "metal" | "cloth" | "stone";
export function surface(color: string | number, finish: Finish = "paint") {
  const key = `${compactArt ? "compact" : "full"}:${finish}:${color}`;
  let result = materials.get(key);
  if (!result) {
    const properties = {
      color,
      roughness: { paint: 0.34, metal: 0.3, cloth: 0.76, stone: 0.86 }[finish],
      metalness: finish === "metal" ? 0.78 : 0.02,
    };
    result = compactArt
      ? new T.MeshStandardMaterial(properties)
      : new T.MeshPhysicalMaterial({
          ...properties,
          clearcoat: finish === "paint" ? 0.55 : finish === "metal" ? 0.25 : 0,
          clearcoatRoughness: 0.23,
        });
    result.userData.finish = finish;
    materials.set(key, result);
  }
  return result;
}
export const material = (color: string | number) => surface(color);
export const metal = (color: string | number) => surface(color, "metal");
export const fabric = (color: string | number) => surface(color, "cloth");
const boxGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
  sphereGeo = new T.SphereGeometry(1, 20, 12),
  cylGeo = new T.CylinderGeometry(1, 1, 1, 24),
  compactBoxGeo = new RoundedBoxGeometry(1, 1, 1, 1, 0.09),
  compactSphereGeo = new T.SphereGeometry(1, 12, 8),
  compactCylinderGeo = new T.CylinderGeometry(1, 1, 1, 12);
const sharedGeometries = new Set<T.BufferGeometry>([
  boxGeo,
  sphereGeo,
  cylGeo,
  compactBoxGeo,
  compactSphereGeo,
  compactCylinderGeo,
]);

let nearGeometry: T.BufferGeometry | undefined;
export function nearMark(parent: T.Object3D, color: string, width = 1) {
  if (!nearGeometry) {
    const svg = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${NEAR_MARK_PATH}"/></svg>`,
    );
    const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path));
    nearGeometry = new T.ExtrudeGeometry(shapes, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.05,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 8,
    });
    nearGeometry
      .translate(-8, -8, 0)
      .rotateX(Math.PI)
      .scale(1 / 15, 1 / 15, 1 / 15);
    sharedGeometries.add(nearGeometry);
  }
  const mark = new T.Mesh(nearGeometry, material(color));
  mark.scale.setScalar(width);
  mark.castShadow = true;
  parent.add(mark);
  return mark;
}

export const palette = {
  ivory: "#fff0d7",
  navy: "#123e48",
  mint: "#2ab7a8",
  gold: "#d8a34c",
  steel: "#819da4",
  rubber: "#20383d",
  coral: "#e4775d",
  cream: "#ead4b0",
};
export const glass = new T.MeshPhysicalMaterial({
  color: "#8acdd8",
  metalness: 0.08,
  roughness: 0.09,
  transparent: true,
  opacity: 0.13,
  envMapIntensity: 0.65,
  depthWrite: false,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  side: T.DoubleSide,
});
const suitMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.6,
  metalness: 0.015,
});
const lit = new Map<string, T.MeshStandardMaterial>();

export function foliageMaterial() {
  const key = "@lunar-leaves";
  let result = materials.get(key);
  if (!result) {
    const map = new T.TextureLoader().load("/art/lunar-leaves-v2.webp");
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    result = new T.MeshStandardMaterial({
      map,
      roughness: 0.72,
      side: T.DoubleSide,
      alphaTest: 0.45,
    });
    materials.set(key, result);
  }
  return result;
}

export function glow(color: string) {
  let m = lit.get(color);
  if (!m) {
    m = new T.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.35,
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
    mesh.castShadow =
      !mat.transparent && meshes.some((source) => source.castShadow);
    mesh.receiveShadow = true;
    meshes.forEach((m) => {
      g.remove(m);
      if (!sharedGeometry(m.geometry)) m.geometry.dispose();
    });
    g.add(mesh);
  }
}

/** Collapse architectural groups while preserving articulated rig roots. */
export function batchStatic(root: T.Object3D) {
  root.updateWorldMatrix(true, true);
  const collect = (parent: T.Object3D) => {
    for (const child of [...parent.children]) {
      if (child.userData.animated) continue;
      if (child instanceof T.Mesh) {
        if (parent !== root) root.attach(child);
      } else {
        collect(child);
        if (!child.children.length) child.removeFromParent();
      }
    }
  };
  collect(root);
  batch(root);
}

function sharedGeometry(geometry: T.BufferGeometry) {
  return sharedGeometries.has(geometry);
}

export function batchColors(g: T.Object3D) {
  const meshes = g.children.filter(
    (o): o is T.Mesh<T.BufferGeometry, T.MeshStandardMaterial> =>
      o instanceof T.Mesh &&
      o.material instanceof T.MeshStandardMaterial &&
      o.material !== glass &&
      o.material.emissive.getHex() === 0,
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
  if (!geometries.length) return;
  const geometry = mergeGeometries(geometries);
  geometries.forEach((geo) => geo.dispose());
  if (!geometry) return;
  meshes.forEach((m) => {
    g.remove(m);
    if (!sharedGeometry(m.geometry)) m.geometry.dispose();
  });
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
  const m = new T.Mesh(compactArt ? compactBoxGeo : boxGeo, material(color));
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
  const m = new T.Mesh(
    compactArt ? compactSphereGeo : sphereGeo,
    material(color),
  );
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
  const m = new T.Mesh(
    compactArt ? compactCylinderGeo : cylGeo,
    material(color),
  );
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
  ctx.fillStyle = "#143d45";
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 120, 48);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "800 41px sans-serif";
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

export function shapedBox(
  g: T.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  radius = 0.16,
) {
  const mesh = new T.Mesh(
    new RoundedBoxGeometry(
      w,
      h,
      d,
      artSegments(2, 1),
      Math.min(radius, w / 2, h / 2, d / 2),
    ),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
export function ellipsoid(
  g: T.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const mesh = sphere(g, color, x, y, z, 1);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}
export function line(
  g: T.Object3D,
  points: T.Vector3[],
  radius: number,
  color: string,
  finish: Finish = "paint",
) {
  const curve = new T.CatmullRomCurve3(points);
  const mesh = new T.Mesh(
    new T.TubeGeometry(
      curve,
      Math.max(12, points.length * 6),
      radius,
      6,
      false,
    ),
    surface(color, finish),
  );
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
export function arch(
  g: T.Object3D,
  color: string,
  radius: number,
  height: number,
  z: number,
  tube = 0.05,
) {
  return line(
    g,
    Array.from({ length: 25 }, (_, i) => {
      const a = (i / 24) * Math.PI;
      return new T.Vector3(
        Math.cos(a) * radius,
        height + Math.sin(a) * radius,
        z,
      );
    }),
    tube,
    color,
  );
}
export function bolt(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  radius = 0.025,
) {
  const mesh = cylinder(g, palette.gold, x, y, z, radius, radius * 0.65);
  mesh.material = metal(palette.gold);
  return mesh;
}
