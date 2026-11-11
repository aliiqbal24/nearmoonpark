import * as T from "three";
import { NEAR_MARK_PATH } from "../near-brand";
import {
  SCALE,
  beam,
  palette,
  nearMark,
  box,
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
} from "./art-kit";
import {
  pressureGarden,
  equipmentPanel,
  windowPanel,
  safetyRail,
  resortBench,
  lantern,
  marquee,
} from "./resort-props";
export { lunarTerrain } from "./terrain";
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
  p.fillStyle = "#233f47";
  p.beginPath();
  p.arc(512, 512, 142, 0, Math.PI * 2);
  p.fill();
  p.save();
  p.translate(512 - 112, 512 - 112);
  p.scale(14, 14);
  p.fillStyle = "#efe2bd";
  p.fill(new Path2D(NEAR_MARK_PATH));
  p.restore();
  p.textAlign = "center";
  p.font = "800 52px sans-serif";
  p.fillStyle = "#fff0d7";
  p.fillText("NEAR PROTOCOL", 512, 808);
  p.font = "600 21px sans-serif";
  p.fillText("LUNAR TRANSIT / 01", 512, 846);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

export function spaceport(scene: T.Scene) {
  const port = new T.Group();
  cylinder(port, "#23313b", 0, -0.02, 22, 4.76, 0.32);
  cylinder(port, "#64747f", 0, 0.14, 22, 4.55, 0.14).material =
    metal("#64747f");
  const surfaceMesh = new T.Mesh(
    new T.CircleGeometry(4.2, 96),
    new T.MeshStandardMaterial({
      map: padArtwork(),
      roughness: 0.86,
      metalness: 0.24,
    }),
  );
  surfaceMesh.rotation.x = -Math.PI / 2;
  surfaceMesh.position.set(0, 0.221, 22);
  surfaceMesh.receiveShadow = true;
  port.add(surfaceMesh);
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const panel = new T.Mesh(
      new T.RingGeometry(4.22, 4.65, 5, 1, a + 0.012, Math.PI / 12 - 0.024),
      metal(i % 4 === 0 ? "#c49954" : "#7d919d"),
    );
    panel.rotation.x = -Math.PI / 2;
    panel.position.set(0, 0.24, 22);
    port.add(panel);
    const lamp = box(
      port,
      "#c3e7e9",
      Math.sin(a) * 4.5,
      0.27,
      22 + Math.cos(a) * 4.5,
      0.17,
      0.025,
      0.06,
    );
    lamp.rotation.y = a;
    lamp.material = glow(i % 6 === 0 ? "#e7a66b" : "#85cbd1");
  }
  const plaza = shapedBox(
    port,
    "#75838b",
    0,
    0.075,
    17.75,
    20.5,
    0.2,
    6.0,
    0.24,
  );
  plaza.material = surface("#75838b", "stone");
  for (const x of [-9.65, -3.45, 3.45, 9.65]) {
    box(port, "#182b37", x, 0.185, 17.75, 0.2, 0.012, 5.5);
    box(port, "#91dcd5", x, 0.2, 17.75, 0.035, 0.012, 4.4).material =
      glow("#91dcd5");
  }
  for (let x = -9; x <= 9; x += 1.5)
    box(port, "#475b68", x, 0.19, 17.75, 0.014, 0.012, 5.6);
  for (const z of [15.3, 16.5, 17.7, 18.9, 20.1])
    box(port, "#475b68", 0, 0.191, z, 19.8, 0.012, 0.012);
  const gate = new T.Group();
  gate.position.set(-0.6, 0, 15.1);
  for (const side of [-1, 1]) {
    shapedBox(gate, "#24333d", side * 2.7, 1.9, 0, 0.63, 3.7, 0.85, 0.08);
    shapedBox(
      gate,
      "#b0bfc5",
      side * 2.7,
      1.95,
      0.4,
      0.45,
      3.45,
      0.09,
      0.035,
    ).material = metal("#b0bfc5");
    box(gate, "#91e8d5", side * 2.7, 2.0, 0.47, 0.033, 2.7, 0.015).material =
      glow("#91e8d5");
    nearMark(gate, "#9be3d6", 0.34).position.set(side * 2.7, 0.72, 0.49);
    for (const y of [1.1, 2.2, 3.3])
      box(gate, "#334a59", side * 2.7, y, 0.46, 0.48, 0.025, 0.015);
  }
  shapedBox(gate, "#1a2934", 0, 3.78, 0, 6.05, 0.62, 1.05, 0.09);
  box(gate, "#a2b2ba", 0, 4.12, 0, 6.45, 0.09, 1.25).material =
    metal("#a2b2ba");
  box(gate, "#75dfcc", 0, 3.45, 0.49, 5.15, 0.025, 0.04).material =
    glow("#75dfcc");
  const title = label("M O O N P A R K", "#dee8e8", 3.8);
  title.position.set(0, 3.83, 0.54);
  title.scale.y *= 0.63;
  title.name = "park-gate-sign";
  gate.add(title);
  const protocol = label("NEAR PROTOCOL / LUNAR ARRIVALS", "#8edfcc", 4.3);
  protocol.position.set(0, 3.06, 0.14);
  protocol.scale.y *= 0.3;
  gate.add(protocol);
  port.add(gate);
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 6.3, 0, 16.95);
    shapedBox(wing, "#1a2a35", 0, 0.38, 0, 5.8, 0.45, 3.3, 0.1);
    shapedBox(wing, "#405763", 0, 1.75, -1.25, 5.6, 2.5, 0.65, 0.13);
    shapedBox(wing, "#b5c3c9", 0, 3.05, 0, 6.08, 0.22, 3.65, 0.12).material =
      metal("#b5c3c9");
    shapedBox(wing, "#243a48", 0, 3.2, 0, 5.6, 0.13, 3.25, 0.06);
    box(wing, "#8bdad2", 0, 2.91, 1.78, 5.7, 0.025, 0.025).material =
      glow("#8bdad2");
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 0.91;
      const pane = windowPanel(wing, 0.85, 2.08, i % 3 !== 1);
      pane.position.set(x, 1.71, 1.54);
      box(wing, "#c5cecf", x, 0.72, 1.61, 0.84, 0.12, 0.08).material =
        metal("#c5cecf");
    }
    for (const x of [-2.8, 2.8]) {
      const pane = windowPanel(wing, 2.6, 2.08, false);
      pane.position.set(x, 1.71, 0);
      pane.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    for (const x of [-1.65, 0, 1.65]) {
      const unit = equipmentPanel(wing, 0.9, 0.45);
      unit.position.set(x, 3.3, -0.15);
      unit.rotation.x = -Math.PI / 2;
      box(wing, "#647b87", x, 3.25, -0.7, 1.05, 0.12, 0.52).material =
        metal("#647b87");
      pressureGarden(wing, x, -0.05, 0.39, 1.1);
    }
    const name = label(
      side < 0 ? "NEAR / ARRIVALS" : "EARTHRISE LOUNGE",
      "#d9e7e8",
      3.2,
    );
    name.position.set(0, 3.18, 1.84);
    name.scale.y *= 0.55;
    wing.add(name);
    port.add(wing);
    const rail = safetyRail(port, 3.0);
    rail.position.set(side * 8.1, 0.2, 19.8);
    resortBench(
      port,
      side * 4.0,
      18.9,
      side < 0 ? Math.PI / 2 : -Math.PI / 2,
      "#4b6b76",
    );
    pressureGarden(port, side * 10.4, 18.4, 0.62, 1.55);
    lantern(port, side * 10.1, 20.0, 2.65);
  }
  const gantry = new T.Group();
  gantry.position.set(-5.8, 0, 24.9);
  for (const x of [-0.65, 0.65])
    for (const z of [-0.65, 0.65])
      box(gantry, "#8397a3", x, 4.3, z, 0.17, 8.6, 0.17).material =
        metal("#8397a3");
  for (let level = 0; level < 7; level++) {
    const y = 0.4 + level * 1.22;
    shapedBox(gantry, "#334855", 0, y, 0, 1.62, 0.12, 1.62, 0.025);
    const rail = safetyRail(gantry, 1.57);
    rail.position.set(0, y, 0.78);
    for (const side of [-1, 1]) {
      beam(
        gantry,
        new T.Vector3(-0.6, y, -0.65 * side),
        new T.Vector3(0.6, y + 1.2, -0.65 * side),
        0.045,
        "#627d8e",
      ).material = metal("#627d8e");
      beam(
        gantry,
        new T.Vector3(0.6, y, -0.65 * side),
        new T.Vector3(-0.6, y + 1.2, -0.65 * side),
        0.045,
        "#627d8e",
      ).material = metal("#627d8e");
    }
  }
  box(gantry, "#526e80", 1.2, 6.2, 0, 3.0, 0.2, 0.6).material =
    metal("#526e80");
  const gantryBrand = label("NEAR", "#a5ead8", 1.36);
  gantryBrand.position.set(0, 7.1, 0.84);
  gantry.add(gantryBrand);
  nearMark(gantry, "#a0e8d9", 0.73).position.set(0, 8.0, 0.85);
  port.add(gantry);
  for (let i = 0; i < 3; i++) {
    const tank = new T.Group();
    tank.position.set(-9.2 - i * 1.4, 0, 24.7);
    cylinder(tank, "#92a1ab", 0, 1.5, 0, 0.48, 2.6).material = metal("#92a1ab");
    ellipsoid(tank, "#92a1ab", 0, 2.8, 0, 0.48, 0.42, 0.48).material =
      metal("#92a1ab");
    for (const y of [0.45, 2.5]) ring(tank, "#2b4354", 0.49, 0.065, 0, y);
    const plate = label(i === 0 ? "O₂" : "HE", "#b8d6dd", 0.52);
    plate.position.set(0, 1.6, 0.49);
    tank.add(plate);
    port.add(tank);
  }
  const board = new T.Group();
  board.position.set(3.4, 0, 20.0);
  shapedBox(board, "#263e4d", 0, 1.0, 0, 0.22, 1.8, 0.22, 0.04);
  shapedBox(board, "#0e202c", 0, 1.75, 0, 2.05, 0.9, 0.16, 0.045);
  const boardTitle = label("NEAR LUNAR TRANSIT", "#bad9df", 1.9);
  boardTitle.position.set(0, 1.97, 0.09);
  boardTitle.scale.y *= 0.62;
  board.add(boardTitle);
  const status = label("ON APPROACH", "#8ee0c9", 1.84);
  status.position.set(0, 1.57, 0.09);
  status.scale.y *= 0.7;
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
