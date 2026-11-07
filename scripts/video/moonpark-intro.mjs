import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GAME_URL || "http://127.0.0.1:5173",
  sample = process.argv.includes("--sample");
await mkdir("outputs/moonpark-cinema", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
try {
  await page.route("**/moonpark-cinema-capture", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
    }),
  );
  await page.goto(base + "/moonpark-cinema-capture");
  await page.evaluate(async () => {
    const [{ MoonWorld }, { dreamPark }, { simulate }] = await Promise.all([
      import("/lib/moon/world.ts"),
      import("/lib/moon/dream.ts"),
      import("/lib/moon/engine.ts"),
    ]);
    document.body.replaceChildren();
    document.body.style.cssText = "margin:0;overflow:hidden;background:black";
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0";
    document.body.append(host);
    const world = new MoonWorld(host, {
      autoStart: false,
      onPick() {},
      onHover() {},
      onPlace() {},
      onReady() {},
    });
    const run = dreamPark(await simulate({ op: "new" }));
    world.update(run, 1, null, null, 0, null);
    await new Promise((r) => setTimeout(r, 1000));
    window.film = { world, run };
  });
  const render = async (t) => {
    await page.evaluate((t) => {
      const { world, run } = window.film;
      for (const g of run.guests) {
        if (g.status === "walking" && g.route.length > 1) {
          const n = g.route.length,
            index =
              (g.id * 3 + Math.floor(t * (0.8 + (g.id % 3) * 0.15))) %
              (n * 2 - 2);
          g.cell = g.route[index < n ? index : n * 2 - 2 - index];
        }
      }
      world.renderIntroAt(t);
    }, t);
  };
  if (sample) {
    for (const t of [2, 8, 12, 16, 20, 23, 26, 30, 34, 38]) {
      await render(t);
      await page.screenshot({
        path: `outputs/moonpark-cinema/sample-${t}.png`,
      });
    }
    console.log("Cinematic samples captured");
  } else {
    const ff = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        "30",
        "-i",
        "pipe:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-an",
        "-movflags",
        "+faststart",
        "outputs/moonpark-cinema/picture-master.mp4",
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    let ffError;
    ff.on("error", (e) => (ffError = e));
    for (let i = 0; i < 1200; i++) {
      if (ffError) throw ffError;
      await render(i / 30);
      const png = await page.screenshot({ type: "png", animations: "allow" });
      if (!ff.stdin.write(png)) await once(ff.stdin, "drain");
      if (i % 150 === 0) console.log(`Intro render ${i}/1200 frames`);
    }
    ff.stdin.end();
    const [code] = await once(ff, "exit");
    if (code !== 0) throw Error(`FFmpeg exited ${code}`);
    console.log("Rendered 1080p / 30fps picture master");
  }
} finally {
  await browser.close();
}
