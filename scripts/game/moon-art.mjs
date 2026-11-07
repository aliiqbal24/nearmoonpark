import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
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
    const { RoomEnvironment } = await import(
      "/node_modules/three/examples/jsm/environments/RoomEnvironment.js"
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
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    document.body.append(renderer.domElement);
    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.55;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight("#d3f3ff", "#53626e", 1));
    const sun = new T.DirectionalLight("#fff0ce", 3.8);
    sun.position.set(-6, 10, 8);
    scene.add(sun);
    const rim = new T.DirectionalLight("#8be2d5", 2);
    rim.position.set(4, 3, -5);
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
  for (const name of [
    "bounce",
    "wheel",
    "rover",
    "coaster",
    "food",
    "drink",
    "depot",
    "solar",
    "guest-0",
    "guest-1",
    "guest-2",
    "advisor",
    "owner-food",
    "owner-drink",
    "owner-depot",
  ]) {
    await page.evaluate((name) => {
      const { T, renderer, scene, assets, base } = window.art;
      if (window.art.model) scene.remove(window.art.model);
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
      const object = portrait
        ? assets.astronaut(
            owners[name] ??
              (name === "advisor" ? "#8eddd3" : colors[Number(name.at(-1))]),
          )
        : assets.createBuilding({ ...base, kind: name, rotation: 0, launch: 2 })
            .root;
      object.traverse((o) => {
        if (o.userData.sign) o.visible = false;
      });
      scene.add(object);
      window.art.model = object;
      const bounds = new T.Box3().setFromObject(object),
        size = bounds.getSize(new T.Vector3()),
        center = bounds.getCenter(new T.Vector3());
      const span = portrait
        ? 1.25
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
        center.set(0, 0.68, 0);
        camera.position.set(0.6, 0.85, 3);
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
                new T.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
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
    }, name);
    const source = `outputs/moonpark-art/${name}.png`;
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
      `public/art/${name}-v1.webp`,
    ]);
    if (encode.status) throw Error(encode.stderr.toString());
  }
  console.log("Photographed 8 attractions and 7 character portraits");
} finally {
  await browser.close();
}
