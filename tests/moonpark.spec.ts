import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { KeyPair } from "near-api-js";
import { readFile } from "node:fs/promises";
import type { Run } from "../lib/moon/model";

function project(page: Page, x: number, z: number, peak = 36) {
  const { width, height } = page.viewportSize()!;
  const camera = new PerspectiveCamera(50, width / height, 0.1, 2200);
  if (peak > 18) {
    const distance =
      Math.max(105, peak * 2.7) * Math.max(1, 0.9 / (width / height));
    const target = new Vector3(0, peak * 0.25, -2);
    camera.position
      .copy(target)
      .add(new Vector3(0.45, 0.55, 0.9).normalize().multiplyScalar(distance));
    camera.lookAt(target);
  } else {
    camera.position.set(31, 38, 57);
    camera.lookAt(0, 0, -5);
  }
  camera.updateMatrixWorld();
  const p = new Vector3((x - 24) * 1.25, 0.1, (z - 36) * 1.25).project(camera);
  return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2 };
}
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice offline", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Build Mass-Driver Coaster",
      exact: true,
    }),
  ).toBeVisible();
}
async function savedRun(page: Page): Promise<Run> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("moonpark-current")!).state.run,
  );
}
async function opening(page: Page) {
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .click();
  let point = project(page, 2.2, 16.2);
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId("building-inspector")).toContainText(
    "Mass-Driver Coaster",
  );
  await expect.poll(async () => (await savedRun(page)).buildings[0].x).toBe(2);
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build Moon Pie Kitchen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Place attraction", exact: true })
    .click();
  point = project(page, 26.2, 41.2);
  await page.mouse.click(point.x, point.y);
  await expect.poll(async () => (await savedRun(page)).opening_stage).toBe(2);
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
}
async function planPoint(page: Page, x: number, z: number) {
  const rect = await page
    .getByRole("group", { name: "Coaster track schematic" })
    .boundingBox();
  const scale = Math.min(rect!.width, rect!.height) / 320;
  return {
    x: rect!.x + (rect!.width - 320 * scale) / 2 + (x + 10) * scale,
    y: rect!.y + (rect!.height - 320 * scale) / 2 + (z + 10) * scale,
  };
}

test("opening starts with a designed coaster and restaurant, then unlocks the park", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator(".mp-blueprint")).toHaveCount(1);
  await page.waitForTimeout(1400);
  expect((await savedRun(page)).tick).toBe(0);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("16 × 21 tiles");
  await page
    .getByLabel("Attraction name", { exact: true })
    .fill("Earthskimmer");
  await page
    .getByRole("button", { name: "Stardust colors", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .click();
  let point = project(page, 2.2, 16.2);
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId("building-inspector")).toContainText(
    "Earthskimmer",
  );
  let run = await savedRun(page);
  expect(run.cash).toBe(200000);
  expect(run.opening_stage).toBe(1);
  expect(run.tick).toBe(0);
  expect(run.buildings[0].connected).toBe(true);
  expect(run.buildings[0].design?.palette).toBe(3);
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await expect(page.locator(".mp-blueprint")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Build Moon Pie Kitchen", exact: true })
    .click();
  await page.getByRole("button", { name: "Orbital", exact: true }).click();
  await page
    .getByRole("button", { name: "Place attraction", exact: true })
    .click();
  point = project(page, 26.2, 41.2);
  await page.mouse.click(point.x, point.y);
  await expect.poll(async () => (await savedRun(page)).opening_stage).toBe(2);
  run = await savedRun(page);
  expect(run.cash).toBe(185000);
  expect(run.buildings[1].connected).toBe(true);
  expect(run.buildings[1].design?.style).toBe(1);
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await expect(page.locator(".mp-blueprint")).toHaveCount(9);
  await expect(
    page.getByRole("button", { name: "4×", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "2×", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".mp-subhud")).not.toContainText("power");
  await expect
    .poll(async () => (await savedRun(page)).tick, { timeout: 18000 })
    .toBeGreaterThanOrEqual(11);
  expect(
    (await savedRun(page)).guests.some((g) => g.status !== "upcoming"),
  ).toBe(true);
  await page.screenshot({ path: "outputs/moon-v8-opening-gameplay.png" });
  expect(errors).toEqual([]);
});

test("cursor-drawn loops snap closed and support a 30×30 footprint and 60m hill", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Draw your own", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Place coaster", exact: true }),
  ).toBeDisabled();
  for (const [x, z] of [
    [295, 5],
    [5, 5],
    [35, 220],
  ]) {
    const p = await planPoint(page, x, z);
    await page.mouse.click(p.x, p.y);
  }
  await page.getByLabel("Selected turn height", { exact: true }).fill("600");
  await page
    .getByRole("button", { name: "Join back to station", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("30 × 30 tiles");
  await expect(page.getByRole("dialog")).toContainText("60 m peak");
  await expect(
    page.getByRole("button", { name: "Place coaster", exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: "outputs/moon-v8-custom-track.png" });
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .click();
  const p = project(page, 3.2, 6.2, 60);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => (await savedRun(page)).buildings.length)
    .toBe(1);
  const run = await savedRun(page);
  expect(run.buildings[0].design?.track_w).toBe(30);
  expect(run.buildings[0].design?.track_h).toBe(30);
  expect(run.buildings[0].design?.track?.some((p) => p.y === 600)).toBe(true);
});

test("track handles drag, keyboard editing and undo retain a valid design", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  const handle = page.getByRole("button", {
    name: "Track point 4, 30.0 metres",
    exact: true,
  });
  const box = await handle.boundingBox();
  const dest = await planPoint(page, 250, 120);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(dest.x, dest.y, { steps: 12 });
  await page.mouse.up();
  const moved = page.getByRole("button", {
    name: "Track point 4, 30.0 metres",
    exact: true,
  });
  await expect(moved).toHaveAttribute("cx", "250");
  await expect(moved).toHaveAttribute("cy", "120");
  await moved.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(moved).toHaveAttribute("cx", "245");
  await page
    .getByRole("button", { name: "Undo track edit", exact: true })
    .click();
  await expect(moved).toHaveAttribute("cx", "250");
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .click();
  const p = project(page, 2.2, 16.2);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => (await savedRun(page)).buildings.length)
    .toBe(1);
  await page
    .getByRole("button", { name: "Design your coaster", exact: true })
    .click();
  const cash = (await savedRun(page)).cash;
  await page.getByLabel("Selected turn height").fill("450");
  await page.waitForTimeout(1500);
  expect((await savedRun(page)).tick).toBe(0);
  await page.getByRole("button", { name: "Apply design", exact: true }).click();
  expect((await savedRun(page)).cash).toBe(cash);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Moon Pie Kitchen", exact: true }),
  ).toBeVisible();
  expect(
    (await savedRun(page)).buildings[0].design?.track?.some((p) => p.y === 450),
  ).toBe(true);
});

test("catalogue scrolls by wheel and exposes compact building descriptions", async ({
  page,
}) => {
  await opening(page);
  const dock = page.getByLabel("Building catalogue", { exact: true });
  const before = await dock.evaluate((el) => el.scrollLeft);
  await dock.hover();
  await page.mouse.wheel(0, 550);
  await expect
    .poll(() => dock.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);
  await page
    .getByRole("button", { name: "Build Solar Canopy", exact: true })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "5 credits every 20 seconds",
  );
  expect(
    (await page.getByRole("tooltip").boundingBox())!.width,
  ).toBeLessThanOrEqual(210);
  await page
    .getByRole("button", { name: "Build Solar Canopy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Design your Solar Canopy",
  );
  await page.getByRole("button", { name: "Back to park", exact: true }).click();
});

test("ride fares are fixed and selling returns half without an open-close control", async ({
  page,
}) => {
  await opening(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const p = project(page, 8, 25);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("building-inspector")).toBeVisible();
  await expect(page.getByLabel("Ticket price", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  const before = (await savedRun(page)).cash;
  await page.getByRole("button", { name: "Sell · 600", exact: true }).click();
  await expect
    .poll(async () => (await savedRun(page)).cash)
    .toBe(before + 60000);
  expect((await savedRun(page)).buildings[0].sold).toBe(true);
});

test("new park progress and designs survive refresh during onboarding", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await page.getByLabel("Attraction name").fill("Permanent Moon");
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .click();
  const p = project(page, 2.2, 16.2);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => (await savedRun(page)).buildings.length)
    .toBe(1);
  const before = await savedRun(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Moon Pie Kitchen", exact: true }),
  ).toBeVisible();
  const after = await savedRun(page);
  expect(after.hash).toBe(before.hash);
  expect(after.buildings[0].design?.name).toBe("Permanent Moon");
  await expect(
    page.getByRole("button", { name: "Skip intro", exact: true }),
  ).toHaveCount(0);
});

test("mobile workshop and scrollable catalogue remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Coaster track schematic" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Place coaster", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "outputs/moon-v8-workshop-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});

test("cloud recovery endpoints require verified sign-in and enforce same-origin writes", async ({
  request,
  baseURL,
}) => {
  expect((await request.get("/api/moon/save")).status()).toBe(401);
  expect(
    (
      await request.put("/api/moon/save", {
        headers: { origin: new URL(baseURL!).origin },
        data: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.put("/api/moon/save", {
        headers: { origin: "https://other.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("v6 and v7 engines and earlier ownership desks remain available", async ({
  page,
}) => {
  for (const version of ["v6", "v7"]) {
    await page.goto(`/archive/${version}`);
    await expect(
      page.getByRole("heading", { name: "Your earlier parks" }),
    ).toBeVisible();
    const run = await page.evaluate(async (version) => {
      const e = new WebAssembly.Instance(
        await WebAssembly.compile(
          await (await fetch(`/engine/moon-${version}.wasm`)).arrayBuffer(),
        ),
        {},
      ).exports as unknown as {
        memory: WebAssembly.Memory;
        sim_alloc(n: number): number;
        sim_free(p: number, n: number): void;
        sim_call(p: number, n: number): bigint;
      };
      const bytes = new TextEncoder().encode('{"op":"new"}'),
        p = e.sim_alloc(bytes.length);
      new Uint8Array(e.memory.buffer, p, bytes.length).set(bytes);
      const out = e.sim_call(p, bytes.length);
      e.sim_free(p, bytes.length);
      const ptr = Number(out >> 32n),
        length = Number(out & 0xffffffffn);
      const result = JSON.parse(
        new TextDecoder().decode(new Uint8Array(e.memory.buffer, ptr, length)),
      );
      e.sim_free(ptr, length);
      return result.run;
    }, version);
    expect(run.version).toBe(`moonpark-${version}`);
    expect(run.buildings.length).toBe(2);
    expect(run.cash).toBe(version === "v7" ? 320000 : 160000);
  }
});
test("ranked provisioning and player profiles require sign-in", async ({
  request,
  baseURL,
}) => {
  const profile = await request.get("/api/moon/profile");
  expect(profile.ok()).toBe(true);
  expect((await profile.json()).player).toBeNull();
  const keys = [KeyPair.fromRandom("ed25519"), KeyPair.fromRandom("ed25519")];
  const ranked = await request.post("/api/moon/provision", {
    headers: { origin: new URL(baseURL!).origin },
    data: {
      ranked: true,
      recoveryPublicKey: keys[0].getPublicKey().toString(),
      sessionPublicKey: keys[1].getPublicKey().toString(),
    },
  });
  expect(ranked.status()).toBe(401);
  const unsupported = await request.post("/api/moon/provision", {
    headers: { origin: new URL(baseURL!).origin },
    data: {
      contractId: "other.testnet",
      recoveryPublicKey: keys[0].getPublicKey().toString(),
      sessionPublicKey: keys[1].getPublicKey().toString(),
    },
  });
  expect(unsupported.status()).toBe(400);
  const renamed = await request.post("/api/moon/profile", {
    headers: { origin: new URL(baseURL!).origin },
    data: { display_name: "Unauthorized" },
  });
  expect(renamed.status()).toBe(401);
});

test("opening film decodes, advances smoothly and hands over to the park", async ({
  page,
}) => {
  await page.goto("/");
  const video = page.locator("video.mp-opening-film");
  await expect
    .poll(() => video.evaluate((e: HTMLVideoElement) => e.readyState), {
      timeout: 30000,
    })
    .toBeGreaterThanOrEqual(2);
  await page
    .getByRole("button", { name: "Practice offline", exact: true })
    .click();
  await expect(video).toHaveClass(/playing/);
  await expect(
    page.getByText("A NEAR PROTOCOL PRESENTATION", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => video.evaluate((e: HTMLVideoElement) => e.currentTime), {
      timeout: 10000,
    })
    .toBeGreaterThan(1);
  expect(
    await video.evaluate((e: HTMLVideoElement) => ({
      width: e.videoWidth,
      height: e.videoHeight,
      duration: e.duration,
    })),
  ).toEqual({ width: 1920, height: 1080, duration: 40 });
  await video.evaluate((e: HTMLVideoElement) => (e.currentTime = 15));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "outputs/moon-opening-playback.png" });
  await video.evaluate((e: HTMLVideoElement) => (e.currentTime = 36));
  await expect(page.locator(".mp-intro-captions.is-finale h1")).toHaveText(
    "MOONPARK",
  );
  await expect(
    page.getByText("YOUR PARK. YOUR CREATIONS. ON NEAR.", { exact: true }),
  ).toHaveText("YOUR PARK. YOUR CREATIONS. ON NEAR.");
  await expect
    .poll(() =>
      page
        .locator(".mp-intro-captions.is-finale")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await page.screenshot({ path: "outputs/moon-opening-near-finale.png" });
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
  await expect
    .poll(() => video.evaluate((e: HTMLVideoElement) => e.paused))
    .toBe(true);
});

test("opening remains playable when the movie cannot load", async ({
  page,
}) => {
  await page.route("**/video/*.mp4", (r) => r.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice offline", exact: true })
    .click();
  await expect(page.locator("video.mp-opening-film")).not.toHaveClass(
    /playing/,
  );
  await expect(page.locator('[data-testid="moon-world"] canvas')).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
});

test("sky loads the 8K compressed backdrop and its decoder without using the soft fallback", async ({
  page,
}) => {
  const assets = new Map<string, number>();
  const fallback: string[] = [];
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path.includes("/textures/space/")) assets.set(path, response.status());
  });
  page.on("request", (request) => {
    if (request.url().includes("/textures/space/starmap-v3.webp"))
      fallback.push(request.url());
  });
  await page.goto("/");
  await expect
    .poll(() => assets.get("/textures/space/milkyway-8k-v4.ktx2"), {
      timeout: 30000,
    })
    .toBe(200);
  await expect
    .poll(() => assets.get("/textures/space/basis/basis_transcoder.wasm"), {
      timeout: 30000,
    })
    .toBe(200);
  await page.waitForTimeout(1500);
  expect(fallback).toEqual([]);
});

test("park renders when floating-point color targets are unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getExtension = WebGL2RenderingContext.prototype.getExtension;
    Object.defineProperty(WebGL2RenderingContext.prototype, "getExtension", {
      value: function (this: WebGL2RenderingContext, name: string) {
        return name === "EXT_color_buffer_float"
          ? null
          : Reflect.apply(getExtension, this, [name]);
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await expect(page.locator('[data-testid="moon-world"] canvas')).toBeVisible();
  await expect(
    page.getByText("This park needs WebGL.", { exact: false }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("landing presents NEAR ownership and keeps entry controls clear on compact screens", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open your park", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Explore NEAR Protocol", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your park. Your designs. Yours on NEAR.", { exact: true }),
  ).toBeVisible();
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 390, height: 667 },
  ]) {
    await page.setViewportSize(size);
    const content = await page.locator(".mp-title-content").boundingBox();
    const footer = await page.locator(".mp-title-footer").boundingBox();
    const play = await page
      .getByRole("button", { name: "Open your park", exact: true })
      .boundingBox();
    expect(content!.y + content!.height).toBeLessThan(footer!.y);
    expect(play!.y + play!.height).toBeLessThan(size.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(size.width);
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await open(page);
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Zoom out", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reset camera", exact: true }),
  ).toBeVisible();
});

test("sound package decodes in stereo and the sound control stays consistent into play", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const checks: { duration: number; channels: number }[] = [];
    Object.defineProperty(window, "moonAudioCheck", { value: checks });
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      override async decodeAudioData(bytes: ArrayBuffer) {
        const buffer = await super.decodeAudioData(bytes);
        checks.push({
          duration: buffer.duration,
          channels: buffer.numberOfChannels,
        });
        return buffer;
      }
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enable sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable sound", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { moonAudioCheck: unknown[] }).moonAudioCheck
            .length,
      ),
    )
    .toBe(8);
  const tracks = await page.evaluate(
    () =>
      (
        window as unknown as {
          moonAudioCheck: { duration: number; channels: number }[];
        }
      ).moonAudioCheck,
  );
  expect(tracks.every((track) => track.channels === 2)).toBe(true);
  expect(tracks.some((track) => Math.abs(track.duration - 80) < 0.1)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page
    .getByRole("button", { name: "Practice offline", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enable sound", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toBeVisible();
});

test("earlier park ownership and public visits stay accessible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/archive/v4");
  await expect(
    page.getByRole("heading", { name: "Your earlier parks" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "My park" })).toBeVisible();
  const proof = JSON.parse(
    await readFile("docs/moon-v4-testnet-smoke.json", "utf8"),
  );
  await page.goto(`/park/p-${proof.ownershipProof.park.id}`);
  await expect(
    page.getByRole("heading", { name: /Earthrise Gardens/ }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: /Park ownership & day/ }),
  ).toHaveAttribute("href", /game\.moonpark-mw65jiya\.testnet$/);
  await page.goto(`/park/${proof.ownershipProof.park.owner}`);
  await expect(
    page.getByRole("heading", { name: /Earthrise Gardens/ }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: /Park ownership & day/ }),
  ).toHaveAttribute("href", /game\.moonpark-mw65jiya\.testnet$/);
  expect(errors).toEqual([]);
});

async function wasmRun(input: {
  op: string;
  run?: Run;
  commands?: unknown[];
  ticks?: number;
}): Promise<Run> {
  const e = new WebAssembly.Instance(
    await WebAssembly.compile(
      new Uint8Array(await readFile("public/engine/moon.wasm")),
    ),
    {},
  ).exports as unknown as {
    memory: WebAssembly.Memory;
    sim_alloc(n: number): number;
    sim_free(p: number, n: number): void;
    sim_call(p: number, n: number): bigint;
  };
  const bytes = new TextEncoder().encode(JSON.stringify(input)),
    p = e.sim_alloc(bytes.length);
  new Uint8Array(e.memory.buffer, p, bytes.length).set(bytes);
  const out = e.sim_call(p, bytes.length);
  e.sim_free(p, bytes.length);
  const ptr = Number(out >> 32n),
    length = Number(out & 0xffffffffn),
    result = JSON.parse(
      new TextDecoder().decode(new Uint8Array(e.memory.buffer, ptr, length)),
    );
  e.sim_free(ptr, length);
  if (result.error) throw Error(result.error);
  return result.run;
}
async function mockAccount(page: Page, record: unknown, recovery: unknown) {
  await page.route("**/api/moon/profile", (route) =>
    route.fulfill({
      json: {
        configured: true,
        player: { player_id: "cloud-qa", display_name: "Cloud Explorer" },
      },
    }),
  );
  await page.route("**/api/moon/save**", (route) =>
    route.fulfill({
      json: route.request().method() === "PUT" ? { saved: true } : { recovery },
    }),
  );
  await page.route(
    /^https:\/\/(test\.rpc\.fastnear\.com|rpc\.testnet\.near\.org)\/?$/,
    (route) => {
      const request = route.request().postDataJSON();
      const value =
        request.params?.method_name === "get_run"
          ? record
          : { entries: [], open: true };
      return route.fulfill({
        json: {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            result: [...new TextEncoder().encode(JSON.stringify(value))],
            logs: [],
            block_height: 1,
            block_hash: "11111111111111111111111111111111",
          },
        },
      });
    },
  );
}
test("signed-in recovery restores the same park in two independent browser contexts", async ({
  browser,
}) => {
  const { starterCoaster } = await import("../lib/moon/coaster");
  let run = await wasmRun({ op: "new" });
  run = await wasmRun({
    op: "step",
    run,
    commands: [
      {
        kind: "build",
        item: "coaster",
        x: 2,
        z: 16,
        design: { ...starterCoaster(), name: "Cloud Skimmer" },
      },
      { kind: "build", item: "food", x: 26, z: 41 },
    ],
    ticks: 0,
  });
  const config = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  const credentials = {
    accountId: "cloud-qa.testnet",
    secretKey: KeyPair.fromRandom("ed25519").toString(),
    recoveryKey: KeyPair.fromRandom("ed25519").toString(),
    contractId: config.contractId,
    identity: "cloud-qa",
  };
  const record = {
    run,
    run_id: "42",
    park_id: "42",
    owner: credentials.accountId,
    player_id: "cloud-qa",
    display_name: "Cloud Explorer",
    ranked: false,
    started_at: "1",
    deadline: "0",
    last_request: "opening",
  };
  const ownerCredentials = {
    ...credentials,
    accountId: "owner-cloud-qa.testnet",
    identity: "cloud-owner",
    secretKey: KeyPair.fromRandom("ed25519").toString(),
    recoveryKey: KeyPair.fromRandom("ed25519").toString(),
  };
  const recovery = {
    credentials,
    accounts: [ownerCredentials],
    config,
    runId: "42",
    identity: { name: "Cloud Gardens", emblem: 1 },
  };
  for (let device = 0; device < 2; device++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await mockAccount(page, record, recovery);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Build Lunar Bounce", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    expect((await savedRun(page)).buildings[0].design?.name).toBe(
      "Cloud Skimmer",
    );
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("moonpark-current")!).credentials
            .accountId,
      ),
    ).toBe(credentials.accountId);
    expect(
      await page.evaluate(
        (account) => !!localStorage.getItem(`moonpark-retired-keys:${account}`),
        ownerCredentials.accountId,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Saved to your account", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Skip intro", exact: true }),
    ).toHaveCount(0);
    await context.close();
  }
});
test("resuming reconciles a conflicting edit from another device and keeps compatible changes", async ({
  page,
}) => {
  const { starterCoaster } = await import("../lib/moon/coaster");
  let base = await wasmRun({ op: "new" });
  base = await wasmRun({
    op: "step",
    run: base,
    commands: [
      { kind: "build", item: "coaster", x: 2, z: 16, design: starterCoaster() },
      { kind: "build", item: "food", x: 26, z: 41 },
    ],
    ticks: 0,
  });
  const build = { kind: "build", item: "wheel", x: 30, z: 29 };
  const canonical = await wasmRun({
    op: "step",
    run: base,
    commands: [build],
    ticks: 20,
  });
  let predicted = await wasmRun({
    op: "step",
    run: base,
    commands: [build],
    ticks: 0,
  });
  predicted = await wasmRun({
    op: "step",
    run: predicted,
    commands: [{ kind: "theme", value: 4 }],
    ticks: 10,
  });
  const config = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  const record = {
    run: base,
    run_id: "43",
    park_id: "43",
    owner: "cloud-qa.testnet",
    player_id: "cloud-qa",
    display_name: "Cloud Explorer",
    ranked: false,
    started_at: "1",
    deadline: "0",
    last_request: "opening",
  };
  const save = {
    config,
    credentials: null,
    state: {
      run: predicted,
      record,
      mode: "near",
      pending: 3,
      error: null,
      txs: [],
      deadline: Number.MAX_SAFE_INTEGER,
    },
    ops: [
      { commands: [build], ticks: 0, id: "local-wheel" },
      { commands: [{ kind: "theme", value: 4 }], ticks: 0, id: "local-theme" },
      { commands: [], ticks: 10, id: "local-ticks" },
    ],
  };
  await page.addInitScript(
    (save) => localStorage.setItem("moonpark-current", JSON.stringify(save)),
    save,
  );
  await mockAccount(
    page,
    { ...record, run: canonical, last_request: "another-device" },
    null,
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Build Lunar Bounce", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const restored = await savedRun(page);
  expect(restored.buildings).toHaveLength(3);
  expect(restored.palette).toBe(4);
  expect(restored.tick).toBeGreaterThanOrEqual(20);
  expect(restored.tick).toBeLessThan(25);
  await expect(
    page.getByText(
      "Your park was updated elsewhere. Loaded its confirmed state and kept compatible pending changes.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("moonpark-current")!)
        .ops.filter((op: { commands: unknown[] }) => op.commands.length)
        .map((op: { id: string }) => op.id),
    ),
  ).toEqual(["local-theme"]);
});

test("an unfinished coaster draft survives refresh and can be completed", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await page.getByLabel("Attraction name").fill("Work in Orbit");
  await page
    .getByRole("button", { name: "Draw your own", exact: true })
    .click();
  for (const [x, z] of [
    [240, 200],
    [220, 60],
    [60, 90],
  ]) {
    const point = await planPoint(page, x, z);
    await page.mouse.click(point.x, point.y);
  }
  await page.getByLabel("Selected turn height").fill("550");
  await page.reload();
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(page.getByLabel("Attraction name")).toHaveValue("Work in Orbit");
  await expect(page.getByLabel("Selected turn height")).toHaveValue("550");
  await expect(
    page.getByRole("button", { name: "Place coaster", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Join back to station", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Place coaster", exact: true }),
  ).toBeEnabled();
});

test("earlier saved parks retain usable construction and opening controls", async ({
  page,
}) => {
  const bytes = new Uint8Array(await readFile("public/engine/moon-v6.wasm"));
  const e = new WebAssembly.Instance(await WebAssembly.compile(bytes), {})
    .exports as unknown as {
    memory: WebAssembly.Memory;
    sim_alloc(n: number): number;
    sim_free(p: number, n: number): void;
    sim_call(p: number, n: number): bigint;
  };
  const input = new TextEncoder().encode('{"op":"new"}'),
    ptr = e.sim_alloc(input.length);
  new Uint8Array(e.memory.buffer, ptr, input.length).set(input);
  const out = e.sim_call(ptr, input.length);
  e.sim_free(ptr, input.length);
  const rp = Number(out >> 32n),
    len = Number(out & 0xffffffffn),
    run = JSON.parse(
      new TextDecoder().decode(new Uint8Array(e.memory.buffer, rp, len)),
    ).run;
  e.sim_free(rp, len);
  await page.addInitScript(
    (run) =>
      localStorage.setItem(
        "moonpark-current",
        JSON.stringify({
          state: {
            run,
            mode: "practice",
            record: null,
            pending: 0,
            error: null,
            txs: [],
            deadline: Number.MAX_SAFE_INTEGER,
          },
          config: null,
          credentials: null,
          ops: [],
        }),
      ),
    run,
  );
  await page.goto("/?resumeVersion=moonpark-v6");
  await expect(
    page.getByRole("button", { name: "Start the new workshop", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mp-subhud")).toContainText(
    "power · earlier rules",
  );
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Coaster route handles", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel coaster editing", exact: true })
    .click();
});
