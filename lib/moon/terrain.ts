import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  artSegments,
  batch,
  box,
  glow,
  metal,
  palette,
  shapedBox,
  disposeObject,
} from "./art-kit";
import { WIDTH, HEIGHT } from "./model";

function noise(x: number, z: number) {
  const hash = (a: number, b: number) => {
    const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = x - ix,
    fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx),
    sz = fz * fz * (3 - 2 * fz);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), sx),
    T.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), sx),
    sz,
  );
}

const CRATERS = [
  [-62, -49, 24, 7],
  [58, -68, 27, 8],
  [-7, -120, 43, 12],
  [58, 35, 22, 5],
  [-59, 35, 27, 7],
  [-114, -13, 37, 10],
  [106, -115, 55, 17],
  [-95, -142, 65, 19],
  [25, -260, 105, 23],
  [-32, 13, 4.8, 1.4],
  [39, -35, 5.4, 1.7],
  [14, -55, 3.2, 0.9],
  [-39, -24, 2.8, 0.7],
  [30, 26, 3.8, 1.1],
];

// Permanent resort foundations and their graded edges also keep loose rocks clear.
function resortPadBlend(x: number, z: number) {
  return Math.min(
    T.MathUtils.smoothstep(Math.hypot(x - 37, z + 30), 4.8, 9),
    T.MathUtils.smoothstep(Math.hypot(x + 41, z + 5), 9.5, 14),
    T.MathUtils.smoothstep(
      Math.max(Math.abs(x - 42) - 8.5, Math.abs(z + 2) - 7, 0),
      0,
      5,
    ),
    T.MathUtils.smoothstep(
      Math.max(Math.abs(x) - 24, Math.abs(z + 55) - 10, 0),
      0,
      6,
    ),
  );
}

export function lunarHeight(x: number, z: number) {
  const clearance = Math.max(Math.abs(x) - 32, -48 - z, z - 30, 0);
  const edge = T.MathUtils.smoothstep(clearance, 0, 8);
  let height = 0;
  let amplitude = 1;
  let frequency = 0.026;
  for (let octave = 0; octave < 5; octave++) {
    height += (noise(x * frequency, z * frequency) - 0.5) * amplitude;
    amplitude *= 0.48;
    frequency *= 2.1;
  }
  height *= 2 + T.MathUtils.smoothstep(Math.hypot(x, z), 40, 260) * 23;
  for (const [cx, cz, radius, depth] of CRATERS) {
    const angle = Math.atan2(z - cz, x - cx);
    const r =
      Math.hypot(x - cx, z - cz) / (radius * (1 + Math.sin(angle * 5) * 0.05));
    height -= depth * Math.pow(Math.max(0, 1 - r * r), 1.8);
    height += depth * 0.3 * Math.exp(-Math.pow((r - 1) / 0.15, 2));
  }
  const mountains = T.MathUtils.smoothstep(-z, 65, 220);
  height +=
    mountains *
    (5 + Math.pow(1 - Math.abs(noise(x * 0.018, z * 0.018) * 2 - 1), 3) * 29);
  return height * edge * resortPadBlend(x, z) - 0.32;
}

export function lunarTerrain(scene: T.Scene, compact = false) {
  const loader = new T.TextureLoader();
  const pending: Promise<void>[] = [];
  const texture = (url: string) => {
    let map: T.Texture;
    pending.push(
      new Promise<void>((resolve, reject) => {
        map = loader.load(url, () => resolve(), undefined, reject);
      }),
    );
    return map!;
  };
  const colorMap = texture("/textures/lunar/regolith-color.jpg");
  const normalMap = compact
    ? null
    : texture("/textures/lunar/regolith-normal.jpg");
  const roughnessMap = compact
    ? null
    : texture("/textures/lunar/regolith-roughness.jpg");
  colorMap.colorSpace = T.SRGBColorSpace;
  for (const texture of [colorMap, normalMap, roughnessMap]) {
    if (!texture) continue;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 8;
  }
  const material = new T.MeshStandardMaterial({
    color: "#abc5ec",
    map: colorMap,
    normalMap,
    roughnessMap,
    normalScale: new T.Vector2(0.7, 0.7),
    roughness: 1,
    vertexColors: true,
  });
  const segments = artSegments(440, 200);
  const geometry = new T.PlaneGeometry(1600, 1600, segments, segments);
  const vertices = geometry.attributes.position,
    uv = geometry.attributes.uv;
  const colors = new Float32Array(vertices.count * 3);
  const shade = new T.Color();
  const coordinate = (value: number) => {
    const u = Math.abs(value) / 800;
    return (
      Math.sign(value) *
      (u < 0.8 ? (u / 0.8) * 130 : 130 + Math.pow((u - 0.8) / 0.2, 1.5) * 670)
    );
  };
  for (let i = 0; i < vertices.count; i++) {
    const x = coordinate(vertices.getX(i)),
      z = -coordinate(vertices.getY(i));
    const y = lunarHeight(x, z);
    vertices.setXYZ(i, x, -z, y);
    uv.setXY(i, x / 3.1, z / 3.1);
    const variation = noise(x * 0.1, z * 0.1);
    shade.setRGB(
      0.62 + variation * 0.29,
      0.66 + variation * 0.26,
      0.72 + variation * 0.21,
    );
    shade.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new T.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  const rocks = new T.Group();
  const rockMaterial = material.clone();
  rockMaterial.vertexColors = false;
  rockMaterial.color.set("#a0a9b2");
  let seed = 17791;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < artSegments(390, 150); i++) {
    const angle = random() * Math.PI * 2;
    const distance = 29 + random() ** 1.7 * 120;
    const x = Math.cos(angle) * distance * 1.15,
      z = Math.sin(angle) * distance;
    if ((Math.abs(x) < 32 && z > -48 && z < 32) || resortPadBlend(x, z) < 0.05)
      continue;
    const radius = 0.07 + random() ** 2 * 0.65;
    const rockGeometry = new T.IcosahedronGeometry(radius, 1);
    const position = rockGeometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex++) {
      const px = position.getX(vertex),
        py = position.getY(vertex),
        pz = position.getZ(vertex);
      const deformation = 0.7 + noise(px * 2 + i, pz * 2 - i) * 0.6;
      position.setXYZ(
        vertex,
        px * deformation,
        py * deformation,
        pz * deformation,
      );
    }
    rockGeometry.computeVertexNormals();
    const rock = new T.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, lunarHeight(x, z) + radius * 0.19, z);
    rock.rotation.set(random(), random() * 6.28, random());
    rock.scale.set(1.35, 0.68, 0.9);
    rock.castShadow = rock.receiveShadow = true;
    rocks.add(rock);
  }
  batch(rocks);
  scene.add(rocks);

  // Scanned hero boulders retain the fractured surface of real lunar samples.
  pending.push(
    new GLTFLoader()
      .loadAsync("/models/lunar-rock/moon_rock_02.gltf")
      .then((gltf) => {
        if (scene.userData.disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const sites = [
          [-45, 14, 9],
          [-49, 18, 14],
          [-42, 22, 5],
          [46, -23, 12],
          [46, -32, 7],
          [44, -36, 5],
          [-40, -24, 10],
          [-44, -27, 17],
          [34, 24, 11],
          [30, 27, 5],
          [-36, 30, 16],
          [46, -43, 22],
          [-47, -35, 21],
          [52, 14, 16],
          [-28, 21, 4],
        ];
        const transform = new T.Object3D();
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          const geometry = object.geometry
            .clone()
            .applyMatrix4(object.matrixWorld);
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const mat of materials) mat.side = T.FrontSide;
          const instances = new T.InstancedMesh(
            geometry,
            object.material,
            sites.length,
          );
          for (let i = 0; i < sites.length; i++) {
            const [x, z, scale] = sites[i];
            transform.position.set(x, lunarHeight(x, z) - 0.07, z);
            transform.rotation.set(0, i * 2.399, 0);
            transform.scale.set(scale, scale * (0.8 + (i % 3) * 0.13), scale);
            transform.updateMatrix();
            instances.setMatrixAt(i, transform.matrix);
          }
          instances.castShadow = instances.receiveShadow = true;
          instances.computeBoundingSphere();
          scene.add(instances);
          object.geometry.dispose();
        });
      }),
  );

  // Grade the plot with lunar soil. Only the service boundary is manufactured.
  const deck = new T.Group();
  const width = WIDTH * 1.25,
    depth = HEIGHT * 1.25;
  const plotGeometry = new T.PlaneGeometry(width + 0.2, depth + 0.2, 64, 64);
  const plotUv = plotGeometry.attributes.uv;
  for (let i = 0; i < plotUv.count; i++) {
    plotUv.setXY(
      i,
      ((plotUv.getX(i) - 0.5) * width) / 3.1,
      ((0.5 - plotUv.getY(i)) * depth) / 3.1,
    );
  }
  const plotMaterial = material.clone();
  const plotColors = new Float32Array(plotUv.count * 3);
  for (let i = 0; i < plotUv.count; i++) {
    const p = plotGeometry.attributes.position;
    const x = p.getX(i),
      z = p.getY(i);
    const broad = noise(x * 0.16 + 47, z * 0.16 - 19);
    const fine = noise(x * 1.7, z * 1.7);
    p.setZ(i, (fine - 0.5) * 0.035);
    shade.setRGB(0.69 + broad * 0.27, 0.72 + broad * 0.24, 0.76 + broad * 0.2);
    shade.toArray(plotColors, i * 3);
  }
  plotGeometry.setAttribute("color", new T.BufferAttribute(plotColors, 3));
  plotGeometry.computeVertexNormals();
  plotMaterial.color.set("#bec9dd");
  plotMaterial.normalScale.set(1.15, 1.15);
  const plot = new T.Mesh(plotGeometry, plotMaterial);
  plot.rotation.x = -Math.PI / 2;
  plot.position.y = 0.025;
  plot.receiveShadow = true;
  deck.add(plot);
  // Geological marks stay below paths and foundations, so every tile remains usable.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = compact ? 1024 : 2048;
  const ctx = canvas.getContext("2d")!;
  const px = canvas.width / width;
  for (let i = 0; i < 58; i++) {
    const x = random() * canvas.width,
      z = random() * canvas.height;
    const radius = (0.12 + random() ** 2 * 1.6) * px;
    const hollow = ctx.createRadialGradient(
      x - radius * 0.12,
      z - radius * 0.16,
      0,
      x,
      z,
      radius,
    );
    hollow.addColorStop(0, "rgba(23,32,48,.19)");
    hollow.addColorStop(0.59, "rgba(34,40,55,.12)");
    hollow.addColorStop(0.79, "rgba(197,207,220,.035)");
    hollow.addColorStop(0.89, "rgba(224,224,222,.055)");
    hollow.addColorStop(1, "rgba(180,192,210,0)");
    ctx.fillStyle = hollow;
    ctx.fillRect(x - radius, z - radius, radius * 2, radius * 2);
  }
  // Soft parallel grading tracks give the cleared site a human history.
  ctx.save();
  ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
  ctx.rotate(-0.23);
  for (let i = -26; i < 27; i++) {
    const y = i * px * 1.6;
    ctx.strokeStyle = "rgba(29,39,54,.045)";
    ctx.lineWidth = px * 0.075;
    ctx.beginPath();
    ctx.moveTo(-canvas.width, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < (compact ? 9000 : 26000); i++) {
    const value = random();
    ctx.fillStyle =
      value > 0.75 ? "rgba(229,229,220,.15)" : "rgba(25,34,47,.11)";
    ctx.fillRect(
      random() * canvas.width,
      random() * canvas.height,
      0.7 + random() * 1.4,
      0.7 + random() * 1.4,
    );
  }
  const detailMap = new T.CanvasTexture(canvas);
  detailMap.colorSpace = T.SRGBColorSpace;
  detailMap.anisotropy = 8;
  const geologicalMarks = new T.Mesh(
    new T.PlaneGeometry(width, depth),
    new T.MeshBasicMaterial({
      map: detailMap,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      toneMapped: true,
    }),
  );
  geologicalMarks.name = "graded-lunar-foundation";
  geologicalMarks.rotation.x = -Math.PI / 2;
  geologicalMarks.position.y = 0.05;
  deck.add(geologicalMarks);
  const grit = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    metal("#8a919e"),
    compact ? 280 : 800,
  );
  grit.name = "foundation-mineral-grit";
  const grain = new T.Object3D();
  for (let i = 0; i < grit.count; i++) {
    const size = 0.02 + random() ** 3 * 0.07;
    grain.position.set(
      (random() - 0.5) * width,
      0.035,
      (random() - 0.5) * depth,
    );
    grain.rotation.set(
      random() * Math.PI,
      random() * Math.PI,
      random() * Math.PI,
    );
    grain.scale.set(size * 1.4, size * 0.45, size);
    grain.updateMatrix();
    grit.setMatrixAt(i, grain.matrix);
  }
  grit.receiveShadow = true;
  deck.add(grit);
  for (const x of [-25, -12.5, 0, 12.5, 25]) {
    for (const z of [-25, -12.5, 0, 12.5, 25]) {
      box(deck, "#7d8d9b", x, 0.055, z, 0.32, 0.012, 0.035);
      box(deck, "#7d8d9b", x, 0.055, z, 0.035, 0.012, 0.32);
    }
  }
  deck.position.z = -15;
  for (const side of [-1, 1]) {
    for (let x = -width / 2; x < width / 2; x += 2.5) {
      shapedBox(
        deck,
        "#1a252d",
        x + 1.2,
        -0.04,
        side * (depth / 2 + 0.2),
        2.1,
        0.35,
        0.38,
        0.04,
      );
      box(
        deck,
        "#a3b0b7",
        x + 1.2,
        0.2,
        side * (depth / 2 + 0.22),
        1.85,
        0.035,
        0.1,
      ).material = metal("#a3b0b7");
      box(
        deck,
        "#68ddd8",
        x + 1.2,
        0.1,
        side * (depth / 2 + 0.41),
        0.38,
        0.035,
        0.02,
      ).material = glow("#72e5d5");
    }
    for (let z = -depth / 2; z < depth / 2; z += 2.5) {
      shapedBox(
        deck,
        "#1a252d",
        side * (width / 2 + 0.2),
        -0.04,
        z + 1.2,
        0.38,
        0.35,
        2.1,
        0.04,
      );
      box(
        deck,
        palette.steel,
        side * (width / 2 + 0.22),
        0.2,
        z + 1.2,
        0.1,
        0.035,
        1.85,
      ).material = metal(palette.steel);
    }
  }
  batch(deck);
  scene.add(deck);
  return Promise.all(pending).then(() => undefined);
}
