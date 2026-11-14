import * as T from "three";
import {
  artSegments,
  batchStatic,
  beam,
  box,
  cylinder,
  ellipsoid,
  glass,
  foliageMaterial,
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
  resortBench,
  safetyRail,
  windowPanel,
} from "./resort-props";

const ivory = "#e1dfcf";
const bronze = "#b99a64";
const teal = "#246c69";
const ink = "#182c35";

function arc(radius: number, y: number, extent = 0.86) {
  return Array.from({ length: 65 }, (_, i) => {
    const angle = -extent + (i / 64) * extent * 2;
    return new T.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
  });
}

function crescentDeck(
  parent: T.Group,
  outer: number,
  inner: number,
  y: number,
  color: string,
  depth = 0.24,
) {
  const outline = new T.Shape();
  const points = [...arc(outer, 0), ...arc(inner, 0).reverse()];
  outline.moveTo(points[0].x, points[0].z);
  points.slice(1).forEach((p) => outline.lineTo(p.x, p.z));
  outline.closePath();
  const geometry = new T.ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.045,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  const deck = new T.Mesh(geometry, surface(color));
  deck.position.y = y + depth;
  deck.castShadow = deck.receiveShadow = true;
  parent.add(deck);
}

function resortHotel(district: T.Group) {
  const hotel = new T.Group();
  hotel.name = "earthrise-terraced-hotel";
  hotel.position.set(0, 0, -81);
  district.add(hotel);
  crescentDeck(hotel, 29, 20.5, -0.35, ink, 0.8);
  crescentDeck(hotel, 28.7, 20.8, 0.55, "#a6aaa0");
  for (let floor = 0; floor < 3; floor++) {
    const radius = 26.2 - floor * 0.95;
    const y = 0.85 + floor * 3.25;
    crescentDeck(hotel, radius + 2.1, radius - 3.2, y, ivory);
    crescentDeck(hotel, radius + 2.15, radius - 3.25, y + 2.9, ivory);
    line(hotel, arc(radius + 2.18, y + 3.08), 0.045, bronze, "metal");
    const ribbon = line(hotel, arc(radius + 2.18, y + 2.86), 0.022, "#8cc9b5");
    ribbon.material = glow("#629f91");
    for (let bay = 0; bay < 19; bay++) {
      const angle = -0.8 + (bay / 18) * 1.6;
      const suite = new T.Group();
      suite.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      suite.rotation.y = angle;
      // Recessed rooms, deep balcony slabs and vertical sun fins create a readable facade.
      shapedBox(suite, ink, 0, 1.48, -0.9, 2.08, 2.65, 2.8, 0.07);
      box(
        suite,
        bay % 3 === 0 ? teal : "#b9c0b3",
        -1.01,
        1.48,
        0.53,
        0.13,
        2.67,
        0.32,
      );
      const window = windowPanel(suite, 1.88, 2.27, (bay + floor) % 4 !== 1);
      window.position.set(0, 1.49, 0.55);
      box(suite, bronze, 1.03, 1.43, 0.7, 0.045, 2.55, 0.46).material =
        metal(bronze);
      const railing = safetyRail(suite, 2.09);
      railing.position.set(0, 0.34, 1.86);
      if (bay % 4 === 0) {
        shapedBox(suite, ink, -0.64, 0.55, 1.23, 0.52, 0.38, 0.42, 0.05);
        ellipsoid(suite, "#587557", -0.64, 0.93, 1.23, 0.4, 0.25, 0.3);
      }
      if (floor === 0 && bay % 3 === 0)
        beam(
          suite,
          new T.Vector3(0, -0.5, 0),
          new T.Vector3(0, 0.38, 1.8),
          0.13,
          ivory,
        );
      hotel.add(suite);
    }
    for (const side of [-1, 1]) {
      const end = new T.Group();
      end.rotation.y = side * 0.85;
      end.position.set(
        Math.sin(side * 0.85) * radius,
        y + 1.55,
        Math.cos(0.85) * radius,
      );
      shapedBox(end, teal, 0, 0, -0.35, 0.24, 2.7, 4.6, 0.1);
      for (let fin = 0; fin < 7; fin++)
        box(
          end,
          bronze,
          side * 0.15,
          0.05,
          -2.2 + fin * 0.6,
          0.1,
          2.3,
          0.06,
        ).material = metal(bronze);
      hotel.add(end);
    }
  }
  // A glazed, double-height arrival lobby breaks the horizontal room bands.
  const lobby = new T.Group();
  lobby.position.z = 28;
  shapedBox(lobby, ink, 0, 0.5, 0.4, 8.2, 0.65, 6.1, 0.3);
  shapedBox(lobby, ivory, 0, 7.15, -0.1, 8.5, 0.4, 5.6, 0.3);
  shapedBox(lobby, teal, 0, 7.42, -0.1, 7.9, 0.2, 5.1, 0.17);
  shapedBox(lobby, "#566b64", 0, 3.75, -2.6, 7.8, 6.5, 0.3, 0.1);
  for (const x of [-3.75, -1.9, 0, 1.9, 3.75]) {
    box(lobby, ivory, x, 3.75, 2.47, 0.14, 6.45, 0.24);
    const pane = shapedBox(
      lobby,
      "#79aab3",
      x,
      3.75,
      2.34,
      1.75,
      6.1,
      0.055,
      0.025,
    );
    pane.material = glass;
  }
  for (const y of [1, 3.6, 6.7])
    box(lobby, bronze, 0, y, 2.51, 7.8, 0.055, 0.1).material = metal(bronze);
  for (const x of [-2.7, 2.7]) {
    resortBench(lobby, x, 0.4, x > 0 ? -Math.PI / 2 : Math.PI / 2, "#b47555");
    cylinder(lobby, bronze, x, 4.7, -0.2, 0.018, 2.4).material = metal(bronze);
    ellipsoid(lobby, "#bda27a", x, 3.45, -0.2, 0.52, 0.16, 0.52);
    cylinder(lobby, "#b59059", x, 3.38, -0.2, 0.36, 0.025).material =
      glow("#aa8050");
  }
  shapedBox(lobby, ivory, 0, 1, -1.6, 3.8, 0.8, 0.7, 0.16);
  nearMark(lobby, bronze, 1.05).position.set(0, 4.9, -2.38);
  const name = label("EARTHRISE / A NEAR RESORT", "#e5d3b0", 7.0);
  name.position.set(0, 7.38, 2.77);
  name.scale.y *= 0.58;
  lobby.add(name);
  for (let step = 0; step < 6; step++)
    shapedBox(
      lobby,
      "#a3afa8",
      0,
      0.13 + step * 0.12,
      4.05 - step * 0.34,
      5.3 - step * 0.12,
      0.16,
      0.65,
      0.06,
    );
  hotel.add(lobby);
  // Roof equipment has deliberate spacing, access lanes and screened service faces.
  for (const side of [-1, 1]) {
    const roof = new T.Group();
    roof.rotation.y = side * 0.53;
    roof.position.set(side * 11.7, 10.7, 20.4);
    for (let i = 0; i < 3; i++) {
      shapedBox(roof, ink, (i - 1) * 2.5, 0.35, 0, 2.2, 0.3, 1.7, 0.05);
      const radiator = equipmentPanel(roof, 1.9, 1.4);
      radiator.position.set((i - 1) * 2.5, 0.55, 0);
      radiator.rotation.x = -Math.PI / 2;
    }
    hotel.add(roof);
  }
}

function conservatory(district: T.Group) {
  const garden = new T.Group();
  garden.name = "near-botanical-conservatory";
  garden.position.set(-41, 0, -5);
  garden.rotation.y = 0.14;
  district.add(garden);
  cylinder(garden, ink, 0, 0.2, 0, 7.7, 1.1);
  cylinder(garden, ivory, 0, 1.2, 0, 7.05, 1.2);
  for (const y of [0.75, 1.8])
    ring(garden, bronze, 7.08, 0.075, 0, y).material = metal(bronze);
  const shell = new T.Mesh(
    new T.SphereGeometry(
      6.9,
      artSegments(48, 24),
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    glass,
  );
  shell.position.y = 1.85;
  shell.scale.y = 0.83;
  shell.castShadow = false;
  garden.add(shell);
  for (let rib = 0; rib < 18; rib++) {
    const angle = (rib * Math.PI) / 9;
    line(
      garden,
      Array.from({ length: 17 }, (_, j) => {
        const latitude = (j * Math.PI) / 32;
        return new T.Vector3(
          Math.cos(angle) * Math.cos(latitude) * 6.94,
          1.85 + Math.sin(latitude) * 5.77,
          Math.sin(angle) * Math.cos(latitude) * 6.94,
        );
      }),
      0.045,
      ivory,
    );
    for (let row = 0; row < 4; row++) {
      const low = (row * Math.PI) / 10,
        high = ((row + 1) * Math.PI) / 10;
      const next = angle + Math.PI / 9;
      beam(
        garden,
        new T.Vector3(
          Math.cos(angle) * Math.cos(low) * 6.96,
          1.85 + Math.sin(low) * 5.78,
          Math.sin(angle) * Math.cos(low) * 6.96,
        ),
        new T.Vector3(
          Math.cos(next) * Math.cos(high) * 6.96,
          1.85 + Math.sin(high) * 5.78,
          Math.sin(next) * Math.cos(high) * 6.96,
        ),
        0.023,
        bronze,
      );
    }
  }
  for (let row = 1; row <= 4; row++) {
    const latitude = (row * Math.PI) / 10;
    ring(
      garden,
      bronze,
      Math.cos(latitude) * 6.95,
      0.035,
      0,
      1.85 + Math.sin(latitude) * 5.77,
    ).material = metal(bronze);
  }
  // Exposed planting inside the pressure envelope gives the dome an inhabited interior.
  for (let tree = 0; tree < 7; tree++) {
    const angle = tree * 2.399;
    const x = tree === 0 ? 0 : Math.cos(angle) * 3.5;
    const z = tree === 0 ? 0 : Math.sin(angle) * 3.5;
    const height = tree === 0 ? 4.0 : 2.1 + (tree % 3) * 0.45;
    cylinder(garden, "#374b39", x, 1.83, z, 1.05, 0.13);
    line(
      garden,
      [
        new T.Vector3(x, 1.9, z),
        new T.Vector3(x - 0.16, height * 0.6 + 1.4, z + 0.12),
        new T.Vector3(x + 0.2, height + 1.4, z),
      ],
      0.07,
      "#89775b",
    );
    for (let branch = 0; branch < 6; branch++) {
      const a = branch * 2.399 + tree;
      const y = height + 1.1 - branch * 0.19;
      const tip = new T.Vector3(
        x + Math.cos(a) * 1.05,
        y + 0.18,
        z + Math.sin(a) * 1.05,
      );
      beam(garden, new T.Vector3(x + 0.1, y - 0.5, z), tip, 0.025, "#89775b");
      for (let leaf = 0; leaf < 5; leaf++) {
        const geometry = new T.PlaneGeometry(0.78, 1.25, 2, 4);
        const positions = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const atlas = (leaf + branch + tree) % 4;
        for (let vertex = 0; vertex < positions.count; vertex++) {
          const v = uv.getY(vertex);
          positions.setZ(vertex, Math.sin(v * Math.PI) * 0.23);
          positions.setY(vertex, positions.getY(vertex) + 0.62);
          uv.setXY(
            vertex,
            uv.getX(vertex) * 0.5 + (atlas % 2) * 0.5,
            v * 0.5 + (atlas < 2 ? 0.5 : 0),
          );
        }
        geometry.computeVertexNormals();
        const foliage = new T.Mesh(geometry, foliageMaterial());
        foliage.position
          .copy(tip)
          .add(
            new T.Vector3(
              Math.cos(leaf * 2.399) * 0.2,
              -0.14,
              Math.sin(leaf * 2.399) * 0.2,
            ),
          );
        foliage.rotation.set(
          0.65 + leaf * 0.1,
          a + leaf * 1.4,
          (leaf - 2) * 0.23,
        );
        foliage.castShadow = true;
        garden.add(foliage);
      }
    }
  }
  for (let bay = 0; bay < 16; bay++) {
    const angle = (bay * Math.PI) / 8;
    const window = windowPanel(garden, 2.32, 0.73, false);
    window.position.set(Math.sin(angle) * 7.08, 1.18, Math.cos(angle) * 7.08);
    window.rotation.y = angle;
  }
  const entrance = new T.Group();
  entrance.position.set(0, 0, 7.1);
  shapedBox(entrance, teal, 0, 1.8, 0, 3.9, 2.8, 2.7, 0.4);
  shapedBox(entrance, ivory, 0, 3.28, 0.2, 4.45, 0.23, 3.3, 0.16);
  const door = windowPanel(entrance, 2.65, 2.12);
  door.position.set(0, 1.76, 1.42);
  const sign = label("NEAR / BOTANICAL RESERVE", "#e0d3b1", 3.65);
  sign.position.set(0, 3.22, 1.91);
  sign.scale.y *= 0.5;
  entrance.add(sign);
  for (const x of [-2.5, 2.5]) {
    pressureGarden(entrance, x, 0.6, 0.55, 0.8);
    lantern(entrance, x, 1.75, 1.8);
  }
  garden.add(entrance);
  ring(garden, bronze, 0.65, 0.08, 0, 7.75).material = metal(bronze);
}

function lunarVillage(district: T.Group) {
  const village = new T.Group();
  village.name = "lunar-village-suites";
  village.position.set(42, 0, -2);
  village.rotation.y = -0.18;
  district.add(village);
  shapedBox(village, ink, 0, 0.15, 0, 15.4, 0.9, 12.1, 0.45);
  shapedBox(village, "#b7b7a5", 0, 0.66, 0, 15.0, 0.15, 11.7, 0.5).material =
    surface("#b7b7a5", "stone");
  for (let level = 0; level < 2; level++)
    for (const side of [-1, 1]) {
      const pod = new T.Group();
      pod.position.set(side * 4.0, level * 3.1 + 0.8, -level * 1.25);
      shapedBox(pod, ink, 0, 1.25, 0, 5.8, 2.5, 5.0, 0.6);
      shapedBox(
        pod,
        level ? "#afb8a7" : ivory,
        0,
        2.66,
        0.1,
        6.2,
        0.34,
        5.8,
        0.3,
      );
      shapedBox(
        pod,
        side < 0 ? teal : "#9d644d",
        -2.8,
        1.4,
        0,
        0.25,
        2.1,
        4.5,
        0.08,
      );
      for (const x of [-1.75, 0, 1.75]) {
        const pane = windowPanel(pod, 1.62, 1.98, true);
        pane.position.set(x, 1.35, 2.53);
        box(pod, bronze, x + 0.78, 1.4, 2.71, 0.055, 2.14, 0.44).material =
          metal(bronze);
      }
      for (const wall of [-1, 1]) {
        const facade = new T.Group();
        facade.position.set(wall * 2.92, 1.35, -0.1);
        facade.rotation.y = (wall * Math.PI) / 2;
        for (const z of [-1.4, 0.0, 1.4]) {
          const port = ring(facade, bronze, 0.4, 0.065, z, 0, 0, false);
          port.material = metal(bronze);
          const pane = ellipsoid(
            facade,
            "#527c88",
            z,
            0,
            0.015,
            0.34,
            0.34,
            0.045,
          );
          pane.material = glass;
        }
        for (const y of [-0.9, 0.95])
          box(facade, "#718c87", 0, y, 0.02, 4.55, 0.025, 0.035);
        const service = equipmentPanel(facade, 0.62, 0.35);
        service.position.set(-1.7, -0.61, 0.03);
        pod.add(facade);
      }
      for (const z of [-1.8, -1.2, -0.6, 0, 0.6])
        box(pod, "#8a9e96", -2.42, 2.88, z, 0.09, 0.14, 0.36).material =
          metal("#8a9e96");
      const rooflight = windowPanel(pod, 2.7, 1.55, false);
      rooflight.position.set(-0.4, 2.99, -0.2);
      rooflight.rotation.x = -Math.PI / 2;
      const balcony = safetyRail(pod, 5.85);
      balcony.position.set(0, 0.26, 3.15);
      shapedBox(pod, ivory, 0, 0.14, 2.93, 6.05, 0.2, 1.05, 0.1);
      pressureGarden(pod, side * 2.1, 2.75, 0.32, 0.5);
      const radiator = equipmentPanel(pod, 1.5, 0.8);
      radiator.position.set(1.25, 2.92, -0.4);
      radiator.rotation.x = -Math.PI / 2;
      village.add(pod);
    }
  const atrium = new T.Group();
  shapedBox(atrium, teal, 0, 3.25, -0.8, 2.0, 5.4, 3.8, 0.22);
  for (const y of [1.9, 4.6]) {
    const pane = windowPanel(atrium, 1.65, 2.05, false);
    pane.position.set(0, y, 1.16);
  }
  nearMark(atrium, "#e0c58f", 1.0).position.set(0, 6.2, 1.13);
  shapedBox(atrium, ivory, 0, 6.85, -0.7, 2.6, 0.28, 4.2, 0.2);
  village.add(atrium);
  const name = label("TRANQUILITY / LUNAR SUITES", "#e2d1b0", 7.0);
  name.position.set(0, 1.2, 6.0);
  name.scale.y *= 0.52;
  village.add(name);
  for (const x of [-6.7, 6.7]) {
    lantern(village, x, 5.4, 2.7);
    resortBench(village, x, 3.9, Math.PI / 2, teal);
  }
}

/** Fixed resort architecture stays outside the player's buildable parcel. */
export function resortDistrict(scene: T.Scene) {
  const district = new T.Group();
  district.name = "lunar-resort-district";
  resortHotel(district);
  conservatory(district);
  lunarVillage(district);
  for (const side of [-1, 1]) {
    const bridge = new T.Group();
    bridge.position.set(side * 24, 0, 20);
    shapedBox(bridge, ink, 0, 0.4, 0, 22, 0.5, 2.5, 0.1);
    shapedBox(bridge, "#c4bca6", 0, 0.68, 0, 22, 0.08, 2.2, 0.04).material =
      surface("#c4bca6", "stone");
    for (const z of [-1.18, 1.18]) {
      box(bridge, teal, 0, 0.74, z, 21.5, 0.025, 0.035).material =
        glow("#87bcae");
      for (let x = -10; x <= 10; x += 2.5) {
        const railing = safetyRail(bridge, 2.25);
        railing.position.set(x, 0.8, z);
      }
    }
    for (const x of [-9, -3, 3, 9]) {
      cylinder(bridge, ivory, x, 0, 0, 0.19, 1.0);
      lantern(bridge, x, -1.3, 1.9);
    }
    district.add(bridge);
    const promenade = new T.Group();
    promenade.position.set(side * 34, 0, -10.5);
    shapedBox(promenade, ink, 0, 0.38, 0, 2.35, 0.48, 61, 0.08);
    shapedBox(
      promenade,
      "#b9bfae",
      0,
      0.65,
      0,
      2.12,
      0.09,
      60.7,
      0.04,
    ).material = surface("#b9bfae", "stone");
    for (let z = -29; z <= 29; z += 2.5) {
      box(promenade, "#7a8e86", 0, 0.702, z, 2.08, 0.008, 0.018);
      cylinder(promenade, ink, 0, -0.04, z, 0.13, 0.85);
      if (Math.abs(z % 5) < 0.1) {
        const railing = safetyRail(promenade, 4.5);
        railing.position.set(side * 1.1, 0.7, z);
        railing.rotation.y = Math.PI / 2;
      }
    }
    for (const z of [-27, -12, 3, 18]) lantern(promenade, side * 1.15, z, 1.8);
    district.add(promenade);
    const approach = new T.Group();
    approach.position.set(side * 37.5, 0, 6.5);
    shapedBox(approach, ink, 0, 0.4, 0, 9.3, 0.48, 2.5, 0.12);
    shapedBox(approach, "#b9bfae", 0, 0.69, 0, 9.0, 0.09, 2.25, 0.06).material =
      surface("#b9bfae", "stone");
    for (const x of [-3.5, 0, 3.5]) cylinder(approach, ink, x, 0, 0, 0.16, 1.0);
    district.add(approach);
  }
  const rearApproach = new T.Group();
  rearApproach.position.set(0, 0, -48.3);
  shapedBox(rearApproach, ink, 0, 0.1, 0, 5.4, 0.65, 5.8, 0.12);
  shapedBox(
    rearApproach,
    "#b9bfae",
    0,
    0.45,
    0,
    5.12,
    0.1,
    5.7,
    0.07,
  ).material = surface("#b9bfae", "stone");
  for (const x of [-2.6, 2.6]) lantern(rearApproach, x, -0.4, 1.8);
  district.add(rearApproach);
  const beacon = new T.Group();
  beacon.position.set(-32, 0, -43);
  for (const side of [-1, 1])
    beam(
      beacon,
      new T.Vector3(side * 1.4, 0.2, 0),
      new T.Vector3(side * 0.45, 12, 0),
      0.14,
      ivory,
    );
  const orbit = ring(beacon, bronze, 2.3, 0.055, 0, 10.2);
  orbit.rotation.x = 0.35;
  orbit.material = metal(bronze);
  nearMark(beacon, "#9cc7b0", 2.0).position.set(0, 11.3, 0.12);
  district.add(beacon);
  for (const building of district.children) batchStatic(building);
  scene.add(district);
}
