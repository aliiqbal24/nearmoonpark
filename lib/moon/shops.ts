import * as T from "three";
import {
  palette,
  material,
  metal,
  nearMark,
  glass,
  glow,
  box,
  sphere,
  cylinder,
  beam,
  ring,
  shapedBox,
  ellipsoid,
  arch,
  line,
  label,
} from "./art-kit";
import {
  pressureGarden,
  scallopedAwning,
  pieSculpture,
  vault,
  marquee,
  equipmentPanel,
  windowPanel,
  safetyRail,
  type ResortColors,
  type StyledBuilding,
} from "./resort-props";

function serviceShell(
  g: T.Group,
  c: ResortColors,
  style: number,
  accent: string,
) {
  if (style === 1) {
    cylinder(g, c.dark, 0, 0.55, 0, 1.02, 0.42);
    cylinder(g, c.primary, 0, 0.83, 0, 1.04, 0.17);
    ring(g, c.accent, 1.055, 0.035, 0, 0.95).material = metal(c.accent);
    const dome = new T.Mesh(
      new T.SphereGeometry(1.02, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
    );
    dome.position.y = 1.7;
    dome.scale.y = 1.05;
    g.add(dome);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const points = Array.from({ length: 17 }, (_, n) => {
        const t = ((n / 16) * Math.PI) / 2;
        return new T.Vector3(
          Math.cos(t) * Math.cos(a) * 1.035,
          1.7 + Math.sin(t) * 1.08,
          Math.cos(t) * Math.sin(a) * 1.035,
        );
      });
      line(g, points, 0.025, c.accent, "metal");
    }
    ring(g, c.light, 1.13, 0.11, 0, 1.73);
    ring(g, c.primary, 1.15, 0.028, 0, 1.8).material = glow(c.primary);
    ring(g, c.accent, 1.11, 0.035, 0, 1.6).material = metal(c.accent);
    sphere(g, c.accent, 0, 2.8, 0, 0.095).material = metal(c.accent);
    for (const x of [-0.77, 0.77]) {
      cylinder(g, c.accent, x, 1.31, 0.35, 0.035, 0.75).material = metal(
        c.accent,
      );
      pressureGarden(g, x, -0.42, 0.23, 0.38);
    }
  } else if (style === 2) {
    shapedBox(g, c.dark, 0, 0.66, 0, 2.02, 0.63, 1.74, 0.07);
    shapedBox(g, c.light, 0, 0.92, -0.73, 1.9, 1.1, 0.2, 0.05);
    vault(g, c.light, 2.12, 0.97, 1.77, 1.29);
    for (const z of [-0.82, -0.35, 0.18, 0.77]) {
      const rib = arch(g, c.accent, 1.07, 1.29, z, 0.035);
      rib.scale.y = 0.91;
      rib.position.y = 0.115;
      for (const x of [-1.035, 1.035])
        box(g, c.dark, x, 1.05, z, 0.1, 0.6, 0.14);
    }
    for (const x of [-0.98, 0.98]) {
      box(g, c.dark, x, 0.73, 0.94, 0.13, 0.8, 0.18);
      for (let i = 0; i < 4; i++)
        box(
          g,
          c.accent,
          x,
          0.49 + i * 0.15,
          1.038,
          0.14,
          0.05,
          0.018,
        ).rotation.z = -0.25;
    }
    line(
      g,
      [
        new T.Vector3(0.88, 0.48, -0.55),
        new T.Vector3(1.13, 0.8, -0.55),
        new T.Vector3(1.13, 1.65, -0.55),
        new T.Vector3(0.88, 1.98, -0.55),
      ],
      0.045,
      c.primary,
      "metal",
    );
    for (let i = 0; i < 5; i++)
      box(g, c.dark, -1.08, 0.66 + i * 0.25, -0.35, 0.06, 0.04, 0.47);
    for (const z of [-0.58, -0.12])
      box(g, c.accent, -1.08, 1.15, z, 0.04, 1.3, 0.04).material = metal(
        c.accent,
      );
    scallopedAwning(g, 1.75, 0.7, 1.54, accent, 0.4);
  } else {
    shapedBox(g, c.primary, 0, 0.71, 0, 2.03, 0.64, 1.7, 0.22);
    shapedBox(g, c.light, 0, 1.12, -0.54, 2.03, 1.38, 0.63, 0.3);
    for (const x of [-0.91, 0.91]) {
      shapedBox(g, c.light, x, 1.28, 0.06, 0.2, 0.95, 1.15, 0.085);
      const pane = shapedBox(
        g,
        c.dark,
        x * 1.055,
        1.34,
        0.04,
        0.03,
        0.49,
        0.67,
        0.01,
      );
      pane.material = glass;
      for (const z of [-0.23, 0.06, 0.35])
        box(g, c.accent, x * 1.08, 1.34, z, 0.035, 0.56, 0.026).material =
          metal(c.accent);
    }
    ellipsoid(g, c.light, 0, 1.87, -0.02, 1.08, 0.34, 0.92);
    ring(g, c.accent, 0.9, 0.025, 0, 1.93, -0.02).scale.set(1.18, 1, 1);
    scallopedAwning(g, 2.18, 0.35, 1.53, accent, 0.79);
  }
  // A recessed, fully furnished counter gives close views real depth.
  shapedBox(g, c.light, 0, 1.02, 0.88, 2.15, 0.12, 0.57, 0.08);
  box(g, c.accent, 0, 0.91, 1.11, 1.92, 0.065, 0.04).material = metal(c.accent);
  for (const x of [-0.76, -0.32, 0.32, 0.76])
    box(g, c.accent, x, 0.58, 0.87, 0.026, 0.4, 0.03).material = metal(
      c.accent,
    );
  shapedBox(g, c.dark, -0.65, 1.19, 0.7, 0.25, 0.26, 0.18, 0.04);
  box(g, "#d9ffdf", -0.65, 1.24, 0.803, 0.18, 0.1, 0.012).material =
    glow("#a8ddd1");
  for (const x of [-0.65, 0, 0.65]) {
    cylinder(g, c.accent, x, 1.53, 0.38, 0.015, 0.24).material = metal(
      c.accent,
    );
    sphere(g, "#ffe4a4", x, 1.39, 0.38, 0.065).material = glow("#ffcb7f");
  }
  for (const side of [-1, 1]) {
    const service = equipmentPanel(g, 0.74, 0.6);
    service.position.set(side * 1.13, 0.85, -0.25);
    service.rotation.y = (side * Math.PI) / 2;
    line(
      g,
      [
        new T.Vector3(side * 0.85, 0.5, -0.65),
        new T.Vector3(side * 1.14, 0.6, -0.65),
        new T.Vector3(side * 1.14, 1.38, -0.65),
      ],
      0.025,
      "#819ba9",
      "metal",
    );
    shapedBox(g, "#273a48", side * 0.75, 0.52, -0.87, 0.35, 0.22, 0.25, 0.025);
  }
  if (style !== 1) {
    for (const x of [-0.56, 0, 0.56]) {
      const pane = windowPanel(g, 0.48, 0.62);
      pane.position.set(x, 1.45, -0.88);
      pane.rotation.y = Math.PI;
    }
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.245;
      box(g, "#8b9ea9", x, 1.99, -0.06, 0.018, 0.025, 1.47).material =
        metal("#8b9ea9");
    }
  }
  box(g, "#7be6d6", 0, 1.51, 1.15, 1.78, 0.017, 0.018).material =
    glow("#7be6d6");
  const menu = label("FRESH FROM EARTH / MADE ON THE MOON", "#b7d8db", 1.4);
  menu.position.set(0, 0.7, 1.183);
  menu.scale.y *= 0.38;
  g.add(menu);
  // Ceramic counter panels and a recessed checkout keep these small kiosks legible.
  for (let panel = 0; panel < 7; panel++) {
    const x = (panel - 3) * 0.27;
    shapedBox(
      g,
      panel % 3 === 0 ? c.primary : c.light,
      x,
      0.72,
      1.135,
      0.25,
      0.27,
      0.055,
      0.018,
    );
    box(g, c.accent, x, 0.565, 1.17, 0.23, 0.025, 0.025).material = metal(
      c.accent,
    );
  }
  const checkout = new T.Group();
  checkout.position.set(-0.7, 1.2, 1.02);
  checkout.rotation.x = -0.18;
  shapedBox(checkout, c.dark, 0, 0.04, 0, 0.23, 0.27, 0.075, 0.025);
  box(checkout, "#588e80", 0, 0.055, 0.043, 0.18, 0.17, 0.009).material =
    glow("#507b6c");
  nearMark(checkout, c.light, 0.085).position.set(0, 0.055, 0.054);
  g.add(checkout);
  if (style === 0) {
    for (const side of [-1, 1]) {
      const fin = shapedBox(
        g,
        c.primary,
        side * 0.98,
        1.95,
        -0.36,
        0.16,
        0.72,
        0.7,
        0.075,
      );
      fin.rotation.z = -side * 0.14;
      box(g, c.accent, side * 1.08, 2.07, -0.36, 0.03, 0.4, 0.49).material =
        metal(c.accent);
    }
  }
  for (const side of [-1, 1]) {
    const cladding = new T.Group();
    cladding.position.set(side * 1.07, 0.75, -0.15);
    cladding.rotation.y = (side * Math.PI) / 2;
    for (const y of [-0.19, -0.07, 0.05, 0.17])
      box(cladding, c.primary, 0, y, 0.02, 0.82, 0.025, 0.035);
    g.add(cladding);
  }
}

export function kitchen(g: T.Group, b: StyledBuilding, c: ResortColors) {
  const style = b.design.style;
  serviceShell(g, c, style, c.primary);
  for (const x of [-0.26, 0.25, 0.69]) {
    const { g: pie } = pieSculpture(g, x, 1.1, 0.96, 0.14);
    pie.rotation.y = x;
  }
  shapedBox(g, "#b67a47", 0.35, 1.15, -0.62, 0.64, 0.28, 0.18, 0.04);
  for (const x of [0.12, 0.35, 0.58])
    sphere(g, "#f3c071", x, 1.33, -0.59, 0.08);
  const pie = pieSculpture(
    g,
    style === 1 ? 0.78 : 0,
    style === 1 ? 2.46 : 2.26,
    style === 1 ? -0.45 : 0,
    style === 1 ? 0.28 : 0.39,
  ).g;
  pie.rotation.x = 0.12;
  pie.rotation.z = -0.12;
  const orbit = ring(
    g,
    c.accent,
    style === 1 ? 0.34 : 0.51,
    0.025,
    style === 1 ? 0.78 : 0,
    style === 1 ? 2.61 : 2.46,
    style === 1 ? -0.45 : 0,
  );
  orbit.rotation.z = 0.3;
  orbit.material = metal(c.accent);
  marquee(
    g,
    b.design.name || "MOON PIES",
    c.light,
    style === 2 ? 1.63 : 1.9,
    style === 1 ? 1.9 : 2.03,
    1.29,
  );
  for (const x of [-0.79, 0.79]) {
    cylinder(g, palette.navy, x, 0.42, 1.08, 0.075, 0.1);
    cylinder(g, palette.coral, x, 0.54, 1.08, 0.12, 0.11);
  }
}

export function drinks(g: T.Group, b: StyledBuilding, c: ResortColors) {
  serviceShell(g, c, b.design.style, c.primary);
  for (const [i, color] of ["#eaa28d", "#a2d6c0", "#bdabd9"].entries()) {
    const x = (i - 1) * 0.3;
    cylinder(g, color, x, 1.21, 1.01, 0.085, 0.24);
    cylinder(g, c.light, x, 1.34, 1.01, 0.092, 0.035);
    cylinder(g, c.accent, x + 0.025, 1.46, 1.01, 0.012, 0.25).rotation.z =
      -0.12;
  }
  if (b.design.style === 1) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const crystal = new T.Mesh(
        new T.OctahedronGeometry(0.24),
        material(i % 2 ? "#9ee8de" : "#cee4ef"),
      );
      crystal.position.set(
        Math.cos(a) * 0.28,
        2.09 + Math.sin(a) * 0.1,
        Math.sin(a) * 0.26,
      );
      crystal.scale.y = 1.8;
      g.add(crystal);
    }
  } else {
    const cup = cylinder(g, c.primary, 0, 2.52, 0, 0.29, 0.5);
    cup.material = glass;
    cylinder(g, "#4baec2", 0, 2.45, 0, 0.26, 0.36);
    cylinder(g, c.light, 0, 2.8, 0, 0.31, 0.065);
    cylinder(g, c.accent, 0.1, 2.99, 0, 0.025, 0.45).rotation.z = -0.25;
    for (let i = 0; i < 4; i++) {
      const ice = shapedBox(
        g,
        "#b9e9e7",
        ((i % 2) - 0.5) * 0.27,
        2.7 + Math.floor(i / 2) * 0.13,
        ((i % 2) - 0.5) * 0.16,
        0.17,
        0.16,
        0.17,
        0.04,
      );
      ice.rotation.y = i * 0.65;
    }
    ring(g, c.accent, 0.39, 0.03, 0, 2.24).material = metal(c.accent);
  }
  marquee(
    g,
    b.design.name || "CRATER COOLERS",
    c.light,
    1.94,
    b.design.style === 1 ? 1.9 : 2.03,
    1.29,
  );
}

export function maintenance(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
  robot: T.Group,
) {
  if (b.design.style === 1) {
    const dome = new T.Mesh(
      new T.SphereGeometry(
        1.5,
        32,
        20,
        Math.PI * 0.15,
        Math.PI * 1.7,
        0,
        Math.PI / 2,
      ),
      glass,
    );
    dome.position.set(0, 0.76, -0.14);
    dome.scale.set(1, 1, 0.95);
    g.add(dome);
    for (const z of [-0.9, -0.15, 0.64])
      arch(g, c.accent, 1.54, 0.76, z, 0.05).material = metal(c.accent);
    ring(g, c.primary, 1.55, 0.06, 0, 0.77, -0.14);
  } else {
    for (const x of [-1.3, 1.3]) {
      shapedBox(g, c.light, x, 1.0, -0.1, 0.22, 1.2, 2.5, 0.08);
      box(g, c.primary, x * 1.085, 0.73, -0.1, 0.035, 0.6, 2.3);
    }
    vault(g, c.light, 2.9, 0.88, 2.6, 1.5, -0.12);
    if (b.design.style === 2) {
      for (const z of [-1.39, -0.83, -0.22, 0.42, 1.12]) {
        arch(g, c.dark, 1.49, 1.49, z, 0.055).scale.y = 0.61;
        for (const x of [-1.47, 1.47])
          beam(
            g,
            new T.Vector3(x, 0.4, z - 0.2),
            new T.Vector3(x, 1.42, z + 0.2),
            0.035,
            c.accent,
          );
      }
      for (let i = 0; i < 7; i++)
        box(
          g,
          c.accent,
          (i - 3) * 0.34,
          1.55,
          1.25,
          0.17,
          0.13,
          0.05,
        ).rotation.z = -0.35;
    }
  }
  shapedBox(g, c.dark, 0, 0.45, -1.2, 2.5, 0.18, 0.2, 0.04);
  for (const x of [-0.94, 0.94]) {
    shapedBox(g, c.primary, x, 0.83, -1.12, 0.44, 0.68, 0.39, 0.04);
    for (let i = 0; i < 3; i++)
      box(g, c.accent, x, 0.65 + i * 0.17, -0.91, 0.3, 0.025, 0.015);
  }
  const rack = new T.Group();
  rack.position.set(0, 1.4, -0.95);
  box(rack, c.accent, 0, 0, 0, 1.3, 0.05, 0.08).material = metal(c.accent);
  for (const x of [-0.45, 0, 0.45])
    cylinder(rack, c.dark, x, -0.1, 0, 0.04, 0.25);
  g.add(rack);
  robot.scale.setScalar(0.9);
  robot.position.set(0, 0.43, 0.5);
  g.add(robot);
  marquee(g, b.design.name || "LUNAR CARE", c.light, 2.28, 1.82, 1.29);
  for (const side of [-1, 1]) {
    const panel = equipmentPanel(g, 0.95, 0.68);
    panel.position.set(side * 1.46, 0.95, 0.1);
    panel.rotation.y = (side * Math.PI) / 2;
    for (let i = 0; i < 5; i++)
      box(
        g,
        "#a6b8bf",
        side * 1.43,
        1.56,
        -0.95 + i * 0.48,
        0.06,
        0.06,
        0.22,
      ).material = metal("#a6b8bf");
    const rail = safetyRail(g, 0.6);
    rail.position.set(side * 1.12, 0.38, 1.47);
  }
  box(g, "#9ddfcd", 0, 2.0, 1.26, 2.48, 0.018, 0.025).material =
    glow("#9ddfcd");
  for (let i = 0; i < 10; i++)
    box(
      g,
      i % 2 ? "#ac9865" : "#1c2d37",
      -1.1 + i * 0.24,
      0.41,
      1.46,
      0.13,
      0.013,
      0.18,
    ).rotation.y = -0.38;
  for (const side of [-1, 1]) {
    const crate = new T.Group();
    crate.position.set(side * 1.1, 0.52, -0.94);
    shapedBox(crate, "#8a9a8a", 0, 0, 0, 0.46, 0.38, 0.43, 0.04);
    for (const x of [-0.14, 0.14])
      box(crate, c.dark, x, 0.02, 0.23, 0.045, 0.3, 0.025);
    g.add(crate);
    const heatSink = equipmentPanel(g, 0.5, 0.9);
    heatSink.position.set(side * 0.75, 2.47, -0.2);
    heatSink.rotation.x = -Math.PI / 2;
  }
  return (t: number) => {
    robot.position.x = Math.sin(t * 0.4) * 0.4;
    for (const wheel of robot.userData.wheels as T.Object3D[])
      wheel.rotation.x = Math.sin(t * 0.4) * 2;
    robot.rotation.y = Math.sin(t * 0.3) * 0.2;
  };
}

function solarPanel(
  g: T.Group,
  c: ResortColors,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  tilt: number,
) {
  const panel = new T.Group();
  panel.position.set(x, y, z);
  panel.rotation.x = tilt;
  shapedBox(panel, c.light, 0, 0, 0, w, 0.1, h, 0.04);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 7; j++) {
      const cell = box(
        panel,
        (i + j) % 3 ? "#1c455f" : "#2c6374",
        ((i - 2) * (w - 0.12)) / 5,
        0.06,
        ((j - 3) * (h - 0.13)) / 7,
        (w - 0.16) / 5,
        0.014,
        (h - 0.2) / 7,
      );
      cell.material = metal((i + j) % 3 ? "#1c455f" : "#2c6374");
    }
  for (const side of [-1, 1])
    box(
      panel,
      c.accent,
      side * (w / 2 - 0.04),
      0.075,
      0,
      0.025,
      0.015,
      h - 0.1,
    ).material = metal(c.accent);
  g.add(panel);
  return panel;
}

export function solar(
  g: T.Group,
  b: StyledBuilding,
  c: ResortColors,
  w: number,
  h: number,
) {
  cylinder(g, c.dark, 0, 0.65, 0, 0.3, 0.6);
  if (b.design.style === 2) {
    for (const side of [-1, 1]) {
      box(g, c.dark, side * 0.85, 1.0, 0, 0.09, 1.1, 0.13);
      solarPanel(g, c, side * 0.85, 1.62, 0, 1.5, 2.8, -0.22);
      beam(
        g,
        new T.Vector3(side * 0.85, 0.5, -0.85),
        new T.Vector3(side * 0.85, 1.5, 0.75),
        0.06,
        c.accent,
      );
    }
  } else {
    const n = b.design.style === 1 ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const arm = new T.Group();
      arm.rotation.y = (i / n) * Math.PI * 2;
      g.add(arm);
      beam(
        arm,
        new T.Vector3(0, 1, 0),
        new T.Vector3(0, 1.35, 1.12),
        0.045,
        c.accent,
      );
      solarPanel(
        arm,
        c,
        0,
        1.36,
        0.95,
        b.design.style === 1 ? 0.82 : 1.04,
        1.37,
        -0.28,
      );
    }
    sphere(g, c.accent, 0, 1.53, 0, 0.18).material = metal(c.accent);
    if (b.design.style === 1) ring(g, c.primary, 1.35, 0.045, 0, 0.9);
  }
  shapedBox(g, c.primary, 0, 0.64, h / 2 - 0.42, 0.65, 0.55, 0.46, 0.075);
  shapedBox(g, c.dark, 0, 0.4, 0, 0.9, 0.18, 0.86, 0.075);
  for (const side of [-1, 1]) {
    const cooling = equipmentPanel(g, 0.55, 0.3);
    cooling.position.set(side * 0.47, 0.6, 0);
    cooling.rotation.y = (side * Math.PI) / 2;
  }
  const inverter = equipmentPanel(g, 0.62, 0.42);
  inverter.position.set(0, 0.88, -h / 2 + 0.29);
  inverter.rotation.y = Math.PI;
  for (const side of [-1, 1])
    line(
      g,
      [
        new T.Vector3(side * 0.18, 0.56, -h / 2 + 0.3),
        new T.Vector3(side * 0.45, 0.44, -0.5),
        new T.Vector3(side * 0.13, 0.52, 0),
      ],
      0.023,
      "#77949f",
      "metal",
    );
  for (let i = 0; i < 4; i++)
    box(
      g,
      "#e0f6bd",
      -0.18 + i * 0.12,
      0.7,
      h / 2 - 0.177,
      0.065,
      0.16,
      0.016,
    ).material = glow("#a8d98d");
}
