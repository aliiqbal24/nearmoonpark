import * as T from "three";
import {
  artSegments,
  batchStatic,
  beam,
  box,
  cylinder,
  glass,
  glow,
  label,
  line,
  metal,
  nearMark,
  ring,
  shapedBox,
  surface,
} from "./art-kit";
import {
  pressureGarden,
  equipmentPanel,
  lantern,
  safetyRail,
} from "./resort-props";

/** Fixed resort architecture stays outside the player's buildable parcel. */
export function resortDistrict(scene: T.Scene) {
  const district = new T.Group();
  district.name = "lunar-resort-district";
  const ivory = "#d8ded9",
    bronze = "#b89a65",
    teal = "#237f7c",
    ink = "#162730";
  for (const side of [-1, 1]) {
    const lodge = new T.Group();
    lodge.position.set(side * 40, 0, -7);
    lodge.rotation.y = -side * 0.18;
    district.add(lodge);
    cylinder(lodge, ink, 0, 0.2, 0, 7.6, 0.45);
    ring(lodge, bronze, 7.45, 0.08, 0, 0.48).material = metal(bronze);
    const shell = new T.Mesh(
      new T.SphereGeometry(
        6.5,
        artSegments(48, 24),
        24,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      glass,
    );
    shell.position.y = 0.65;
    shell.scale.y = 0.77;
    lodge.add(shell);
    // Bronze structural ribs catch the Sun and frame the visible interior garden.
    for (let rib = 0; rib < 12; rib++) {
      const angle = (rib * Math.PI) / 6;
      const points = Array.from({ length: 25 }, (_, j) => {
        const t = ((j / 24) * Math.PI) / 2;
        return new T.Vector3(
          Math.cos(angle) * Math.cos(t) * 6.56,
          0.65 + Math.sin(t) * 5.06,
          Math.sin(angle) * Math.cos(t) * 6.56,
        );
      });
      line(lodge, points, 0.045, bronze, "metal");
    }
    for (const y of [1.5, 3.0, 4.2]) {
      const radius = 6.56 * Math.sqrt(1 - ((y - 0.65) / 5.06) ** 2);
      ring(lodge, ivory, radius, 0.035, 0, y);
    }
    ring(lodge, "#a7ead8", 6.5, 0.035, 0, 0.8).material = glow("#a7ead8");
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399,
        radius = i === 0 ? 0 : 3.5;
      pressureGarden(
        lodge,
        Math.cos(a) * radius,
        Math.sin(a) * radius,
        0.8 + (i % 3) * 0.2,
        1.4 + (i % 4) * 0.32,
      );
    }
    for (const x of [-4.2, 4.2]) {
      shapedBox(lodge, ivory, x, 1.1, 5.8, 2.7, 2.0, 2.4, 0.2);
      const window = shapedBox(
        lodge,
        "#ffc982",
        x,
        1.25,
        7.03,
        2.25,
        1.22,
        0.04,
        0.06,
      );
      window.material = glow("#ffcc8b");
      for (const offset of [-0.75, 0, 0.75])
        box(lodge, ink, x + offset, 1.25, 7.07, 0.045, 1.25, 0.04);
      const panel = equipmentPanel(lodge, 0.9, 0.6);
      panel.position.set(x, 2.4, 5.8);
    }
    const sign = label(
      side < 0 ? "NEAR / BOTANICAL RESERVE" : "EARTHRISE / LUNAR RESORT",
      "#f2d4a4",
      5.2,
    );
    sign.position.set(0, 2.7, 6.2);
    lodge.add(sign);
    const mark = nearMark(lodge, ivory, 1.25);
    mark.position.set(0, 5.9, 0);
    // Walkway viaducts visually connect the resort to the arrival concourse.
    const bridge = new T.Group();
    bridge.position.set(side * 24, 0, 20);
    district.add(bridge);
    shapedBox(bridge, ink, 0, 0.4, 0, 22, 0.5, 2.5, 0.1);
    shapedBox(bridge, "#c4bca6", 0, 0.68, 0, 22, 0.08, 2.2, 0.04).material =
      surface("#c4bca6", "stone");
    for (const z of [-1.18, 1.18]) {
      box(bridge, teal, 0, 0.74, z, 21.5, 0.025, 0.035).material =
        glow("#87e5cd");
      for (let x = -10; x <= 10; x += 2.5) {
        const railing = safetyRail(bridge, 2.25);
        railing.position.set(x, 0.8, z);
      }
    }
    for (const x of [-9, -3, 3, 9]) {
      cylinder(bridge, ivory, x, 0, 0, 0.19, 1.0);
      lantern(bridge, x, -1.3, 1.9);
    }
  }
  // The far edge reads as a designed lunar destination even before expansion.
  const horizon = new T.Group();
  horizon.position.set(0, 0, -53);
  district.add(horizon);
  shapedBox(horizon, ink, 0, 0.35, 0, 37, 0.7, 5.3, 0.25);
  horizon.position.z = -75;
  const arc = (radius: number, y: number) =>
    Array.from({ length: 81 }, (_, i) => {
      const a = -0.9 + (i / 80) * 1.8;
      return new T.Vector3(Math.sin(a) * radius, y, Math.cos(a) * radius);
    });
  for (const [radius, y, thickness, color] of [
    [25, 0.45, 0.32, ink],
    [25.15, 1.0, 0.12, bronze],
    [25.2, 4.7, 0.18, ivory],
    [26, 5.1, 0.22, ivory],
  ] as const) {
    line(
      horizon,
      arc(radius, y),
      thickness,
      color,
      color === bronze ? "metal" : "paint",
    );
  }
  const glazing = new T.Mesh(
    new T.CylinderGeometry(25, 25, 3.65, 72, 1, true, -0.9, 1.8),
    glass,
  );
  glazing.position.y = 2.8;
  horizon.add(glazing);
  const roof = new T.Mesh(
    new T.CylinderGeometry(25.9, 24.5, 0.25, 72, 1, false, -0.9, 1.8),
    surface(ivory),
  );
  roof.position.y = 4.95;
  roof.castShadow = true;
  horizon.add(roof);
  for (let i = 0; i <= 24; i++) {
    const a = -0.9 + (i / 24) * 1.8,
      x = Math.sin(a) * 25,
      z = Math.cos(a) * 25;
    beam(
      horizon,
      new T.Vector3(x, 1, z),
      new T.Vector3(x, 4.7, z),
      0.04,
      bronze,
    ).material = metal(bronze);
    const room = shapedBox(
      horizon,
      "#f7c889",
      x * 0.96,
      2.7,
      z * 0.96,
      1.35,
      2.4,
      0.05,
      0.03,
    );
    room.rotation.y = a;
    room.material = glow("#f7c889");
    if (i % 4 === 0) pressureGarden(horizon, x * 0.92, z * 0.92, 0.6, 1.7);
  }
  for (const y of [1.15, 4.65]) {
    const light = line(horizon, arc(25.22, y), 0.026, "#a7ead8");
    light.material = glow("#a7ead8");
  }
  const hotelSign = label("NEAR / EARTHRISE LUNAR RESORT", "#f3deba", 9.2);
  hotelSign.position.set(0, 5.9, 25.5);
  horizon.add(hotelSign);
  const beacon = new T.Group();
  beacon.position.set(-29, 0, -46);
  district.add(beacon);
  for (const x of [-1, 1])
    beam(
      beacon,
      new T.Vector3(x * 1.4, 0.2, 0),
      new T.Vector3(x * 0.45, 12, 0),
      0.14,
      ivory,
    );
  const orbit = ring(beacon, bronze, 2.3, 0.055, 0, 10.2);
  orbit.rotation.x = 0.35;
  orbit.material = metal(bronze);
  const logo = nearMark(beacon, "#a3f7de", 2.0);
  logo.position.set(0, 11.3, 0.12);
  logo.material = glow("#a3f7de");
  batchStatic(district);
  scene.add(district);
}
