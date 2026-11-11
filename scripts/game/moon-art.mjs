import { chromium } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Menu portraits are photographed from the same editable models as the live park.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    ...(process.env.MOON_CAPTURE_GPU === "1"
      ? ["--enable-gpu", "--use-angle=vulkan", "--ignore-gpu-blocklist"]
      : []),
  ],
});
await mkdir("outputs/moonpark-art", { recursive: true });
await mkdir("public/art", { recursive: true });
const page = await browser.newPage({ viewport: { width: 512, height: 384 } });
page.on("console", (message) => {
  if (message.text().startsWith('{"asset"')) console.log(message.text());
});
page.on("pageerror", (error) => {
  throw error;
});
try {
  await page.route("**/moonpark-art-capture", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto(
    (process.env.GAME_URL || "http://127.0.0.1:5173") + "/moonpark-art-capture",
  );
  await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { lunarEnvironment, SUN_DIRECTION } = await import(
      "/lib/moon/sky.ts"
    );
    const assets = await import("/lib/moon/assets.ts");
    const { simulate } = await import("/lib/moon/engine.ts");
    document.body.style.cssText = "margin:0;background:transparent";
    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(2);
    renderer.setSize(512, 384);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = T.AgXToneMapping;
    renderer.toneMappingExposure = 1.18;
    document.body.append(renderer.domElement);
    const scene = new T.Scene();
    const environment = lunarEnvironment(renderer);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.75;
    scene.add(new T.HemisphereLight("#93b8e0", "#555962", 0.23));
    const sun = new T.DirectionalLight("#ffe4c4", 4.2);
    sun.position.copy(SUN_DIRECTION).multiplyScalar(60);
    scene.add(sun);
    const rim = new T.DirectionalLight("#83b9ed", 0.65);
    rim.position.set(20, 8, -25);
    scene.add(rim);
    window.art = {
      T,
      renderer,
      scene,
      assets,
      base: (await simulate({ op: "new" })).buildings[0],
      model: null,
    };
  });
  const selection = process.argv
    .find((arg) => arg.startsWith("--only="))
    ?.slice(7)
    .split(",");
  const names = [
    "bounce",
    "wheel",
    "rover",
    "coaster",
    "food",
    "drink",
    "depot",
    "solar",
    ...Array.from({ length: 3 }, (_, group) =>
      Array.from({ length: 6 }, (_, variant) => `guest-${group}-${variant}`),
    ).flat(),
    "advisor",
    "owner-food",
    "owner-drink",
    "owner-depot",
  ].filter(
    (name) =>
      !selection ||
      selection.some(
        (selected) => name === selected || name.startsWith(`${selected}-`),
      ),
  );
  let count = 0;
  for (const name of names) {
    const portrait =
      name.startsWith("guest") ||
      name.startsWith("owner") ||
      name === "advisor";
    for (const style of portrait ? [0] : [0, 1, 2]) {
      const asset = portrait ? name : `${name}-s${style}`;
      await page.evaluate(
        async ({ name, style }) => {
          const { T, renderer, scene, assets, base } = window.art;
          if (window.art.model) {
            scene.remove(window.art.model);
            assets.disposeObject(window.art.model);
          }
          const portrait =
            name.startsWith("guest") ||
            name.startsWith("owner") ||
            name === "advisor";
          const colors = ["#f3be82", "#8eddd3", "#bc9fe9"];
          const owners = {
            "owner-food": "#f2ad6b",
            "owner-drink": "#7ad7f1",
            "owner-depot": "#ea91ba",
          };
          const model = portrait
            ? null
            : assets.createBuilding({
                ...base,
                kind: name,
                rotation: 0,
                launch: 2,
                design: { name: "", palette: 255, style, lights: 1, height: 1 },
              });
          if (model?.upAt) {
            for (let i = 0; i < 1000; i++) {
              const up = model.upAt(i / 1000);
              if (up.dot(model.upAt((i + 1) / 1000)) < 0.8)
                throw Error(`Abrupt coaster roll in style ${style}`);
              if (Math.abs(up.dot(model.curve.getTangentAt(i / 1000))) > 0.001)
                throw Error(`Invalid coaster frame in style ${style}`);
            }
          }
          const object = portrait
            ? assets.astronaut(
                owners[name] ??
                  (name === "advisor"
                    ? "#8eddd3"
                    : colors[Number(name.split("-")[1])]),
                1,
                name === "advisor"
                  ? 4
                  : name === "owner-food"
                    ? 4
                    : name === "owner-drink"
                      ? 3
                      : name === "owner-depot"
                        ? 2
                        : Number(name.split("-")[2]) || 0,
              )
            : model.root;
          object.traverse((mesh) => {
            if (
              mesh.isMesh &&
              !mesh.geometry.attributes.position.array.every(Number.isFinite)
            )
              throw Error(`Non-finite ${name} geometry`);
          });
          scene.add(object);
          window.art.model = object;
          const bounds = new T.Box3().setFromObject(object),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          const span = portrait
            ? size.y * 1.15
            : Math.max(size.x, size.y * 1.1, size.z) * 0.95;
          const camera = new T.OrthographicCamera(
            (-span * 4) / 6,
            (span * 4) / 6,
            span / 2,
            -span / 2,
            0.1,
            100,
          );
          if (portrait) {
            camera.position.copy(center).add(new T.Vector3(0.6, 0.22, 3.2));
            object.userData.arms[1].rotation.z = 2.1;
          } else camera.position.copy(center).add(new T.Vector3(8, 6.5, 10));
          camera.lookAt(center);
          if (!portrait) {
            camera.updateMatrixWorld();
            const projected = new T.Box3();
            for (const x of [bounds.min.x, bounds.max.x])
              for (const y of [bounds.min.y, bounds.max.y])
                for (const z of [bounds.min.z, bounds.max.z]) {
                  projected.expandByPoint(
                    new T.Vector3(x, y, z).applyMatrix4(
                      camera.matrixWorldInverse,
                    ),
                  );
                }
            const halfHeight =
              Math.max(
                (projected.max.y - projected.min.y) / 2,
                ((projected.max.x - projected.min.x) * 3) / 8,
              ) * 1.06;
            camera.left = (-halfHeight * 4) / 3;
            camera.right = (halfHeight * 4) / 3;
            camera.top = halfHeight;
            camera.bottom = -halfHeight;
            camera.updateProjectionMatrix();
          }
          renderer.render(scene, camera);
          console.log(
            JSON.stringify({
              asset: name,
              calls: renderer.info.render.calls,
              triangles: renderer.info.render.triangles,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          renderer.render(scene, camera);
        },
        { name, style },
      );
      const source = `outputs/moonpark-art/${asset}.png`;
      await page
        .locator("canvas")
        .screenshot({ path: source, omitBackground: true });
      const encode = spawnSync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        source,
        "-lossless",
        "1",
        "-quality",
        "100",
        "-compression_level",
        "6",
        `outputs/moonpark-art/${asset}.webp`,
      ]);
      if (encode.status) throw Error(encode.stderr.toString());
      await rename(
        `outputs/moonpark-art/${asset}.webp`,
        `public/art/${asset}-v3.webp`,
      );
      count++;
    }
  }
  console.log(`Photographed ${count} assets`);
} finally {
  await browser.close();
}
