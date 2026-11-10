import * as T from "three";
import {
  palette,
  nearMark,
  material,
  metal,
  glass,
  glow,
  box,
  sphere,
  cylinder,
  ring,
  beam,
  shapedBox,
  ellipsoid,
  line,
  label,
  batch,
} from "./art-kit";

export function rocket() {
  const g = new T.Group();
  const hull = new T.Mesh(
    new T.LatheGeometry(
      [
        [0.7, 0.48],
        [0.9, 0.64],
        [0.98, 1.0],
        [0.98, 3.7],
        [0.93, 3.96],
        [0.82, 4.18],
      ].map(([r, y]) => new T.Vector2(r, y)),
      64,
    ),
    material(palette.ivory),
  );
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);
  const nose = new T.Mesh(
    new T.LatheGeometry(
      [
        [0.83, 0],
        [0.84, 0.15],
        [0.79, 0.48],
        [0.64, 0.93],
        [0.43, 1.43],
        [0.2, 1.86],
        [0, 2.13],
      ].map(([r, y]) => new T.Vector2(r, y)),
      64,
    ),
    material(palette.coral),
  );
  nose.position.y = 4.12;
  nose.castShadow = true;
  g.add(nose);
  for (const y of [0.78, 1.12, 2.0, 3.85, 4.15])
    ring(g, palette.gold, y === 4.15 ? 0.835 : 0.985, 0.027, 0, y).material =
      metal(palette.gold);
  cylinder(g, palette.navy, 0, 0.6, 0, 0.72, 0.24);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const band = new T.Group();
    band.rotation.y = a;
    line(
      band,
      [
        new T.Vector3(0, 1.18, 0.984),
        new T.Vector3(0, 2.1, 0.987),
        new T.Vector3(0, 3.76, 0.984),
      ],
      0.009,
      "#d4c2a0",
      "metal",
    );
    for (const y of [1.18, 2.05, 3.78])
      sphere(band, palette.gold, 0, y, 0.995, 0.018).material = metal(
        palette.gold,
      );
    g.add(band);
    const window = new T.Group();
    window.position.set(Math.sin(a) * 0.99, 3.28, Math.cos(a) * 0.99);
    window.rotation.y = a;
    ring(window, palette.gold, 0.205, 0.035, 0, 0, 0, false).material = metal(
      palette.gold,
    );
    ellipsoid(window, palette.navy, 0, 0, 0.003, 0.17, 0.17, 0.035);
    const pane = ellipsoid(window, "#8bc6ce", 0, 0, 0.03, 0.176, 0.176, 0.034);
    pane.material = glass;
    pane.castShadow = false;
    line(
      window,
      [
        new T.Vector3(-0.1, 0.07, 0.06),
        new T.Vector3(-0.04, 0.11, 0.066),
        new T.Vector3(0.04, 0.12, 0.065),
      ],
      0.01,
      "#c5f0e9",
    );
    g.add(window);
  }
  for (let i = 0; i < 4; i++) {
    const fin = new T.Group();
    fin.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    const shape = new T.Shape();
    shape.moveTo(0.82, 1.2);
    shape.lineTo(1.62, 0.53);
    shape.quadraticCurveTo(1.78, 0.45, 1.69, 0.84);
    shape.lineTo(1.18, 2.45);
    shape.quadraticCurveTo(1.0, 2.86, 0.93, 2.95);
    shape.closePath();
    const shell = new T.Mesh(
      new T.ExtrudeGeometry(shape, {
        depth: 0.13,
        bevelEnabled: true,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        bevelSegments: 3,
      }),
      material(palette.coral),
    );
    shell.position.z = -0.065;
    shell.castShadow = true;
    fin.add(shell);
    line(
      fin,
      [
        new T.Vector3(0.97, 1.38, 0.11),
        new T.Vector3(1.48, 0.89, 0.11),
        new T.Vector3(1.12, 2.31, 0.11),
      ],
      0.02,
      palette.gold,
      "metal",
    );
    beam(
      fin,
      new T.Vector3(0.83, 1.42, 0),
      new T.Vector3(1.53, 0.16, 0),
      0.07,
      palette.steel,
    ).material = metal(palette.steel);
    shapedBox(fin, palette.navy, 1.56, 0.13, 0, 0.58, 0.15, 0.6, 0.1);
    shapedBox(
      fin,
      palette.gold,
      1.56,
      0.22,
      0,
      0.4,
      0.08,
      0.42,
      0.05,
    ).material = metal(palette.gold);
    g.add(fin);
  }
  const door = new T.Group();
  door.position.set(0, 1.18, -0.987);
  door.rotation.y = Math.PI;
  shapedBox(door, palette.navy, 0, 0, 0.025, 0.7, 1.34, 0.075, 0.28);
  const trim = ring(door, palette.gold, 0.46, 0.035, 0, 0, 0.075, false);
  trim.scale.set(0.79, 1.5, 1);
  trim.material = metal(palette.gold);
  const window = ellipsoid(door, "#80c5ce", 0, 0.24, 0.08, 0.18, 0.2, 0.025);
  window.material = glass;
  for (const x of [-0.26, 0.26])
    box(door, palette.gold, x, -0.12, 0.11, 0.025, 0.36, 0.025).material =
      metal(palette.gold);
  g.add(door);
  const emblem = label("NEAR", palette.ivory, 1.06);
  emblem.position.set(0, 2.12, 1.035);
  nearMark(g, palette.navy, 0.47).position.set(0, 2.57, 1.035);
  g.add(emblem);
  const badge = ring(g, palette.gold, 0.64, 0.025, 0, 2.4, 0.987, false);
  badge.material = metal(palette.gold);
  for (const x of [-0.36, 0.36]) {
    const nozzle = new T.Mesh(
      new T.CylinderGeometry(0.16, 0.28, 0.36, 24, 1, true),
      metal(palette.navy),
    );
    nozzle.position.set(x, 0.37, 0);
    g.add(nozzle);
  }
  batch(g);
  const flame = new T.Group();
  for (const [radius, height, color, opacity] of [
    [0.43, 2.6, "#66cde4", 0.38],
    [0.24, 1.85, "#c4f7f8", 0.72],
    [0.12, 1.2, "#fff4cc", 0.92],
  ] as const) {
    const mesh = new T.Mesh(
      new T.ConeGeometry(radius, height, 24),
      new T.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    mesh.rotation.z = Math.PI;
    mesh.position.y = 0.43 - height / 2;
    flame.add(mesh);
  }
  g.add(flame);
  g.userData.flame = flame;
  return g;
}

export function serviceRover(color = palette.mint) {
  const g = new T.Group();
  g.userData.animated = true;
  shapedBox(g, palette.navy, 0, 0.25, 0, 0.84, 0.25, 1.04, 0.11);
  shapedBox(g, color, 0, 0.49, -0.12, 0.76, 0.36, 0.7, 0.14);
  shapedBox(g, palette.ivory, 0, 0.68, -0.15, 0.64, 0.12, 0.58, 0.06);
  const wheels: T.Object3D[] = [];
  for (const x of [-0.43, 0.43])
    for (const z of [-0.34, 0.34]) {
      const wheel = new T.Group();
      wheel.position.set(x, 0.22, z);
      const tire = cylinder(wheel, palette.rubber, 0, 0, 0, 0.22, 0.17);
      tire.rotation.z = Math.PI / 2;
      const hub = cylinder(
        wheel,
        palette.gold,
        Math.sign(x) * 0.1,
        0,
        0,
        0.12,
        0.04,
      );
      hub.rotation.z = Math.PI / 2;
      hub.material = metal(palette.gold);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        box(
          wheel,
          palette.steel,
          Math.sign(x) * 0.12,
          Math.sin(a) * 0.15,
          Math.cos(a) * 0.15,
          0.035,
          0.025,
          0.065,
        ).rotation.x = -a;
      }
      batch(wheel);
      g.add(wheel);
      wheels.push(wheel);
    }
  cylinder(g, palette.gold, 0, 0.79, 0.25, 0.055, 0.33).material = metal(
    palette.gold,
  );
  shapedBox(g, palette.ivory, 0, 0.98, 0.25, 0.55, 0.34, 0.36, 0.14);
  shapedBox(g, palette.navy, 0, 1.0, 0.45, 0.44, 0.19, 0.025, 0.06);
  for (const x of [-0.12, 0.12])
    ellipsoid(g, "#a5e1c9", x, 1.01, 0.477, 0.047, 0.061, 0.014).material =
      glow("#88d7be");
  line(
    g,
    [
      new T.Vector3(-0.055, 0.95, 0.477),
      new T.Vector3(0, 0.935, 0.482),
      new T.Vector3(0.055, 0.95, 0.477),
    ],
    0.009,
    palette.gold,
  );
  cylinder(g, palette.steel, 0.27, 1.11, -0.16, 0.014, 0.34).material = metal(
    palette.steel,
  );
  sphere(g, "#ffdb95", 0.27, 1.3, -0.16, 0.038).material = glow("#ffdb95");
  for (const x of [-0.38, 0.38]) {
    line(
      g,
      [
        new T.Vector3(x, 0.52, 0.15),
        new T.Vector3(x * 1.3, 0.7, 0.42),
        new T.Vector3(x, 0.78, 0.65),
      ],
      0.033,
      palette.gold,
      "metal",
    );
    shapedBox(g, palette.ivory, x, 0.77, 0.68, 0.11, 0.12, 0.16, 0.025);
  }
  box(g, palette.navy, 0, 0.55, 0.47, 0.58, 0.07, 0.27);
  batch(g);
  g.userData.wheels = wheels;
  return g;
}
