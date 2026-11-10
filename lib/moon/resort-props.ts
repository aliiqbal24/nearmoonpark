import * as T from "three";
import type { Building, Design } from "./model";
export type StyledBuilding = Building & { design: Design };
import {
  palette,
  material,
  metal,
  surface,
  glass,
  box,
  sphere,
  cylinder,
  ring,
  beam,
  shapedBox,
  ellipsoid,
  line,
  bolt,
  batch,
  label,
  glow,
  foliageMaterial,
} from "./art-kit";

export type ResortColors = {
  primary: string;
  accent: string;
  dark: string;
  light: string;
};

export function pressureGarden(
  parent: T.Object3D,
  x: number,
  z: number,
  radius = 0.48,
  height = 0.6,
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  cylinder(g, palette.navy, 0, 0.1, 0, radius, 0.2);
  cylinder(g, "#d1b991", 0, 0.22, 0, radius * 0.96, 0.15).material = surface(
    "#d1b991",
    "stone",
  );
  cylinder(g, "#304c3c", 0, 0.3, 0, radius * 0.83, 0.02).material = surface(
    "#304c3c",
    "stone",
  );
  ring(g, palette.gold, radius * 0.97, 0.025, 0, 0.3).material = metal(
    palette.gold,
  );
  for (let stem = 0; stem < 5; stem++) {
    const a = stem * 2.4,
      px = Math.cos(a) * radius * 0.4,
      pz = Math.sin(a) * radius * 0.4;
    const top = 0.38 + height * (0.3 + (stem % 3) * 0.18);
    beam(
      g,
      new T.Vector3(px, 0.3, pz),
      new T.Vector3(px, top, pz),
      0.012,
      "#4f7950",
    );
    for (let i = 0; i < 4; i++) {
      const t = a + i * 1.8;
      const leafHeight = radius * 0.78,
        leafWidth = radius * 0.48;
      const geometry = new T.PlaneGeometry(leafWidth, leafHeight, 3, 5);
      const positions = geometry.attributes.position,
        uvs = geometry.attributes.uv;
      const atlas = (stem + i) % 4;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const v = uvs.getY(vertex);
        positions.setZ(vertex, Math.sin(v * Math.PI) * leafHeight * 0.18);
        positions.setY(vertex, positions.getY(vertex) + leafHeight / 2);
        uvs.setXY(
          vertex,
          uvs.getX(vertex) * 0.5 + (atlas % 2) * 0.5,
          v * 0.5 + (atlas < 2 ? 0.5 : 0),
        );
      }
      geometry.computeVertexNormals();
      const leaf = new T.Mesh(geometry, foliageMaterial());
      leaf.position.set(px, top - i * 0.065, pz);
      leaf.rotation.set(0.8, t, 0.35);
      leaf.castShadow = true;
      g.add(leaf);
    }
    if (stem % 2 === 0) {
      const y = top + 0.04;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ellipsoid(
          g,
          stem === 0 ? "#ec8b81" : "#c8a4e7",
          px + Math.cos(a) * 0.055,
          y,
          pz + Math.sin(a) * 0.055,
          0.06,
          0.025,
          0.035,
        ).rotation.y = -a;
      }
      sphere(g, "#e8bd59", px, y + 0.018, pz, 0.026);
    }
  }
  const dome = new T.Mesh(
    new T.SphereGeometry(radius * 0.99, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  dome.position.y = 0.31;
  dome.scale.y = (height + 0.14) / radius;
  g.add(dome);
  for (const a of [0, Math.PI / 2]) {
    const points = Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI;
      return new T.Vector3(
        Math.cos(t) * radius * Math.cos(a),
        0.31 + Math.sin(t) * (height + 0.14),
        Math.cos(t) * radius * Math.sin(a),
      );
    });
    line(g, points, 0.013, palette.gold, "metal");
  }
  parent.add(g);
  batch(g);
  return g;
}

export function resortBench(
  parent: T.Object3D,
  x: number,
  z: number,
  rotation = 0,
  color = palette.coral,
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  for (const side of [-0.58, 0.58]) {
    box(g, palette.navy, side, 0.23, 0, 0.09, 0.45, 0.5);
    box(g, palette.gold, side, 0.57, 0.04, 0.07, 0.06, 0.58).material = metal(
      palette.gold,
    );
  }
  shapedBox(g, color, 0, 0.43, 0, 1.4, 0.17, 0.52, 0.065);
  shapedBox(g, color, 0, 0.72, -0.2, 1.4, 0.46, 0.13, 0.06);
  for (const side of [-0.45, -0.15, 0.15, 0.45])
    box(g, palette.cream, side, 0.72, -0.125, 0.012, 0.33, 0.012);
  parent.add(g);
  batch(g);
  return g;
}

export function lantern(
  parent: T.Object3D,
  x: number,
  z: number,
  height = 1.2,
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  cylinder(g, palette.navy, 0, 0.1, 0, 0.14, 0.2);
  cylinder(g, palette.gold, 0, height / 2, 0, 0.035, height).material = metal(
    palette.gold,
  );
  cylinder(g, "#ffe8ad", 0, height, 0, 0.105, 0.22).material = glow("#ffdc8d");
  cylinder(g, palette.gold, 0, height + 0.13, 0, 0.14, 0.04).material = metal(
    palette.gold,
  );
  for (const x of [-0.08, 0.08])
    box(g, palette.navy, x, height, 0, 0.017, 0.23, 0.017);
  parent.add(g);
  batch(g);
  return g;
}

/** A real hollow, bevelled roof, shared by station canopies and pressure modules. */
export function vault(
  parent: T.Object3D,
  color: string,
  width: number,
  height: number,
  depth: number,
  baseY: number,
  z = 0,
) {
  const r = width / 2,
    t = Math.min(0.12, width * 0.05);
  const shape = new T.Shape();
  shape.moveTo(-r, 0);
  shape.absellipse(0, 0, r, height, Math.PI, 0, true, 0);
  shape.lineTo(r - t, 0);
  shape.absellipse(0, 0, r - t, height - t, 0, Math.PI, false, 0);
  shape.closePath();
  const mesh = new T.Mesh(
    new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 2,
      curveSegments: 24,
    }),
    material(color),
  );
  mesh.position.set(0, baseY, z - depth / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function scallopedAwning(
  parent: T.Object3D,
  width: number,
  z: number,
  y: number,
  color: string,
  depth = 0.55,
) {
  const strips = 8;
  for (let i = 0; i < strips; i++) {
    const x = (i / strips - 0.5) * width;
    const shape = new T.Shape();
    shape.moveTo(x, 0);
    shape.quadraticCurveTo(
      x + width / strips / 2,
      -0.13,
      x + width / strips,
      0,
    );
    shape.lineTo(x + width / strips, 0.16);
    shape.lineTo(x, 0.16);
    shape.closePath();
    const face = new T.Mesh(
      new T.ExtrudeGeometry(shape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSize: 0.016,
        bevelThickness: 0.016,
        bevelSegments: 2,
      }),
      material(i % 2 ? palette.ivory : color),
    );
    face.position.set(0, y, z + depth);
    parent.add(face);
    const roof = shapedBox(
      parent,
      i % 2 ? palette.ivory : color,
      x + width / strips / 2,
      y + 0.11,
      z + depth / 2,
      width / strips + 0.006,
      0.055,
      depth,
      0.02,
    );
    roof.rotation.x = -0.22;
  }
}

export function pieSculpture(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  r = 0.55,
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(r / 0.55);
  cylinder(g, palette.ivory, 0, 0, 0, 0.63, 0.045);
  const filling = cylinder(g, "#74334e", 0, 0.11, 0, 0.5, 0.13);
  const pastry = new T.Mesh(
    new T.CylinderGeometry(0.54, 0.46, 0.15, 48, 1, false, 0.4, Math.PI * 1.83),
    material("#c18038"),
  );
  pastry.position.y = 0.08;
  g.add(pastry);
  const crust = new T.Mesh(
    new T.TorusGeometry(0.5, 0.065, 8, 48, Math.PI * 1.83),
    material("#dc9e4e"),
  );
  crust.rotation.x = Math.PI / 2;
  crust.rotation.z = -0.4;
  crust.position.y = 0.18;
  g.add(crust);
  for (let i = 1; i < 24; i++) {
    const a = (i / 24) * Math.PI * 1.83 + 0.4;
    ellipsoid(
      g,
      "#e6b364",
      Math.sin(a) * 0.5,
      0.18,
      Math.cos(a) * 0.5,
      0.052,
      0.045,
      0.072,
    ).rotation.y = a;
  }
  for (let i = -2; i <= 2; i++) {
    const offset = i * 0.16,
      half = Math.sqrt(0.45 * 0.45 - offset * offset);
    for (const axis of [0, 1]) {
      const lattice = shapedBox(
        g,
        axis ? "#e5af5e" : "#d59644",
        axis ? offset : 0,
        0.21 + (axis ? 0.012 : 0),
        axis ? 0 : offset,
        axis ? 0.052 : half * 2,
        0.035,
        axis ? half * 2 : 0.052,
        0.014,
      );
      lattice.rotation.y = 0.28;
    }
  }
  for (let i = 0; i < 7; i++)
    sphere(
      g,
      i % 2 ? "#632e57" : "#b64c64",
      0.43 + (i % 2) * 0.035,
      0.14,
      0.15 - i * 0.045,
      0.04,
    );
  parent.add(g);
  batch(g);
  return { g, filling, pastry };
}

export function foundation(
  g: T.Object3D,
  w: number,
  h: number,
  c: ResortColors,
  style: number,
) {
  shapedBox(
    g,
    c.dark,
    0,
    0.14,
    0,
    w - 0.08,
    0.28,
    h - 0.08,
    style === 1 ? 0.42 : 0.2,
  );
  shapedBox(
    g,
    c.light,
    0,
    0.3,
    0,
    w - 0.22,
    0.12,
    h - 0.22,
    style === 1 ? 0.4 : 0.16,
  ).material = surface(c.light, "stone");
  for (const side of [-1, 1]) {
    box(
      g,
      c.accent,
      side * (w / 2 - 0.12),
      0.29,
      0,
      0.028,
      0.03,
      h - 0.35,
    ).material = metal(c.accent);
    for (const z of [-h / 2 + 0.22, h / 2 - 0.22])
      bolt(g, side * (w / 2 - 0.22), 0.38, z, 0.032);
  }
  if (w >= 3.7 && h >= 3.7) {
    pressureGarden(g, -w / 2 + 0.46, h / 2 - 0.5, 0.3, 0.37);
    pressureGarden(g, w / 2 - 0.46, h / 2 - 0.5, 0.3, 0.4);
  }
}

export function marquee(
  parent: T.Object3D,
  text: string,
  color: string,
  width: number,
  y: number,
  z: number,
) {
  const sign = label(text, color, width);
  sign.position.set(0, y, z);
  parent.add(sign);
  shapedBox(
    parent,
    palette.gold,
    0,
    y,
    z - 0.075,
    width + 0.08,
    width / 4 + 0.08,
    0.08,
    0.08,
  ).material = metal(palette.gold);
  return sign;
}
