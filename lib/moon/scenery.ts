import * as T from "three";
import {
  SCALE,
  palette,
  box,
  sphere,
  cylinder,
  beam,
  ring,
  material,
  glow,
  label,
  batch,
} from "./assets";
import { WIDTH, HEIGHT } from "./model";

export function walkwayMaterial() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d6cdb5";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#b1aa9b";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeStyle = "#eee4cc";
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, 238, 238);
  for (const x of [20, 236])
    for (const y of [20, 236]) {
      ctx.fillStyle = "#8e9692";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.fillStyle = "#bcb5a3";
  for (let i = 0; i < 300; i++)
    ctx.fillRect((i * 71.3) % 256, (i * 23.7) % 256, 1, 1);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return new T.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.12 });
}

export function lunarTerrain(scene: T.Scene) {
  const bump = new T.Texture(),
    dust = new T.Texture();
  const map = new T.TextureLoader().load("/art/lunar-regolith-v1.webp", () => {
    bump.needsUpdate = true;
    dust.needsUpdate = true;
  });
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(100, 100);
  map.anisotropy = 8;
  for (const texture of [bump, dust]) {
    texture.source = map.source;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 8;
  }
  bump.repeat.copy(map.repeat);
  bump.colorSpace = T.NoColorSpace;
  const terrainMaterial = new T.MeshStandardMaterial({
    color: "#929ca1",
    map,
    bumpMap: bump,
    bumpScale: 0.06,
    roughness: 0.98,
  });
  const ground = new T.Mesh(
    new T.PlaneGeometry(1800, 1800, 256, 256),
    terrainMaterial,
  );
  let seed = 90210;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const craters = Array.from({ length: 26 }, () => ({
    x: (rand() - 0.5) * 280,
    z: -25 - rand() * 200,
    r: 4 + rand() * 18,
  }));
  const vertices = ground.geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = -vertices.getY(i),
      d = Math.hypot(x, z);
    const hills = T.MathUtils.smoothstep(d, 55, 180);
    let height =
      hills *
      (4 +
        Math.sin(x * 0.024) * Math.cos(z * 0.017) * 8 +
        Math.sin(x * 0.047 + z * 0.019) * 3);
    for (const crater of craters) {
      const u = Math.hypot(x - crater.x, z - crater.z) / crater.r;
      height +=
        hills *
        crater.r *
        (0.13 * Math.exp(-Math.pow((u - 1) * 5, 2)) -
          0.13 * Math.exp(-u * u * 3));
    }
    vertices.setZ(i, height);
  }
  ground.geometry.computeVertexNormals();
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.22;
  ground.receiveShadow = true;
  scene.add(ground);

  const deck = new T.Group();
  box(
    deck,
    palette.navy,
    0,
    -0.07,
    0,
    WIDTH * SCALE + 0.8,
    0.25,
    HEIGHT * SCALE + 0.8,
  );
  dust.colorSpace = T.SRGBColorSpace;
  dust.repeat.set(4.5, 3.5);
  const floor = box(
    deck,
    "#899692",
    0,
    0.04,
    0,
    WIDTH * SCALE,
    0.08,
    HEIGHT * SCALE,
  );
  floor.material = new T.MeshStandardMaterial({
    color: "#929c95",
    map: dust,
    roughness: 0.92,
  });
  // Plot markers sit flush with the ground and stay subtle outside build mode.
  for (let x = -16; x <= 16; x += 4)
    for (let z = -12; z <= 12; z += 4) {
      box(deck, "#c3c9b3", x * SCALE, 0.089, z * SCALE, 0.16, 0.008, 0.025);
      box(deck, "#c3c9b3", x * SCALE, 0.089, z * SCALE, 0.025, 0.008, 0.16);
    }
  for (const z of [-15.45, 15.45]) {
    box(deck, palette.steel, 0, 0.12, z, 40.9, 0.15, 0.18);
    box(deck, palette.navy, 0, 0.16, z, 40.7, 0.06, 0.06);
    for (let x = -20; x <= 20; x += 4) {
      box(deck, palette.ivory, x, 0.3, z, 0.5, 0.45, 0.5);
      box(deck, palette.navy, x, 0.5, z, 0.4, 0.1, 0.4);
      sphere(deck, "#ffe1a4", x, 0.62, z, 0.09).material = glow("#ffe1a4");
    }
  }
  for (const x of [-20.45, 20.45]) {
    box(deck, palette.steel, x, 0.12, 0, 0.18, 0.15, 30.9);
    for (let z = -12; z <= 12; z += 4) {
      box(deck, palette.ivory, x, 0.3, z, 0.5, 0.45, 0.5);
      sphere(deck, palette.mint, x, 0.62, z, 0.09).material = glow(
        palette.mint,
      );
    }
  }
  batch(deck);
  scene.add(deck);

  const rocks = new T.Group();
  const stone = ["#69767d", "#949e9e"].map(
    (color) =>
      new T.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
  );
  for (let i = 0; i < 240; i++) {
    const x = (rand() - 0.5) * 170,
      z = (rand() - 0.5) * 155;
    if (Math.abs(x) < 23 && z > -19 && z < 29) continue;
    const r = 0.12 + rand() ** 3 * 1.8;
    const geo = new T.IcosahedronGeometry(r, 1);
    const v = geo.attributes.position;
    for (let j = 0; j < v.count; j++) {
      const n = 0.88 + Math.sin(v.getX(j) * 23 + v.getZ(j) * 17) * 0.12;
      v.setXYZ(j, v.getX(j) * n, v.getY(j) * n, v.getZ(j) * n);
    }
    geo.computeVertexNormals();
    const rock = new T.Mesh(geo, stone[i % 2]);
    rock.position.set(x, r * 0.12 - 0.15, z);
    rock.scale.y = 0.55;
    rock.rotation.set(rand(), rand() * 6, rand());
    rock.castShadow = true;
    rocks.add(rock);
  }
  batch(rocks);
  scene.add(rocks);
}

function bench(g: T.Object3D, x: number, z: number, rotation: number) {
  const b = new T.Group();
  b.position.set(x, 0.12, z);
  b.rotation.y = rotation;
  for (const dx of [-0.55, 0.55])
    box(b, palette.navy, dx, 0.22, 0, 0.08, 0.4, 0.45);
  for (let i = 0; i < 3; i++)
    box(b, palette.ivory, 0, 0.44, (i - 1) * 0.13, 1.4, 0.08, 0.1);
  box(b, palette.mint, 0, 0.7, -0.22, 1.4, 0.25, 0.06);
  g.add(b);
}

export function spaceport(scene: T.Scene) {
  const port = new T.Group();
  cylinder(port, palette.navy, 0, -0.02, 22, 4.4, 0.25);
  cylinder(port, "#61747b", 0, 0.12, 22, 4.1, 0.08);
  ring(port, palette.ivory, 3.65, 0.055, 0, 0.18, 22);
  ring(port, palette.mint, 3.98, 0.05, 0, 0.18, 22).material = glow(
    palette.mint,
  );
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      x = Math.sin(a) * 3.25,
      z = 22 + Math.cos(a) * 3.25;
    const stripe = box(
      port,
      i % 2 ? palette.gold : palette.navy,
      x,
      0.18,
      z,
      0.24,
      0.015,
      0.5,
    );
    stripe.rotation.y = a;
    sphere(
      port,
      palette.gold,
      Math.sin(a) * 4.2,
      0.22,
      22 + Math.cos(a) * 4.2,
      0.06,
    ).material = glow(palette.gold);
  }
  box(port, palette.ivory, 0, 0.19, 22, 1.2, 0.025, 0.14);
  box(port, palette.ivory, 0, 0.19, 22, 0.14, 0.025, 1.2);
  for (const x of [-2.65, 2.65]) {
    cylinder(port, palette.navy, x, 0.55, 17.5, 0.22, 0.8);
    cylinder(port, palette.ivory, x, 0.9, 17.5, 0.27, 0.12);
    sphere(port, palette.gold, x, 1.05, 17.5, 0.12).material = glow(
      palette.gold,
    );
  }
  const gate = new T.Group();
  gate.position.set(-0.6, 0, 15.1);
  for (const x of [-1.85, 1.85]) {
    box(gate, palette.navy, x, 0.35, 0, 0.65, 0.7, 0.8);
    box(gate, palette.ivory, x, 1.65, 0, 0.38, 2.7, 0.5);
    box(gate, palette.mint, x, 1.75, 0.29, 0.12, 2.2, 0.045).material = glow(
      palette.mint,
    );
    sphere(gate, palette.gold, x, 3.2, 0, 0.16);
  }
  box(gate, palette.ivory, 0, 2.95, 0, 4.6, 0.68, 0.52);
  box(gate, palette.navy, 0, 2.97, 0.29, 4.35, 0.47, 0.09);
  const sign = label("M O O N P A R K", "#fce3ab", 4.1);
  sign.name = "park-gate-sign";
  sign.scale.y *= 0.5;
  sign.position.set(0, 2.98, 0.36);
  gate.add(sign);
  port.add(gate);
  bench(port, -4.2, 16.7, Math.PI / 2);
  bench(port, 4.2, 16.7, -Math.PI / 2);
  for (const x of [-5.5, 5.5]) {
    cylinder(port, palette.navy, x, 0.45, 15.7, 0.23, 0.65);
    cylinder(port, palette.mint, x, 0.8, 15.7, 0.26, 0.1);
  }
  for (let z = 15; z < 21; z++)
    box(port, "#d3ceb9", 0, 0.12, z, 2.5, 0.08, 0.94);
  const board = label("01  /  LUNAR TRANSIT", "#9eead5", 2.4);
  board.position.set(-4.5, 1.8, 19.5);
  port.add(board);
  cylinder(port, palette.steel, -4.5, 0.9, 19.5, 0.06, 1.8);
  batch(port);
  scene.add(port);
}

export function observatory(scene: T.Scene) {
  const g = new T.Group();
  g.position.set(29, 0, -14);
  cylinder(g, palette.navy, 0, 0.15, 0, 3.5, 0.4);
  cylinder(g, palette.ivory, 0, 1.2, 0, 3, 2.1);
  ring(g, palette.steel, 3.02, 0.08, 0, 1.95);
  const dome = sphere(g, "#628b9c", 0, 2.1, 0, 3);
  dome.scale.y *= 0.65;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      g,
      palette.navy,
      Math.sin(a) * 2.93,
      1.3,
      Math.cos(a) * 2.93,
      0.3,
      0.65,
      0.08,
    ).rotation.y = a;
  }
  box(g, palette.navy, 0, 2.9, 0, 0.55, 1.7, 4.2);
  cylinder(g, palette.ivory, 0, 3.9, 0, 0.3, 0.7);
  const dish = new T.Mesh(
    new T.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.43),
    material(palette.ivory),
  );
  dish.position.set(0, 4.2, 0);
  dish.rotation.z = -0.5;
  g.add(dish);
  beam(
    g,
    new T.Vector3(0, 4.1, 0),
    new T.Vector3(-0.6, 5.4, 0),
    0.04,
    palette.navy,
  );
  sphere(g, palette.gold, -0.6, 5.4, 0, 0.12);
  const sign = label("A NEAR FUTURE", "#adf0df", 3.8);
  sign.position.set(0, 2.5, 3.1);
  g.add(sign);
  for (let i = 0; i < 4; i++) {
    box(g, palette.steel, 3.5, 0.3 + i * 0.08, 2.3 - i * 0.3, 1.4, 0.15, 0.3);
  }
  batch(g);
  scene.add(g);
}
