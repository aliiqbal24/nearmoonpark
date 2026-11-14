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
  g.name = "near-lunar-passenger-liner";
  g.scale.setScalar(1.4);
  const hull = new T.Mesh(
    new T.LatheGeometry(
      [
        [0.65, 0.65],
        [0.94, 0.9],
        [1.01, 1.25],
        [1.01, 5.65],
        [0.99, 6.05],
        [0.87, 6.65],
        [0.67, 7.25],
        [0.38, 7.82],
        [0.03, 8.3],
      ].map(([r, y]) => new T.Vector2(r, y)),
      80,
    ),
    metal("#aeb8bd"),
  );
  hull.castShadow = hull.receiveShadow = true;
  g.add(hull);
  const nose = new T.Mesh(
    new T.LatheGeometry(
      [
        [0.89, 0],
        [0.83, 0.32],
        [0.65, 0.83],
        [0.39, 1.37],
        [0.03, 1.88],
      ].map(([r, y]) => new T.Vector2(r, y)),
      64,
    ),
    material("#18232c"),
  );
  nose.position.y = 6.45;
  nose.castShadow = true;
  g.add(nose);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const panel = new T.Mesh(
      new T.LatheGeometry(
        [
          new T.Vector2(0.955, 1.02),
          new T.Vector2(1.025, 1.4),
          new T.Vector2(1.025, 3.9),
          new T.Vector2(1.02, 4.25),
        ],
        24,
        angle + 0.08,
        Math.PI / 2 - 0.16,
      ),
      material("#e4e7de"),
    );
    panel.castShadow = panel.receiveShadow = true;
    g.add(panel);
    const fin = new T.Group();
    fin.rotation.y = angle + Math.PI / 4;
    const profile = new T.Shape();
    profile.moveTo(0.96, 4.4);
    profile.bezierCurveTo(1.15, 4.1, 1.45, 2.9, 2.04, 1.65);
    profile.lineTo(2.04, 1.08);
    profile.lineTo(1.46, 1.26);
    profile.lineTo(1.01, 2.3);
    profile.closePath();
    const wing = new T.Mesh(
      new T.ExtrudeGeometry(profile, {
        depth: 0.13,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelThickness: 0.025,
        bevelSize: 0.025,
      }),
      material("#2a4d55"),
    );
    wing.position.z = -0.065;
    wing.castShadow = true;
    fin.add(wing);
    beam(
      fin,
      new T.Vector3(1.08, 3.85, 0.08),
      new T.Vector3(1.91, 1.7, 0.08),
      0.026,
      "#afdfcf",
    ).material = glow("#a2dec9");
    g.add(fin);
  }
  for (const y of [1.0, 4.3, 5.95]) {
    ring(g, "#d7b875", 1.027, 0.025, 0, y).material = metal("#d7b875");
  }
  for (let i = 0; i < 17; i++) {
    const y = 1.12 + i * 0.31;
    ring(
      g,
      i % 4 === 0 ? "#5d707b" : "#89969e",
      1.014,
      i % 4 === 0 ? 0.012 : 0.004,
      0,
      y,
    ).material = metal("#89969e");
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const seam = new T.Group();
    seam.rotation.y = a;
    box(seam, "#657680", 0, 3.65, 1.013, 0.006, 4.95, 0.004).material =
      metal("#657680");
    for (const y of [1.33, 2.52, 3.78, 5.25])
      sphere(seam, "#303f49", 0, y, 1.018, 0.012);
    g.add(seam);
  }
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const window = new T.Group();
      window.position.set(
        Math.sin(a) * 1.014,
        4.8 + row * 0.58,
        Math.cos(a) * 1.014,
      );
      window.rotation.y = a;
      shapedBox(window, "#26333c", 0, 0, 0, 0.4, 0.36, 0.07, 0.11);
      shapedBox(
        window,
        "#7196a0",
        0,
        0,
        0.043,
        0.31,
        0.265,
        0.025,
        0.08,
      ).material = glass;
      box(window, "#ffe4ab", 0, -0.11, 0.065, 0.22, 0.012, 0.006).material =
        glow("#ffd49a");
      g.add(window);
    }
  }
  const door = new T.Group();
  door.position.set(0, 1.8, -1.008);
  door.rotation.y = Math.PI;
  shapedBox(door, "#25333d", 0, 0, 0, 0.72, 1.65, 0.08, 0.21);
  shapedBox(door, "#667c87", 0, 0.04, 0.055, 0.59, 1.46, 0.035, 0.17);
  shapedBox(door, "#162a35", 0, 0.35, 0.085, 0.33, 0.4, 0.025, 0.1).material =
    glass;
  for (const x of [-0.28, 0.28])
    box(door, "#c8d8dc", x, -0.15, 0.095, 0.025, 0.5, 0.025).material =
      metal("#c8d8dc");
  for (const y of [-0.58, 0.58])
    box(door, "#8fe4d5", 0, y, 0.09, 0.38, 0.018, 0.015).material =
      glow("#8fe4d5");
  g.add(door);
  for (let i = 0; i < 4; i++) {
    const leg = new T.Group();
    leg.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    const shape = new T.Shape();
    shape.moveTo(0.94, 2.8);
    shape.lineTo(1.17, 2.8);
    shape.lineTo(1.66, 0.53);
    shape.lineTo(1.52, 0.44);
    shape.lineTo(0.95, 1.3);
    shape.closePath();
    const housing = new T.Mesh(
      new T.ExtrudeGeometry(shape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        bevelSegments: 2,
      }),
      material("#25313b"),
    );
    housing.position.z = -0.08;
    housing.castShadow = true;
    leg.add(housing);
    beam(
      leg,
      new T.Vector3(0.93, 2.0, 0.12),
      new T.Vector3(1.7, 0.3, 0.12),
      0.055,
      "#a7bbc3",
    ).material = metal("#a7bbc3");
    beam(
      leg,
      new T.Vector3(1.15, 1.52, 0.12),
      new T.Vector3(1.65, 0.4, 0.12),
      0.09,
      "#374954",
    ).material = metal("#374954");
    shapedBox(leg, "#26333c", 1.72, 0.15, 0, 0.7, 0.16, 0.63, 0.04);
    for (const z of [-0.23, 0.23])
      box(leg, "#8b9ba4", 1.72, 0.25, z, 0.45, 0.035, 0.035).material =
        metal("#8b9ba4");
    g.add(leg);
  }
  const brand = new T.Group();
  nearMark(brand, "#142c37", 0.66).position.set(0, 3.95, 1.027);
  const name = label("N E A R", "#152f39", 1.15);
  name.position.set(0, 3.23, 1.035);
  brand.add(name);
  const transit = label("LUNAR TRANSIT", "#275858", 1.12);
  transit.position.set(0, 2.9, 1.035);
  transit.scale.y *= 0.5;
  brand.add(transit);
  g.add(brand);
  for (const side of [-1, 1]) {
    const identity = new T.Group();
    identity.rotation.y = (side * Math.PI) / 2;
    nearMark(identity, "#183b43", 0.52).position.set(0, 3.2, 1.04);
    const route = label("MOONPARK", "#173b43", 0.9);
    route.position.set(0, 2.63, 1.04);
    identity.add(route);
    g.add(identity);
  }
  const engine = new T.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const x = Math.cos(a) * 0.45,
      z = Math.sin(a) * 0.45;
    const nozzle = new T.Mesh(
      new T.CylinderGeometry(0.115, 0.22, 0.43, 28, 1, true),
      metal("#2b3740"),
    );
    nozzle.position.set(x, 0.57, z);
    engine.add(nozzle);
    ring(engine, "#67767d", 0.19, 0.012, x, 0.48, z).material =
      metal("#67767d");
  }
  g.add(engine);
  batch(g);
  const flame = new T.Group();
  const plumeMaterials: T.ShaderMaterial[] = [];
  for (const [radius, height, shade] of [
    [0.42, 3.2, "#93c5f4"],
    [0.24, 2.5, "#fff0cd"],
  ] as const) {
    const plumeMaterial = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new T.Color(shade) } },
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float time;uniform vec3 tint;varying vec2 vUv;
        void main(){
          float noise=sin(vUv.x*78.0+time*29.0)*sin(vUv.y*61.0-time*34.0);
          float glow=pow(sin(vUv.x*3.14159),2.0)*pow(vUv.y,0.55);
          float bands=0.7+0.3*sin(vUv.y*51.0-time*23.0);
          gl_FragColor=vec4(tint*1.8,glow*(0.5+noise*0.13)*bands);
        }`,
    });
    const plume = new T.Mesh(
      new T.CylinderGeometry(radius * 0.38, radius, height, 48, 1, true),
      plumeMaterial,
    );
    plume.position.y = 0.4 - height / 2;
    flame.add(plume);
    plumeMaterials.push(plumeMaterial);
  }
  g.add(flame);
  g.userData.flame = flame;
  g.userData.plumeMaterials = plumeMaterials;
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
