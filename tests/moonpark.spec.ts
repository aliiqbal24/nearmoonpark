import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { KeyPair } from "near-api-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import type { Run } from "../lib/moon/model";

function project(page: Page, x: number, z: number, peak = 12) {
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
function mapPoint(page: Page, x: number, z: number) {
  const { width, height } = page.viewportSize()!;
  const camera = new PerspectiveCamera(50, width / height, 0.1, 2200);
  camera.position.set(28, 72, 58);
  camera.lookAt(0, 0, -15);
  camera.updateMatrixWorld();
  const p = new Vector3((x - 24) * 1.25, 0, (z - 36) * 1.25).project(camera);
  return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2 };
}
async function drawCoaster(page: Page, name = "Earthskimmer") {
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Coaster map designer" }),
  ).toBeVisible();
  await page.getByLabel("Attraction name", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Stardust colors", exact: true })
    .click();
  let p = mapPoint(page, 2.2, 34.2);
  await page.mouse.click(p.x, p.y);
  p = mapPoint(page, 9.5, 35.5);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (const [x, z] of [
    [15.5, 35.5],
    [15.5, 20.5],
    [3.5, 20.5],
    [3.5, 33.5],
  ]) {
    p = mapPoint(page, x, z);
    await page.mouse.move(p.x, p.y, { steps: 10 });
  }
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Close loop to station", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Build coaster · 1,200", exact: true }),
  ).toBeEnabled();
}
async function opening(page: Page) {
  await open(page);
  await drawCoaster(page);
  await page
    .getByRole("button", { name: "Build coaster · 1,200", exact: true })
    .click();
  await expect.poll(async () => (await savedRun(page)).opening_stage).toBe(2);
  await expect(
    page.getByRole("region", { name: "Coaster map designer" }),
  ).toHaveCount(0);
}

test("starter stores wait for a coaster drawn over the map, then welcome the first rocket", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  let run = await savedRun(page);
  expect(run.buildings.map((b) => b.kind)).toEqual(["food", "drink", "depot"]);
  expect(run.cash).toBe(320000);
  expect(run.buildings.every((b) => b.connected && b.ready_at === 0)).toBe(
    true,
  );
  await page.waitForTimeout(1200);
  expect((await savedRun(page)).tick).toBe(0);
  await drawCoaster(page);
  expect((await savedRun(page)).cash).toBe(320000);
  await page.screenshot({ path: "outputs/moon-v9-map-drawing.png" });
  await page
    .getByRole("button", { name: "Build coaster · 1,200", exact: true })
    .click();
  await expect.poll(async () => (await savedRun(page)).opening_stage).toBe(2);
  run = await savedRun(page);
  expect(run.cash).toBe(200000);
  expect(run.buildings[3].design?.map_track).toBe(true);
  expect(run.buildings[3].design?.name).toBe("Earthskimmer");
  expect(run.buildings[3].design?.palette).toBe(3);
  expect(run.buildings[3].connected).toBe(true);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "4×", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Ticket price", { exact: true })).toHaveCount(0);
  await expect
    .poll(async () => (await savedRun(page)).tick, { timeout: 18000 })
    .toBeGreaterThanOrEqual(11);
  expect(
    (await savedRun(page)).guests.some((g) => g.status !== "upcoming"),
  ).toBe(true);
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  const tick = (await savedRun(page)).tick;
  await page.waitForTimeout(1300);
  expect((await savedRun(page)).tick).toBe(tick);
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await expect
    .poll(async () => (await savedRun(page)).tick)
    .toBeGreaterThan(tick);
  await page.screenshot({ path: "outputs/moon-v9-opening-gameplay.png" });
  expect(errors).toEqual([]);
});

test("paths paint a continuous drag before purchase and staff portraits expose business status", async ({
  page,
}) => {
  await opening(page);
  await expect(
    page.getByRole("button", { name: "Economy ledger", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Build path", exact: true }).click();
  const before = await savedRun(page);
  const start = project(page, 33.3, 37.3),
    finish = project(page, 39.3, 37.3);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y, { steps: 12 });
  await expect(page.locator(".mp-path-preview")).toContainText("7 tiles");
  expect((await savedRun(page)).paths).toEqual(before.paths);
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        (await savedRun(page)).paths.filter(
          (c) => c >= 37 * 48 + 33 && c <= 37 * 48 + 39,
        ).length,
    )
    .toBe(7);
  await page
    .getByRole("button", { name: "View Illia’s status", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Attention Kitchen");
  await expect(page.getByRole("dialog")).toContainText("Business cash");
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page
    .getByRole("button", { name: "View Haseeb’s status", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Repairs completed");
});

test("Lunar Bounce height is selected before placement and the catalogue scrolls", async ({
  page,
}) => {
  await opening(page);
  const dock = page.getByLabel("Building catalogue", { exact: true });
  await dock.hover();
  await page.mouse.wheel(0, 550);
  await expect
    .poll(() => dock.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Build Solar Canopy", exact: true })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "5 credits every 20 seconds",
  );
  await page
    .getByRole("button", { name: "Build Lunar Bounce", exact: true })
    .click();
  await page.getByRole("button", { name: "22 m", exact: true }).click();
  await page
    .getByRole("button", { name: "Place attraction", exact: true })
    .click();
  const p = project(page, 26.2, 29.2, 22);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(async () => (await savedRun(page)).buildings.length)
    .toBe(5);
  expect((await savedRun(page)).buildings[4].design?.bounce_height).toBe(22);
  await expect(page.getByLabel("Ticket price", { exact: true })).toHaveCount(0);
});

test("coaster drafts and confirmed progress survive refresh", async ({
  page,
}) => {
  await open(page);
  await drawCoaster(page, "Permanent Moon");
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Build Mass-Driver Coaster",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  await expect(page.getByLabel("Attraction name", { exact: true })).toHaveValue(
    "Permanent Moon",
  );
  await page
    .getByRole("button", { name: "Build coaster · 1,200", exact: true })
    .click();
  await expect
    .poll(async () => (await savedRun(page)).buildings.length)
    .toBe(4);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Lunar Bounce", exact: true }),
  ).toBeVisible();
  expect((await savedRun(page)).buildings[3].design?.name).toBe(
    "Permanent Moon",
  );
  await expect(
    page.getByRole("button", { name: "Skip intro", exact: true }),
  ).toHaveCount(0);
});

test("mobile map drawing leaves the park visible and options scroll within the screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("button", { name: "Build Mass-Driver Coaster", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Coaster map designer" });
  const bounds = await panel.boundingBox();
  expect(bounds!.height).toBeLessThan(844 * 0.4);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("button", { name: "Cancel coaster design", exact: true })
    .click();
  await page.screenshot({ path: "outputs/moon-v9-foundation-mobile.png" });
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
  for (const version of ["v6", "v7", "v8"]) {
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
    expect(run.buildings.length).toBe(version === "v8" ? 0 : 2);
    expect(run.cash).toBe(version === "v6" ? 160000 : 320000);
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
    { timeout: 15000 },
  );
  await expect(page.locator('[data-testid="moon-world"] canvas')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible({ timeout: 60000 });
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
    await page
      .getByRole("button", { name: "How to play", exact: true })
      .click();
    expect((await savedRun(page)).buildings[3].design?.name).toBe(
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
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  const restored = await savedRun(page);
  expect(restored.buildings).toHaveLength(5);
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
    page.getByRole("button", { name: "Start a new park", exact: true }),
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

test("sponsored map drawing settles vendor wallets, survives refresh and publishes a visitable park", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.MOON_CHAIN_UI,
    "Opt in to sponsored NEAR testnet transactions.",
  );
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open your park", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Build Mass-Driver Coaster",
      exact: true,
    }),
  ).toBeVisible({ timeout: 90000 });
  await mkdir(".near-local", { recursive: true });
  await writeFile(
    ".near-local/moon-v9-browser-qa.json",
    await page.evaluate(() => localStorage.getItem("moonpark-current")!),
    { mode: 0o600 },
  );
  await drawCoaster(page, "Lunar Daydream");
  await page
    .getByRole("button", { name: "Build coaster · 1,200", exact: true })
    .click();
  await expect
    .poll(async () => (await savedRun(page)).trade_count, { timeout: 90000 })
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "View Illia’s status", exact: true })
    .click();
  await expect(page.locator(".mp-wallet-list a")).toHaveAttribute(
    "href",
    /address\/illia\./,
    { timeout: 30000 },
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Attention Is All You Knead",
  );
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page
    .getByRole("button", { name: "My park and ride exchange", exact: true })
    .click();
  await page
    .getByLabel("Park name", { exact: true })
    .fill("Lunar Daydream Gardens");
  const publish = page.getByRole("button", {
    name: "Publish this park revision",
    exact: true,
  });
  await expect(publish).toBeEnabled({ timeout: 60000 });
  await publish.click();
  await expect(
    page.getByText(
      "Your park is published. Share its link and invite someone aboard.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 60000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("moonpark-current")!),
  );
  expect(saved.state.mode).toBe("near");
  expect(saved.state.run.version).toBe("moonpark-v9");
  expect(saved.state.pending).toBe(0);
  expect(saved.state.error).toBeFalsy();
  await mkdir(".near-local", { recursive: true });
  await writeFile(
    ".near-local/moon-v9-browser-qa.json",
    JSON.stringify(saved),
    { mode: 0o600 },
  );
  const publicPath = `/park/${saved.credentials.accountId}?version=v9`;
  const visitor = await context.newPage();
  await visitor.goto(publicPath);
  await expect(
    visitor.getByRole("heading", { name: /Lunar Daydream Gardens/ }),
  ).toBeVisible({ timeout: 30000 });
  await visitor.screenshot({ path: "outputs/moon-v9-public-browser-park.png" });
  await visitor.close();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Lunar Bounce", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  expect((await savedRun(page)).buildings[3].design?.name).toBe(
    "Lunar Daydream",
  );
  await page.screenshot({ path: "outputs/moon-v9-live-browser-park.png" });
  await writeFile(
    "docs/moon-v9-browser-smoke.json",
    JSON.stringify(
      {
        contractId: saved.config.contractId,
        version: saved.state.run.version,
        runId: saved.state.record.run_id,
        owner: saved.credentials.accountId,
        tick: saved.state.run.tick,
        trades: saved.state.run.trade_count,
        pending: 0,
        transactions: saved.state.txs,
        publicPath,
        refreshVerified: true,
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});

test("map previews and Rust agree on the rail corridor for all station orientations", async () => {
  const { buildingCells } = await import("../lib/moon/model");
  const { packMapTrack, stationPoints } = await import("../lib/moon/map-track");
  for (const rotation of [0, 1, 2, 3]) {
    const points = [
      ...stationPoints({ x: 2, z: 30 }, rotation),
      { x: 155, y: 120, z: 280 },
      { x: 155, y: 220, z: 125 },
      { x: 15, y: 180, z: 125 },
      { x: 15, y: 90, z: 280 },
    ];
    const plan = packMapTrack(points);
    const run = await wasmRun({
      op: "step",
      run: await wasmRun({ op: "new" }),
      commands: [{ kind: "build", item: "coaster", ...plan }],
      ticks: 0,
    });
    const blocked = new Set(
      run.buildings.flatMap((b) => buildingCells(b, 48, true)),
    );
    const free = Array.from({ length: 48 * 48 }, (_, i) => i).filter(
      (i) => !blocked.has(i),
    );
    run.cash += 1000000;
    run.supplier_cash -= 1000000;
    const painted = await wasmRun({
      op: "step",
      run,
      commands: [{ kind: "paint_paths", cells: free }],
      ticks: 0,
    });
    expect(free.every((cell) => painted.paths.includes(cell))).toBe(true);
    for (const cell of blocked) {
      await expect(
        wasmRun({
          op: "step",
          run,
          commands: [{ kind: "paint_paths", cells: [cell] }],
          ticks: 0,
        }),
      ).rejects.toThrow(/building|station/);
    }
  }
});
