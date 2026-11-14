import * as T from "three";
import { NEAR_MARK_PATH } from "../near-brand";
import {
  SCALE,
  beam,
  nearMark,
  box,
  cylinder,
  ring,
  metal,
  glow,
  label,
  batchStatic,
  shapedBox,
  ellipsoid,
  surface,
  line,
} from "./art-kit";
import {
  pressureGarden,
  equipmentPanel,
  windowPanel,
  safetyRail,
  resortBench,
  lantern,
} from "./resort-props";
export { lunarTerrain } from "./terrain";
import {
  parkWidth,
  parkHeight,
  parkOriginZ,
  footprint,
  type Run,
} from "./model";

export function walkwayMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const p = canvas.getContext("2d")!;
  p.fillStyle = "#d9dfd3";
  p.fillRect(0, 0, 256, 256);
  const plate = p.createLinearGradient(0, 0, 256, 256);
  plate.addColorStop(0, "#e6e8da");
  plate.addColorStop(1, "#c2ceca");
  p.fillStyle = plate;
  p.fillRect(3, 3, 250, 250);
  p.strokeStyle = "#506b71";
  p.lineWidth = 2;
  p.strokeRect(1, 1, 254, 254);
  p.strokeStyle = "#f4f3df";
  p.lineWidth = 2;
  p.strokeRect(7, 7, 242, 242);
  for (const y of [85, 170]) {
    p.strokeStyle = "#8fa29e";
    p.lineWidth = 1;
    p.beginPath();
    p.moveTo(6, y);
    p.lineTo(250, y);
    p.stroke();
    p.fillStyle = "#f0f1df";
    p.fillRect(6, y + 1, 244, 1);
  }
  for (const x of [13, 243])
    for (const y of [13, 243]) {
      p.fillStyle = "#597378";
      p.beginPath();
      p.arc(x, y, 2, 0, Math.PI * 2);
      p.fill();
    }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  return new T.MeshStandardMaterial({
    map: texture,
    roughness: 0.66,
    metalness: 0.18,
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
    wing.name =
      side < 0 ? "near-arrivals-pavilion" : "earthrise-transit-lounge";
    wing.position.set(side * 6.9, 0, 17.5);
    shapedBox(wing, "#1a3039", 0, 0.36, 0, 6.2, 0.5, 4.0, 0.24);
    shapedBox(wing, "#d1d5c6", 0, 0.66, 0.15, 6.3, 0.16, 4.2, 0.13);
    shapedBox(wing, "#286b69", 0, 1.97, -1.58, 5.9, 2.5, 0.6, 0.16);
    for (const x of [-2.65, -1.3, 0, 1.3, 2.65]) {
      const window = windowPanel(wing, 1.2, 2.25, side < 0 || x > 0);
      window.position.set(x, 1.9, 1.64);
      box(wing, "#b49462", x - 0.61, 1.98, 1.94, 0.045, 2.6, 0.4).material =
        metal("#b49462");
    }
    for (const x of [-2.9, 2.9]) {
      const window = windowPanel(wing, 2.7, 2.26, false);
      window.position.set(x, 1.9, 0);
      window.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      beam(
        wing,
        new T.Vector3(x * 1.08, 0.7, 1.65),
        new T.Vector3(x * 1.12, 3.45, 0.6),
        0.09,
        "#d5d9cc",
      );
    }
    // Deep butterfly roofs, a copper fascia and coffered soffits replace the plain vaults.
    for (const roofSide of [-1, 1]) {
      const roof = new T.Group();
      roof.position.set(roofSide * 1.64, 3.45, 0.05);
      roof.rotation.z = roofSide * 0.1;
      shapedBox(roof, "#dedfcf", 0, 0, 0, 3.65, 0.24, 5.0, 0.12);
      box(roof, "#b69765", 0, -0.025, 2.48, 3.65, 0.16, 0.055).material =
        metal("#b69765");
      for (const x of [-1.25, -0.4, 0.4, 1.25])
        box(roof, "#71867d", x, -0.14, 0, 0.08, 0.08, 4.7);
      box(roof, "#b5c4a9", 0, -0.15, 1.85, 3.15, 0.025, 0.045).material =
        glow("#9cba9f");
      for (const x of [-0.9, 0.65]) {
        const panel = equipmentPanel(roof, 1.15, 1.7);
        panel.position.set(x, 0.2, -0.6);
        panel.rotation.x = -Math.PI / 2;
      }
      wing.add(roof);
    }
    shapedBox(wing, "#d7d9c9", 0, 3.03, 0.2, 6.15, 0.16, 3.8, 0.1);
    const name = label(
      side < 0 ? "NEAR / ARRIVALS" : "EARTHRISE LOUNGE",
      "#d8dbc4",
      4.0,
    );
    name.position.set(0, 3.16, 2.04);
    name.scale.y *= 0.5;
    wing.add(name);
    nearMark(wing, "#c9ab71", 0.55).position.set(side * 2.45, 0.89, 1.95);
    if (side > 0) {
      const tower = new T.Group();
      tower.position.set(2.55, 0, -0.85);
      shapedBox(tower, "#214b50", 0, 3.1, 0, 1.75, 5.6, 2.1, 0.25);
      for (const y of [3.9, 5.35]) {
        shapedBox(tower, "#d2d6c8", 0, y + 0.6, 0, 2.25, 0.18, 2.6, 0.1);
        const pane = windowPanel(tower, 1.88, 1.0, false);
        pane.position.set(0, y, 1.28);
        for (const x of [-1.03, 1.03]) {
          const sideWindow = windowPanel(tower, 2.2, 1.0, false);
          sideWindow.position.set(x, y, 0);
          sideWindow.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
      cylinder(tower, "#9d8865", 0, 6.5, 0, 0.045, 1.2).material =
        metal("#9d8865");
      ellipsoid(tower, "#c6d7bf", 0, 7.13, 0, 0.12, 0.12, 0.12).material =
        glow("#a2b38e");
      wing.add(tower);
    }
    port.add(wing);
    const rail = safetyRail(port, 3.0);
    rail.position.set(side * 8.1, 0.2, 19.8);
    resortBench(
      port,
      side * 4.0,
      18.9,
      side < 0 ? Math.PI / 2 : -Math.PI / 2,
      "#9a7356",
    );
    pressureGarden(port, side * 11.2, 18.4, 0.62, 1.55);
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
  g.name = "near-lunar-observatory";
  g.position.set(37, 0, -30);
  cylinder(g, "#1c303a", 0, 0.26, 0, 4.15, 0.52);
  cylinder(g, "#a5afa6", 0, 0.64, 0, 3.72, 0.28);
  cylinder(g, "#d3d7c9", 0, 1.85, 0, 3.12, 2.3);
  for (const y of [0.83, 2.9])
    ring(g, "#b99b69", 3.18, 0.075, 0, y).material = metal("#b99b69");
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const panel = new T.Group();
    panel.rotation.y = a;
    panel.position.set(Math.sin(a) * 3.13, 1.82, Math.cos(a) * 3.13);
    const pane = windowPanel(panel, 1.32, 1.35, i % 3 === 0);
    pane.position.z = 0.03;
    box(panel, "#6f8a83", -0.75, 0, 0.05, 0.055, 1.82, 0.16);
    g.add(panel);
  }
  cylinder(g, "#233b43", 0, 3.05, 0, 3.24, 0.24);
  for (const side of [0, 1]) {
    const dome = new T.Mesh(
      new T.SphereGeometry(
        3.19,
        48,
        24,
        Math.PI / 2 + 0.23 + side * Math.PI,
        Math.PI - 0.46,
        0,
        Math.PI / 2,
      ),
      surface("#d9dbcd"),
    );
    dome.position.y = 3.17;
    dome.castShadow = true;
    g.add(dome);
    const frame = new T.Group();
    frame.rotation.y = side * Math.PI;
    for (const x of [-0.71, 0.71])
      line(
        frame,
        [
          new T.Vector3(x, 3.18, 3.1),
          new T.Vector3(x * 0.8, 5.2, 2.3),
          new T.Vector3(x * 0.3, 6.28, 0),
        ],
        0.065,
        "#b99b69",
        "metal",
      );
    g.add(frame);
  }
  const mount = new T.Group();
  mount.position.set(0, 4.7, 0.25);
  cylinder(mount, "#254e57", 0, -0.7, 0, 0.6, 1.5);
  for (const x of [-0.68, 0.68])
    box(mount, "#aebbb2", x, 0.08, 0, 0.2, 1.2, 0.7);
  const scope = new T.Group();
  scope.rotation.x = 0.85;
  cylinder(scope, "#1c303a", 0, 0.45, 0, 0.55, 2.4);
  cylinder(scope, "#cbd3c5", 0, 0.55, 0, 0.59, 1.8);
  for (const y of [-0.5, 0.1, 1.2, 1.7])
    ring(scope, "#b19564", 0.6, 0.055, 0, y).material = metal("#b19564");
  cylinder(scope, "#1a3845", 0, 1.76, 0, 0.53, 0.12).material =
    metal("#244e60");
  cylinder(scope, "#2f7189", 0, 1.83, 0, 0.43, 0.025).material =
    metal("#2f7189");
  mount.add(scope);
  g.add(mount);
  const name = label("NEAR / DEEP SPACE OBSERVATORY", "#e0cfaa", 4.4);
  name.position.set(0, 3.05, 3.36);
  name.scale.y *= 0.5;
  g.add(name);
  for (let i = 0; i < 6; i++)
    shapedBox(
      g,
      "#bbc3b5",
      0,
      0.1 + i * 0.12,
      4.55 - i * 0.25,
      1.6,
      0.16,
      0.48,
      0.04,
    );
  for (const x of [-2.8, 2.8]) {
    const service = equipmentPanel(g, 0.95, 0.6);
    service.position.set(x, 0.85, 2.7);
    lantern(g, x, 3.3, 1.65);
  }
  batchStatic(g);
  scene.add(g);
}

export function pathAmenities(run: Run) {
  const WIDTH = parkWidth(run),
    HEIGHT = parkHeight(run),
    originZ = parkOriginZ(run);
  const g = new T.Group(),
    paths = new Set(run.paths);
  const occupied = (cell: number) =>
    run.buildings.some((b) => {
      const f = footprint(b),
        x = cell % WIDTH,
        z = Math.floor(cell / WIDTH);
      return !b.sold && x >= b.x && x < b.x + f.w && z >= b.z && z < b.z + f.h;
    });
  const edges: { x: number; z: number; horizontal: boolean; light: boolean }[] =
    [];
  for (const cell of paths) {
    const x = cell % WIDTH,
      z = Math.floor(cell / WIDTH);
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      if (paths.has((z + dz) * WIDTH + x + dx) && x + dx >= 0 && x + dx < WIDTH)
        continue;
      edges.push({
        x: (x + 0.5 + dx * 0.47 - WIDTH / 2) * SCALE,
        z: (z + 0.5 + dz * 0.47 - originZ) * SCALE,
        horizontal: dz !== 0,
        light: (x + z) % 4 === 0,
      });
    }
  }
  for (const horizontal of [false, true]) {
    const selected = edges.filter((e) => e.horizontal === horizontal);
    const mesh = new T.InstancedMesh(
      new T.BoxGeometry(
        horizontal ? 1.22 : 0.065,
        0.075,
        horizontal ? 0.065 : 1.22,
      ),
      metal("#879b91"),
      selected.length,
    );
    const matrix = new T.Matrix4();
    selected.forEach((e, i) => {
      matrix.makeTranslation(e.x, 0.255, e.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.receiveShadow = true;
    g.add(mesh);
    const lights = selected.filter((e) => e.light);
    const guide = new T.InstancedMesh(
      new T.BoxGeometry(
        horizontal ? 0.36 : 0.025,
        0.018,
        horizontal ? 0.025 : 0.36,
      ),
      glow("#d7e5b5"),
      lights.length,
    );
    lights.forEach((e, i) => {
      matrix.makeTranslation(e.x, 0.3, e.z);
      guide.setMatrixAt(i, matrix);
    });
    g.add(guide);
  }
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
        pz = (z + side + 0.5 - originZ) * SCALE;
      if (i % 18 === 0) {
        const bench = resortBench(g, px, pz, side > 0 ? 0 : Math.PI);
        bench.scale.setScalar(0.65);
      } else pressureGarden(g, px, pz, 0.44, 0.8);
      if (i % 12 === 0) lantern(g, px + 0.32, pz + 0.25, 1.45);
      used.add(neighbor);
      break;
    }
  }
  batchStatic(g);
  return g;
}
