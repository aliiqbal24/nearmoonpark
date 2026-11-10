import * as T from "three";
import {
  SCALE,
  artSegments,
  palette,
  box,
  sphere,
  cylinder,
  ring,
  material,
  metal,
  glow,
  label,
  batch,
  batchStatic,
  shapedBox,
  ellipsoid,
  surface,
  glass,
  line,
  arch,
} from "./art-kit";
import {
  pressureGarden,
  resortBench,
  lantern,
  vault,
  marquee,
} from "./resort-props";
import { WIDTH, HEIGHT, footprint, type Run } from "./model";

export function walkwayMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const p = canvas.getContext("2d")!;
  p.fillStyle = "#e5d5b7";
  p.fillRect(0, 0, 256, 256);
  p.fillStyle = "#d7c3a3";
  p.fillRect(5, 5, 246, 246);
  p.strokeStyle = "#f7ead0";
  p.lineWidth = 3;
  p.strokeRect(11, 11, 234, 234);
  p.strokeStyle = "#b89564";
  p.lineWidth = 2;
  p.strokeRect(5, 5, 246, 246);
  p.strokeStyle = "#cbb28d";
  p.lineWidth = 1;
  p.beginPath();
  p.moveTo(15, 128);
  p.lineTo(241, 128);
  p.stroke();
  for (let i = 0; i < 460; i++) {
    p.fillStyle = i % 3 ? "#c8b08a22" : "#fff6dc44";
    p.fillRect((i * 71.37) % 256, (i * 43.57) % 256, 1, 1);
  }
  for (const x of [18, 238])
    for (const y of [18, 238]) {
      p.fillStyle = "#ab8c60";
      p.beginPath();
      p.arc(x, y, 2, 0, Math.PI * 2);
      p.fill();
    }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  return new T.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.02,
  });
}

export function lunarTerrain(scene: T.Scene) {
  let seed = 90210;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const craters = [
    { x: -54, z: -48, r: 33, depth: 3.8, rim: 2.0 },
    { x: 49, z: -52, r: 27, depth: 3.3, rim: 1.7 },
    { x: -13, z: -119, r: 46, depth: 5.4, rim: 2.7 },
    { x: 67, z: 41, r: 25, depth: 2.8, rim: 1.5 },
    { x: -65, z: 44, r: 29, depth: 3.1, rim: 1.6 },
    { x: -119, z: -13, r: 38, depth: 4.4, rim: 2.3 },
    ...Array.from({ length: 18 }, () => ({
      x: (random() - 0.5) * 310,
      z: -24 - random() * 230,
      r: 3 + random() * 8,
      depth: 0.4 + random() * 0.7,
      rim: 0.2 + random() * 0.3,
    })),
  ];
  const heightAt = (x: number, z: number) => {
    const clearance = Math.max(Math.abs(x) - 23, -19 - z, z - 30, 0);
    const edge = T.MathUtils.smoothstep(clearance, 0, 12);
    const distance = Math.hypot(x, z);
    const distant = T.MathUtils.smoothstep(distance, 100, 380);
    let y =
      distant *
      (6 +
        Math.sin(x * 0.013 + z * 0.006) * 7 +
        Math.cos(z * 0.017 - x * 0.004) * 5);
    y +=
      edge *
      (Math.sin(x * 0.061 + z * 0.027) * 0.25 + Math.cos(z * 0.09) * 0.2);
    let bowl = 0,
      rim = 0;
    for (const crater of craters) {
      const angle = Math.atan2(z - crater.z, x - crater.x);
      const broken =
        1 +
        Math.sin(angle * 3 + crater.x) * 0.05 +
        Math.cos(angle * 7 + crater.z) * 0.025;
      const u = Math.hypot(x - crater.x, z - crater.z) / (crater.r * broken);
      if (u > 1.7) continue;
      bowl = Math.min(
        bowl,
        -crater.depth * Math.pow(Math.max(0, 1 - u * u), 1.7),
      );
      const lip =
        crater.rim *
        Math.exp(-Math.pow((u - 1) / 0.2, 2)) *
        (0.8 + Math.sin(angle * 5) * 0.13 + Math.cos(angle * 9) * 0.07);
      rim = Math.max(rim, lip);
    }
    y += edge * (bowl + rim);
    const observatoryPad = T.MathUtils.smoothstep(
      Math.hypot(x - 29, z + 14),
      4.5,
      10,
    );
    return y * observatoryPad;
  };
  const geometry = new T.PlaneGeometry(
    2400,
    2400,
    artSegments(320, 180),
    artSegments(320, 180),
  );
  const vertices = geometry.attributes.position,
    colors = new Float32Array(vertices.count * 3),
    color = new T.Color();
  const coordinate = (value: number) => {
    const u = Math.abs(value) / 1200;
    return (
      Math.sign(value) *
      (u <= 0.78
        ? (u / 0.78) * 145
        : 145 + Math.pow((u - 0.78) / 0.22, 1.4) * 1055)
    );
  };
  const low = new T.Color("#7c8690"),
    high = new T.Color("#c0b6a0");
  for (let i = 0; i < vertices.count; i++) {
    const x = coordinate(vertices.getX(i)),
      z = -coordinate(vertices.getY(i)),
      y = heightAt(x, z);
    vertices.setXYZ(i, x, -z, y);
    color
      .copy(low)
      .lerp(
        high,
        T.MathUtils.clamp(
          0.27 + y * 0.045 + Math.sin(x * 0.07 + z * 0.03) * 0.07,
          0,
          0.85,
        ),
      );
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const map = new T.TextureLoader().load("/art/lunar-regolith-v2.webp");
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(150, 150);
  map.anisotropy = 8;
  const terrain = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({
      color: "#e5e2db",
      map,
      vertexColors: true,
      roughness: 0.99,
      metalness: 0,
    }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.2;
  terrain.receiveShadow = true;
  scene.add(terrain);
  const deck = new T.Group();
  shapedBox(
    deck,
    "#596c71",
    0,
    -0.07,
    0,
    WIDTH * SCALE + 0.55,
    0.25,
    HEIGHT * SCALE + 0.55,
    0.28,
  );
  const floorMap = new T.TextureLoader().load("/art/lunar-regolith-v2.webp");
  floorMap.colorSpace = T.SRGBColorSpace;
  floorMap.wrapS = floorMap.wrapT = T.RepeatWrapping;
  floorMap.repeat.set(3.5, 2.6);
  const floor = shapedBox(
    deck,
    "#b8ac94",
    0,
    0.045,
    0,
    WIDTH * SCALE,
    0.07,
    HEIGHT * SCALE,
    0.23,
  );
  floor.material = new T.MeshStandardMaterial({
    color: "#c6baa1",
    map: floorMap,
    roughness: 0.95,
  });
  for (let x = -16; x <= 16; x += 4)
    for (let z = -12; z <= 12; z += 4) {
      box(deck, "#c6bea8", x * SCALE, 0.086, z * SCALE, 0.12, 0.006, 0.02);
      box(deck, "#c6bea8", x * SCALE, 0.087, z * SCALE, 0.02, 0.006, 0.12);
    }
  for (const z of [-15.28, 15.28]) {
    box(deck, palette.navy, 0, 0.16, z, 40.7, 0.2, 0.17);
    box(deck, palette.gold, 0, 0.28, z, 40.6, 0.035, 0.13).material = metal(
      palette.gold,
    );
    for (let x = -18; x <= 18; x += 6) {
      shapedBox(deck, palette.ivory, x, 0.28, z, 0.38, 0.4, 0.36, 0.08);
      box(
        deck,
        palette.mint,
        x,
        0.41,
        z + Math.sign(z) * 0.19,
        0.17,
        0.06,
        0.025,
      ).material = glow(palette.mint);
    }
  }
  for (const x of [-20.28, 20.28]) {
    box(deck, palette.navy, x, 0.16, 0, 0.17, 0.2, 30.6);
    box(deck, palette.gold, x, 0.28, 0, 0.13, 0.035, 30.6).material = metal(
      palette.gold,
    );
    for (let z = -12; z <= 12; z += 6) {
      shapedBox(deck, palette.ivory, x, 0.28, z, 0.36, 0.4, 0.38, 0.08);
      box(
        deck,
        palette.mint,
        x + Math.sign(x) * 0.19,
        0.41,
        z,
        0.025,
        0.06,
        0.17,
      ).material = glow(palette.mint);
    }
  }
  batch(deck);
  scene.add(deck);
  const rubble = new T.Group();
  for (let i = 0; i < 145; i++) {
    const cluster = Math.floor(i / 12),
      a = i * 2.3999;
    const centers = [
      [-31, -23],
      [32, -19],
      [-34, 18],
      [36, 24],
      [-29, -51],
      [45, -63],
      [-56, -31],
      [58, -2],
      [-43, 46],
      [29, 45],
      [-55, -92],
      [19, -66],
      [-76, 9],
    ];
    const center = centers[cluster % centers.length];
    const x = center[0] + Math.sin(a) * (2 + random() * 6),
      z = center[1] + Math.cos(a) * (2 + random() * 5);
    const r = i % 12 === 0 ? 1.3 + random() * 0.7 : 0.09 + random() ** 2 * 0.85;
    const geo = new T.DodecahedronGeometry(r, 0),
      position = geo.attributes.position;
    for (let j = 0; j < position.count; j++) {
      const n =
        0.85 + Math.sin(position.getX(j) * 11 + position.getZ(j) * 9) * 0.15;
      position.setXYZ(
        j,
        position.getX(j) * n,
        position.getY(j) * n,
        position.getZ(j) * n,
      );
    }
    geo.computeVertexNormals();
    const rock = new T.Mesh(
      geo,
      surface(["#8d969a", "#b8ad98", "#6c7a85", "#a8a69b"][i % 4], "stone"),
    );
    rock.position.set(x, heightAt(x, z) + r * 0.19 - 0.15, z);
    rock.scale.set(1.15, 0.46, 0.85);
    rock.rotation.y = random() * 6.28;
    rock.castShadow = true;
    rock.receiveShadow = true;
    rubble.add(rock);
  }
  batch(rubble);
  scene.add(rubble);
}

function padArtwork() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const p = canvas.getContext("2d")!;
  p.fillStyle = "#72858a";
  p.fillRect(0, 0, 1024, 1024);
  p.strokeStyle = "#d7c28b";
  p.lineWidth = 11;
  p.beginPath();
  p.arc(512, 512, 445, 0, Math.PI * 2);
  p.stroke();
  p.strokeStyle = "#f9eed4";
  p.lineWidth = 4;
  p.beginPath();
  p.arc(512, 512, 426, 0, Math.PI * 2);
  p.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    p.save();
    p.translate(512, 512);
    p.rotate(a);
    p.fillStyle = i % 2 ? "#e7b458" : "#213e47";
    p.fillRect(-10, -395, 20, 48);
    p.restore();
  }
  p.fillStyle = "#f5ead0";
  p.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2,
      r = i % 2 ? 40 : 135;
    const x = 512 + Math.cos(a) * r,
      y = 512 + Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  p.fill();
  p.fillStyle = "#233f47";
  p.beginPath();
  p.arc(512, 512, 33, 0, Math.PI * 2);
  p.fill();
  p.font = "700 22px sans-serif";
  p.textAlign = "center";
  p.fillStyle = "#d8e4dd";
  p.fillText("LUNAR TRANSIT  /  01", 512, 805);
  p.font = "600 15px sans-serif";
  p.fillText("A NEAR FUTURE", 512, 835);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

export function spaceport(scene: T.Scene) {
  const port = new T.Group();
  cylinder(port, palette.navy, 0, -0.02, 22, 4.64, 0.32);
  cylinder(port, "#a1afa7", 0, 0.13, 22, 4.44, 0.12);
  const surfaceMesh = new T.Mesh(
    new T.CircleGeometry(4.18, 96),
    new T.MeshStandardMaterial({
      map: padArtwork(),
      roughness: 0.72,
      metalness: 0.18,
    }),
  );
  surfaceMesh.rotation.x = -Math.PI / 2;
  surfaceMesh.position.set(0, 0.198, 22);
  surfaceMesh.receiveShadow = true;
  port.add(surfaceMesh);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const panel = new T.Mesh(
      new T.RingGeometry(4.21, 4.58, 8, 1, a + 0.018, Math.PI / 6 - 0.036),
      metal(i % 3 ? "#b9baa9" : palette.gold),
    );
    panel.rotation.x = -Math.PI / 2;
    panel.position.set(0, 0.22, 22);
    port.add(panel);
    const x = Math.sin(a) * 4.39,
      z = 22 + Math.cos(a) * 4.39;
    sphere(port, "#a8e5cd", x, 0.26, z, 0.065).material = glow("#93d7c0");
    const joint = box(
      port,
      palette.navy,
      Math.sin(a) * 4.55,
      0.06,
      22 + Math.cos(a) * 4.55,
      0.22,
      0.3,
      0.42,
    );
    joint.rotation.y = a;
  }
  // A paved forecourt connects the actual gate and shuttle boarding path.
  const plaza = shapedBox(port, "#d6c5a3", 0, 0.06, 17.7, 12.4, 0.17, 6.8, 1.0);
  plaza.material = surface("#d6c5a3", "stone");
  cylinder(port, "#87b9b0", 0, 0.16, 17.7, 1.8, 0.02);
  ring(port, palette.gold, 1.77, 0.025, 0, 0.18, 17.7).material = metal(
    palette.gold,
  );
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const mark = box(
      port,
      palette.ivory,
      Math.sin(a) * 0.93,
      0.18,
      17.7 + Math.cos(a) * 0.93,
      0.065,
      0.012,
      1.15,
    );
    mark.rotation.y = a;
  }
  const gate = new T.Group();
  gate.position.set(-0.6, 0, 15.05);
  for (const x of [-2.45, 2.45]) {
    shapedBox(gate, palette.navy, x, 0.48, 0, 0.64, 0.86, 1.0, 0.14);
    shapedBox(gate, palette.ivory, x, 1.83, 0, 0.45, 2.66, 0.8, 0.16);
    box(gate, palette.gold, x, 1.85, 0.43, 0.095, 2.3, 0.035).material = metal(
      palette.gold,
    );
    box(gate, palette.mint, x, 1.85, 0.465, 0.032, 1.9, 0.018).material = glow(
      palette.mint,
    );
    sphere(gate, palette.gold, x, 3.19, 0, 0.19).material = metal(palette.gold);
  }
  vault(gate, palette.navy, 5.35, 1.47, 1.1, 2.98);
  const rim = arch(gate, palette.gold, 2.67, 2.98, 0.6, 0.065);
  rim.scale.y = 1.47 / 2.67;
  rim.position.y = 2.98 * (1 - rim.scale.y);
  rim.material = metal(palette.gold);
  shapedBox(gate, palette.navy, 0, 3.59, 0.56, 4.1, 0.94, 0.14, 0.4);
  const sign = label("M O O N P A R K", palette.ivory, 3.86);
  sign.name = "park-gate-sign";
  sign.position.set(0, 3.62, 0.66);
  gate.add(sign);
  ellipsoid(gate, "#f3dca5", 0, 4.52, 0.1, 0.3, 0.26, 0.1);
  ring(gate, palette.gold, 0.43, 0.026, 0, 4.51, 0.12, false).scale.y = 0.5;
  port.add(gate);
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 5.25, 0, 16.55);
    shapedBox(wing, palette.navy, 0, 0.35, 0, 4.15, 0.42, 2.76, 0.55);
    shapedBox(wing, palette.ivory, 0, 0.57, 0, 4.0, 0.17, 2.67, 0.45);
    const roof = new T.Mesh(
      new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
    );
    roof.scale.set(1.94, 1.83, 1.27);
    roof.position.y = 0.67;
    wing.add(roof);
    for (const z of [-1.05, -0.5, 0, 0.5, 1.05]) {
      const arc = arch(wing, palette.gold, 1.94, 0.67, z, 0.035);
      arc.scale.y = 1.83 / 1.94;
      arc.position.y = 0.67 * (1 - arc.scale.y);
      arc.material = metal(palette.gold);
    }
    for (const x of [-1.2, -0.4, 0.45, 1.2])
      pressureGarden(wing, x, -0.1, 0.31, 0.62);
    const name = label(
      side < 0 ? "EARTHRISE GARDENS" : "NEAR LUNAR TRANSIT",
      palette.ivory,
      2.72,
    );
    name.position.set(0, 0.8, 1.38);
    wing.add(name);
    for (const x of [-1.6, 1.6]) {
      box(wing, palette.ivory, x, 0.9, 1.16, 0.08, 0.8, 0.12);
      sphere(wing, "#ffdb9c", x, 1.31, 1.16, 0.075).material = glow("#ffdb9c");
    }
    port.add(wing);
    resortBench(port, side * 3.8, 19.3, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    pressureGarden(port, side * 6.7, 20.3, 0.68, 1.08);
    pressureGarden(port, side * 3.0, 16.7, 0.44, 0.68);
    lantern(port, side * 5.8, 18.65, 1.47);
    lantern(port, side * 2.0, 20.4, 1.12);
    const caseGroup = new T.Group();
    caseGroup.position.set(side * 3.5, 0, 17.75);
    shapedBox(caseGroup, palette.coral, 0, 0.43, 0, 0.42, 0.54, 0.28, 0.075);
    ring(caseGroup, palette.gold, 0.07, 0.018, 0, 0.75, 0, false).scale.y = 0.7;
    box(caseGroup, palette.ivory, 0, 0.45, 0.15, 0.04, 0.42, 0.02);
    port.add(caseGroup);
  }
  const board = new T.Group();
  board.position.set(-3.5, 0, 20.1);
  for (const x of [-0.7, 0.7])
    cylinder(board, palette.gold, x, 0.84, 0, 0.035, 1.6).material = metal(
      palette.gold,
    );
  shapedBox(board, palette.navy, 0, 1.5, 0, 2.1, 1.0, 0.14, 0.15);
  const title = label("LUNAR TRANSIT / 01", palette.ivory, 1.92);
  title.position.set(0, 1.72, 0.09);
  board.add(title);
  const status = label("WELCOME ABOARD", palette.mint, 1.84);
  status.position.set(0, 1.35, 0.09);
  status.name = "port-status-sign";
  board.add(status);
  port.add(board);
  batchStatic(port);
  scene.add(port);
}

export function observatory(scene: T.Scene) {
  const g = new T.Group();
  g.position.set(29, 0, -14);
  cylinder(g, palette.navy, 0, 0.2, 0, 3.35, 0.5);
  cylinder(g, palette.ivory, 0, 1.15, 0, 2.85, 1.75);
  for (const y of [0.65, 1.9])
    ring(g, palette.gold, 2.87, 0.04, 0, y).material = metal(palette.gold);
  const dome = new T.Mesh(
    new T.SphereGeometry(2.84, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    material("#4f8994"),
  );
  dome.position.y = 2.02;
  dome.castShadow = true;
  g.add(dome);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const frame = new T.Group();
    frame.rotation.y = a;
    line(
      frame,
      [
        new T.Vector3(2.84, 2.02, 0),
        new T.Vector3(2.0, 4.03, 0),
        new T.Vector3(0, 4.86, 0),
      ],
      0.028,
      palette.gold,
      "metal",
    );
    g.add(frame);
    const pane = ellipsoid(
      g,
      "#a3d7db",
      Math.sin(a) * 2.865,
      1.33,
      Math.cos(a) * 2.865,
      0.39,
      0.38,
      0.035,
    );
    pane.rotation.y = a;
    pane.material = glass;
  }
  const slit = new T.Group();
  slit.rotation.z = -0.25;
  slit.position.set(0, 3.0, 0.7);
  shapedBox(slit, palette.navy, 0, 0, 0, 0.68, 1.44, 3.0, 0.2);
  g.add(slit);
  const telescope = new T.Group();
  telescope.position.set(0, 3.8, 0.65);
  telescope.rotation.x = -0.55;
  cylinder(telescope, palette.ivory, 0, 0, 0, 0.34, 1.55);
  ring(telescope, palette.gold, 0.36, 0.04, 0, 0.73).material = metal(
    palette.gold,
  );
  cylinder(telescope, palette.navy, 0, 0.8, 0, 0.28, 0.06);
  g.add(telescope);
  marquee(g, "A NEAR FUTURE", palette.ivory, 3.5, 2.03, 2.9);
  for (let i = 0; i < 5; i++)
    shapedBox(
      g,
      palette.ivory,
      0,
      0.12 + i * 0.08,
      3.25 - i * 0.22,
      1.35,
      0.14,
      0.4,
      0.04,
    );
  pressureGarden(g, -3.6, 2.2, 0.63, 0.85);
  lantern(g, 2.2, 3.2, 1.35);
  batch(g);
  scene.add(g);
}

/** Decorative amenities follow the existing path and leave build cells usable. */
export function pathAmenities(run: Run) {
  const g = new T.Group(),
    paths = new Set(run.paths);
  const occupied = (cell: number) =>
    run.buildings.some((b) => {
      const f = footprint(b),
        x = cell % WIDTH,
        z = Math.floor(cell / WIDTH);
      return !b.sold && x >= b.x && x < b.x + f.w && z >= b.z && z < b.z + f.h;
    });
  const used = new Set<number>();
  for (let i = 0; i < run.paths.length && used.size < 22; i += 6) {
    const cell = run.paths[i],
      x = cell % WIDTH,
      z = Math.floor(cell / WIDTH);
    for (const side of [-1, 1]) {
      const neighbor = cell + side * WIDTH;
      if (
        z + side < 1 ||
        z + side >= HEIGHT - 1 ||
        paths.has(neighbor) ||
        occupied(neighbor) ||
        used.has(neighbor)
      )
        continue;
      const px = (x + 0.5 - WIDTH / 2) * SCALE,
        pz = (z + side + 0.5 - HEIGHT / 2) * SCALE;
      if (i % 18 === 0) {
        const bench = resortBench(g, px, pz, side > 0 ? 0 : Math.PI);
        bench.scale.setScalar(0.65);
      } else pressureGarden(g, px, pz, 0.34, 0.5);
      used.add(neighbor);
      break;
    }
  }
  batchStatic(g);
  return g;
}
