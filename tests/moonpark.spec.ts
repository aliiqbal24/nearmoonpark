import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { KeyPair, JsonRpcProvider, Account, KeyPairSigner } from "near-api-js";
import { readFile, writeFile } from "node:fs/promises";
function project(page: Page, x: number, z: number, y = 0.1) {
  const size = page.viewportSize()!;
  const camera = new PerspectiveCamera(50, size.width / size.height, 0.1, 250);
  camera.position.set(32, 28, 44);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const p = new Vector3((x - 16) * 1.25, y, (z - 12) * 1.25).project(camera);
  return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
}
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice offline", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
}
test("opening day: build, connect, tune, economy, ride camera and closing", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.text().includes("BufferGeometryUtils") ||
      message.text().includes("Texture marked for update but no image data")
    )
      errors.push(message.text());
  });
  await open(page);
  await expect(page.locator(".mp-blueprint-art img")).toHaveCount(8);
  await expect
    .poll(() =>
      page
        .locator(".mp-blueprint-art img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const canvas = page.locator('[data-testid="moon-world"] canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((e) =>
    e.setAttribute("data-session-canvas", "original"),
  );
  await page.getByRole("button", { name: "Build Mass-Driver Coaster" }).click();
  const p = project(page, 3.2, 8.2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("building-inspector")).toContainText(
    "Mass-Driver Coaster",
  );
  await expect(
    page.getByRole("button", { name: /Connect entrance/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Connect entrance/ }).click();
  await expect(
    page.getByRole("button", { name: /Connect entrance/ }),
  ).toHaveCount(0);
  await page.getByLabel("Ticket price").fill("900");
  await expect(page.getByLabel("Ticket price")).toHaveValue("900");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("moonpark-current")!,
          ).state.run.buildings.find(
            (b: { kind: string }) => b.kind === "coaster",
          ).price,
      ),
    )
    .toBe(900);
  await page.getByRole("button", { name: "Gentle", exact: true }).click();
  await page.getByRole("button", { name: "Ride the mass driver" }).click();
  await expect(page.getByText("FRONT SEAT / MASS DRIVER")).toBeVisible();
  await page.screenshot({ path: "outputs/moon-ride-camera.png" });
  await page.getByRole("button", { name: "Back to your park" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await expect
    .poll(
      async () =>
        Number(await page.locator("main.moonpark").getAttribute("data-tick")),
      { timeout: 20000 },
    )
    .toBeGreaterThan(40);
  await page.getByRole("button", { name: "Economy ledger" }).click();
  await expect(
    page.getByRole("heading", { name: "Follow the lunar credits" }),
  ).toBeVisible();
  await expect(page.locator(".mp-ledger>div")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.screenshot({ path: "outputs/moon-gameplay.png" });
  await page.clock.install();
  await page.clock.fastForward(550000);
  // The replay catches up through bounded async batches after this clock jump.
  await expect(
    page
      .locator(".mp-results")
      .getByText("OPENING DAY COMPLETE", { exact: false }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.locator("canvas[data-session-canvas=original]"),
  ).toHaveCount(1);
  await page.screenshot({ path: "outputs/moon-results.png" });
  await page.reload();
  await page.getByRole("button", { name: /Return to your park/ }).click();
  await expect(
    page
      .getByText("GOLD OPENING DAY", { exact: true })
      .or(page.getByText("SILVER OPENING DAY", { exact: true }))
      .or(page.getByText("BRONZE OPENING DAY", { exact: true })),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile park and conditional top-five board remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(page.locator(".mp-leader")).toHaveCount(5);
  await expect(
    page.getByText("If we win, you win.", { exact: true }),
  ).toBeVisible();
  await page.locator(".mp-prize").scrollIntoViewIfNeeded();
  await expect(page.getByText("$400", { exact: true })).toBeVisible();
  await page.screenshot({ path: "outputs/moon-mobile-leaderboard.png" });
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.screenshot({ path: "outputs/moon-mobile.png" });
});
test("overlap is rejected without spending and construction survives reload", async ({
  page,
}) => {
  await open(page);
  const before = await page.locator("main.moonpark").getAttribute("data-cash");
  await page.getByRole("button", { name: "Build Lunar Bounce" }).click();
  const p = project(page, 11.2, 16.2);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByRole("status")).toContainText("occupied");
  expect(await page.locator("main.moonpark").getAttribute("data-cash")).toBe(
    before,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Build path", exact: true }).click();
  const tile = project(page, 20.2, 19.2);
  expect(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("moonpark-current")!,
      ).state.run.paths.includes(19 * 32 + 20),
    ),
  ).toBe(false);
  await page.mouse.click(tile.x, tile.y);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("moonpark-current")!,
        ).state.run.paths.includes(19 * 32 + 20),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Erase paths", exact: true }).click();
  await page.mouse.click(tile.x, tile.y);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("moonpark-current")!,
        ).state.run.paths.includes(19 * 32 + 20),
      ),
    )
    .toBe(false);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
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
  const renamed = await request.post("/api/moon/profile", {
    headers: { origin: new URL(baseURL!).origin },
    data: { display_name: "Unauthorized" },
  });
  expect(renamed.status()).toBe(401);
});

test("sponsored NEAR round publishes a customized park and signature ride", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_CHAIN_UI !== "1",
    "Opt-in public testnet sponsorship.",
  );
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open your park", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Build Mass-Driver Coaster" }).click();
  const p = project(page, 3.2, 8.2);
  await page.mouse.click(p.x, p.y);
  await page.getByRole("button", { name: /Connect entrance/ }).click();
  await page.getByText("Customize your attraction").click();
  await page.getByLabel("Attraction name").fill("Earthskimmer");
  await page.getByLabel("Attraction name").press("Enter");
  await page
    .getByRole("button", { name: "Stardust colors", exact: true })
    .click();
  await page.getByRole("button", { name: "Orbital", exact: true }).click();
  await page.getByRole("button", { name: "Close inspector" }).click();
  await page
    .getByRole("button", { name: "Economy ledger", exact: true })
    .click();
  await page.getByText("View testnet wallets", { exact: true }).click();
  await expect(page.locator(".mp-wallet-list > div")).toHaveCount(5, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("link", { name: /Omar · Moon Pie Kitchen/ }),
  ).toHaveAttribute("href", /omar\..*\.testnet$/);
  await expect(
    page.getByRole("link", { name: /Mina · Crater Coolers/ }),
  ).toHaveAttribute("href", /mina\..*\.testnet$/);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  let recordedSyncError = false;
  await expect
    .poll(
      async () => {
        const status = await page.evaluate(() => {
          const s = JSON.parse(
            localStorage.getItem("moonpark-current") || "null",
          );
          return {
            complete:
              s?.state.record?.run.finished === true && s.state.pending === 0,
            error: s?.state.error,
            tick: s?.state.run.tick,
            confirmed: s?.state.record?.run.tick,
            owner: s?.state.record?.owner,
          };
        });
        if (status.error && !recordedSyncError) {
          recordedSyncError = true;
          console.log(
            "NEAR synchronization diagnostic",
            JSON.stringify(status),
          );
          const saved = await page.evaluate(
            () => localStorage.getItem("moonpark-current")!,
          );
          await writeFile(".near-local/moon-sync-debug.json", saved, {
            mode: 0o600,
          });
        }
        return status.complete;
      },
      { timeout: 420000, intervals: [2000] },
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Publish your park & signature rides" })
    .click();
  await expect(page.getByRole("tab", { name: "My park" })).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel("Park name").fill("Earthrise Gardens");
  await page.getByRole("button", { name: "Publish this opening day" }).click();
  await expect(
    page.getByText("Your park is published.", { exact: false }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByRole("tab", { name: "Ride exchange" }).click();
  const card = page.locator("article").filter({ hasText: "Earthskimmer" });
  await card.getByRole("button", { name: "Publish design" }).click();
  await expect(
    card.getByRole("button", { name: "Published", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("moonpark-current")!).state,
  );
  expect(saved.run).toEqual(saved.record.run);
  expect(saved.run.partnerships).toEqual([]);
  expect(
    saved.run.buildings.find((b: { kind: string }) => b.kind === "coaster")
      .design.name,
  ).toBe("Earthskimmer");
  await writeFile(
    "outputs/moon-v5-browser-proof.json",
    JSON.stringify(
      {
        owner: saved.record.owner,
        parkId: saved.record.park_id,
        runId: saved.record.run_id,
        score: saved.run.score,
        txs: saved.txs,
        hash: saved.run.hash,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});

test("opening clock waits for the first landing", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("opening-day-clock")).toHaveText("9:00");
  await expect(page.getByText("FIRST LANDING", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await expect
    .poll(
      async () =>
        Number(await page.locator("main.moonpark").getAttribute("data-tick")),
      { timeout: 10000 },
    )
    .toBeGreaterThan(10);
  await expect(page.getByTestId("opening-day-clock")).not.toHaveText("9:00");
});

test("NEAR ownership explanation is clear and fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "How NEAR drives your park" }).click();
  await expect(
    page.getByRole("heading", { name: "Your economy. Secured by NEAR." }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "My park" })).toBeVisible();
  await expect(page.getByLabel("Park name")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rankings & prize escrow" }),
  ).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/moon-near-mobile-explanation.png" });
});

test("attraction customization previews immediately and persists through reload", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Build Mass-Driver Coaster" }).click();
  const p = project(page, 3.2, 8.2);
  await page.mouse.click(p.x, p.y);
  await page.getByText("Customize your attraction").click();
  await page.getByLabel("Attraction name").fill("Starlight Express");
  await page.getByLabel("Attraction name").press("Enter");
  await page
    .getByRole("button", { name: "Stardust colors", exact: true })
    .click();
  const families = page.getByRole("group", { name: "Architectural design" });
  await expect(families.getByRole("button")).toHaveCount(3);
  await expect
    .poll(() =>
      families
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await families
    .getByRole("button", { name: "Expedition", exact: true })
    .click();
  await expect(page.locator(".mp-building-icon img")).toHaveAttribute(
    "src",
    "/art/coaster-s2-v3.webp",
  );
  await families
    .getByRole("button", { name: "Retro Resort", exact: true })
    .click();
  await expect(page.locator(".mp-building-icon img")).toHaveAttribute(
    "src",
    "/art/coaster-s0-v3.webp",
  );
  await page.getByRole("button", { name: "Orbital", exact: true }).click();
  await page.getByRole("button", { name: "Neon", exact: true }).click();
  await page.getByRole("button", { name: "Skyline +200", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("moonpark-current")!).state.run
            .buildings[2].design,
      ),
    )
    .toEqual({
      name: "Starlight Express",
      palette: 3,
      style: 1,
      lights: 2,
      height: 2,
    });
  await page.screenshot({ path: "outputs/moon-customized-ride.png" });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("moonpark-current")!).state.run
            .buildings[2].design.name,
      ),
    )
    .toBe("Starlight Express");
  await expect(
    page.getByRole("button", { name: "Merchant partnerships" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "My park and ride exchange" }).click();
  await page
    .getByRole("button", { name: "Earthrise colors", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("moonpark-current")!).state.run
            .palette,
      ),
    )
    .toBe(1);
  await page.getByLabel("Park name").fill("Moonbeam Gardens");
  await page.getByRole("button", { name: "Save park identity" }).click();
  await expect(
    page.getByText("Park identity saved in this browser.", { exact: false }),
  ).toBeVisible();
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
  ).toBeVisible();
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

test("published park visits show the verified layout and allow coaster rides", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_PUBLIC_UI !== "1",
    "Read-only public testnet fixture. Use MOON_PUBLIC_UI=1.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/park/p-1?version=v5");
  await expect(
    page.getByRole("heading", { name: /Earthrise Gardens/ }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("7,161 points", { exact: true })).toBeVisible();
  const current = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  await expect(
    page.getByRole("link", { name: /Park ownership & day/ }),
  ).toHaveAttribute(
    "href",
    `https://testnet.nearblocks.io/address/${current.contractId}`,
  );

  await expect(page.locator('[data-testid="moon-world"] canvas')).toBeVisible();
  await page.screenshot({ path: "outputs/moon-public-park-desktop.png" });
  await page
    .getByRole("button", { name: "Ride the mass driver", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back to the park", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the park", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: /Earthrise Gardens/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/moon-public-park-mobile.png" });
  expect(errors).toEqual([]);
});

test("ride exchange licenses a design, credits its creator and builds its verified configuration", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_CHAIN_UI !== "1",
    "Opt-in testnet licensing proof.",
  );
  test.setTimeout(120000);
  const cfg = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  const proof = JSON.parse(
    await readFile("docs/moon-v5-testnet-smoke.json", "utf8"),
  );
  const saved = JSON.parse(
    await readFile(`.near-local/${proof.ownershipProof.buyer}.json`, "utf8"),
  );
  const provider = new JsonRpcProvider({ url: cfg.rpcUrl });
  const account = new Account(
    saved.accountId,
    provider,
    KeyPairSigner.fromSecretKey(saved.secretKey),
  );
  const record = await account.callFunction({
    contractId: cfg.contractId,
    methodName: "create_run",
    args: { challenge_id: "moonpark-v5", request_id: crypto.randomUUID() },
    gas: 180000000000000n,
    waitUntil: "FINAL",
  });
  const mine = await provider.callFunction<{ id: string }>({
    contractId: cfg.contractId,
    method: "get_park_by_operator",
    args: { account_id: saved.accountId },
  });
  const designs = await provider.callFunction<
    {
      id: string;
      park_id: string;
      creator: string;
      name: string;
      design: { palette: number };
    }[]
  >({
    contractId: cfg.contractId,
    method: "list_blueprints",
    args: { limit: 24 },
  });
  if (!mine || !designs?.length)
    throw Error("The testnet park and blueprint fixtures must exist.");
  let chosen = designs[0];
  let newLicense = false;
  for (const design of designs) {
    if (design.park_id === mine.id) continue;
    const owned = await provider.callFunction({
      contractId: cfg.contractId,
      method: "has_license",
      args: { park_id: mine.id, blueprint_id: design.id },
    });
    if (!owned) {
      chosen = design;
      newLicense = true;
      break;
    }
  }
  const creator = await provider.callFunction<{ owner: string }>({
    contractId: cfg.contractId,
    method: "get_park",
    args: { park_id: chosen.park_id },
  });
  if (!creator) throw Error("Creator park is missing.");
  const before = await provider.callFunction<{ available: string }>({
    contractId: cfg.contractId,
    method: "get_creator_earnings",
    args: { account_id: creator.owner },
  });
  if (!before) throw Error("Creator earnings could not be read.");
  const credentials = {
    accountId: saved.accountId,
    secretKey: saved.secretKey,
    recoveryKey: saved.secretKey,
    identity: "license-proof",
    contractId: cfg.contractId,
  };
  await page.goto("/");
  await page.evaluate(
    ({ credentials, cfg, record }) => {
      localStorage.setItem(
        `moonpark-keys:${credentials.identity}:${cfg.contractId}`,
        JSON.stringify(credentials),
      );
      localStorage.setItem(
        `moonpark-active:${cfg.contractId}`,
        credentials.accountId,
      );
      localStorage.setItem(
        "moonpark-current",
        JSON.stringify({
          state: {
            run: record.run,
            mode: "near",
            record,
            pending: 0,
            error: null,
            txs: [],
            deadline: Number(BigInt(record.deadline) / 1000000n),
          },
          ops: [],
          credentials,
          config: cfg,
        }),
      );
    },
    { credentials, cfg, record: record as { run: unknown; deadline: string } },
  );
  await page.reload();
  await page.getByRole("button", { name: "My park and ride exchange" }).click();
  await page.getByRole("tab", { name: "Ride exchange" }).click();
  const card = page.locator("article").filter({ hasText: chosen.creator });
  await card.getByRole("button", { name: /License & build/ }).click();
  await expect(page.getByRole("button", { name: "Close panel" })).toHaveCount(
    0,
    { timeout: 45000 },
  );
  const p = project(page, 3.2, 8.2);
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = JSON.parse(localStorage.getItem("moonpark-current")!).state;
          return s.record.run.buildings.at(-1)?.blueprint_id ?? null;
        }),
      { timeout: 45000 },
    )
    .toBe(chosen.id);
  const after = await provider.callFunction<{ available: string }>({
    contractId: cfg.contractId,
    method: "get_creator_earnings",
    args: { account_id: creator.owner },
  });
  if (!after)
    throw Error("Creator earnings could not be read after licensing.");
  expect(BigInt(after.available) - BigInt(before.available)).toBe(
    newLicense ? 4500000000000000000000n : 0n,
  );
  await page.screenshot({ path: "outputs/moon-licensed-ride.png" });
  await writeFile(
    "outputs/moon-v5-license-ui-proof.json",
    JSON.stringify(
      {
        parkId: mine.id,
        blueprintId: chosen.id,
        creator: creator.owner,
        creditedYocto: (
          BigInt(after.available) - BigInt(before.available)
        ).toString(),
        licensePreviouslyOwned: !newLicense,
        verifiedConstruction: true,
      },
      null,
      2,
    ),
  );
});

test("private park backups validate account control, restore ownership and export account history", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_CHAIN_UI !== "1",
    "Opt-in testnet recovery fixture.",
  );
  test.setTimeout(90000);
  const cfg = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  const proof = JSON.parse(
    await readFile("docs/moon-v5-testnet-smoke.json", "utf8"),
  );
  const saved = JSON.parse(
    await readFile(`.near-local/${proof.ownershipProof.buyer}.json`, "utf8"),
  );
  const credentials = {
    accountId: saved.accountId,
    secretKey: saved.secretKey,
    recoveryKey: saved.secretKey,
    identity: "backup-proof",
    contractId: cfg.contractId,
  };
  const backup = {
    format: "moonpark-account-backup-v1",
    credentials,
    accounts: [credentials],
  };
  await page.goto("/?parkdesk=1");
  await page
    .getByText("Use an existing park on this browser", { exact: true })
    .click();
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: "invalid-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...backup,
        credentials: {
          ...credentials,
          secretKey: KeyPair.fromRandom("ed25519").toString(),
        },
        accounts: [],
      }),
    ),
  });
  await expect(page.locator(".mp-inline-error")).toBeVisible({
    timeout: 30000,
  });
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith("moonpark-keys:")),
    ),
  ).toBe(false);
  await file.setInputFiles({
    name: "park-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText("Account restored.", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "How NEAR drives your park" }).click();
  await expect(page.locator(".mp-ownership-card code")).toHaveText(
    saved.accountId,
    { timeout: 30000 },
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export private park backup" })
    .click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.format).toBe("moonpark-account-backup-v1");
  expect(
    exported.accounts.map((c: { accountId: string }) => c.accountId),
  ).toContain(saved.accountId);
});

test("a queued cosmetic edit survives resuming an already closed NEAR day", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_CHAIN_UI !== "1",
    "Opt-in closed-day journal recovery proof.",
  );
  test.setTimeout(90000);
  const cfg = JSON.parse(await readFile("public/moon-config.json", "utf8"));
  const proof = JSON.parse(
    await readFile("docs/moon-v5-testnet-smoke.json", "utf8"),
  );
  const saved = JSON.parse(
    await readFile(`.near-local/${proof.owner}.json`, "utf8"),
  );
  const provider = new JsonRpcProvider({ url: cfg.rpcUrl });
  const record = await provider.callFunction<{
    run: unknown;
    deadline: string;
    run_id: string;
  }>({
    contractId: cfg.contractId,
    method: "get_run",
    args: { run_id: proof.runId },
  });
  if (!record) throw Error("Completed chain fixture is missing.");
  const id = crypto.randomUUID();
  const credentials = {
    accountId: saved.accountId,
    secretKey: saved.secretKey,
    recoveryKey: saved.secretKey,
    identity: "closed-day-proof",
    contractId: cfg.contractId,
  };
  await page.goto("/");
  await page.evaluate(
    ({ cfg, credentials, record, id }) => {
      localStorage.setItem(
        `moonpark-keys:${credentials.identity}:${cfg.contractId}`,
        JSON.stringify(credentials),
      );
      localStorage.setItem(
        `moonpark-active:${cfg.contractId}`,
        credentials.accountId,
      );
      localStorage.setItem(
        "moonpark-current",
        JSON.stringify({
          state: {
            run: record.run,
            mode: "near",
            record,
            pending: 1,
            error: null,
            txs: [],
            deadline: Number(BigInt(record.deadline) / 1000000n),
          },
          credentials,
          config: cfg,
          ops: [{ commands: [{ kind: "theme", value: 1 }], ticks: 0, id }],
        }),
      );
    },
    { cfg, credentials, record, id },
  );
  await page.reload();
  await page.getByRole("button", { name: /Return to your park/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = JSON.parse(localStorage.getItem("moonpark-current")!).state;
          return s.pending === 0 ? s.record.last_request : null;
        }),
      { timeout: 45000 },
    )
    .toBe(id);
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("moonpark-current")!).state,
  );
  expect(state.run.palette).toBe(1);
  expect(state.run.score).toEqual(proof.score);
  expect(state.run.finished).toBe(true);
  await page
    .getByRole("button", { name: "Look around your park", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Economy ledger", exact: true })
    .click();
  await page.getByText("View testnet wallets", { exact: true }).click();
  await expect(page.locator(".mp-wallet-list > div")).toHaveCount(5, {
    timeout: 30000,
  });
  await page.screenshot({ path: "outputs/moon-v5-vendor-wallets.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Close panel" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/moon-v5-vendor-wallets-mobile.png" });
});

test("sponsorship failure can open practice immediately without replaying the intro", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/moon/provision", (route) => {
    attempts++;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "The testnet sponsorship reserve needs replenishing. Practice is available.",
      }),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open your park", exact: true })
    .click();
  await page.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play practice instead", exact: true }),
  ).toBeVisible();
  // The recovery controls must outlive the transient error toast.
  await page.waitForTimeout(6500);
  await page.getByRole("button", { name: "Retry NEAR", exact: true }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(
    page.getByRole("button", { name: "Play practice instead", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play practice instead", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("moonpark-current")!).state.mode,
    ),
  ).toBe("practice");
  await expect(page.locator(".mp-intro")).toHaveCount(0);
});

test("practice refresh resumes automatically even after its old wall-clock deadline", async ({
  page,
}) => {
  await open(page);
  const savedTick = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("moonpark-current")!);
    saved.state.deadline = Date.now() - 3600000;
    localStorage.setItem("moonpark-current", JSON.stringify(saved));
    return saved.state.run.tick;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Return to your park/ }),
  ).toHaveCount(0);
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("moonpark-current")!).state,
  );
  expect(restored.run.tick).toBeGreaterThanOrEqual(savedTick);
  expect(restored.run.finished).toBe(false);
  expect(restored.deadline).toBeGreaterThan(Date.now());
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

test("eight building types keep the two merchant businesses automatic", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".mp-blueprint-art img")).toHaveCount(8);
  const kitchen = project(page, 19, 18, 1);
  await page.mouse.click(kitchen.x, kitchen.y);
  await expect(
    page.getByRole("heading", { name: "Moon Pie Kitchen", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("10% of sales", { exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Revenue share" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Invest|Support Omar/ }),
  ).toHaveCount(0);
});

test("v4 practice saves resume with the archived engine", async ({ page }) => {
  const wasm = await WebAssembly.compile(
    new Uint8Array(await readFile("public/engine/moon-v4.wasm")),
  );
  const exports = new WebAssembly.Instance(wasm, {}).exports as {
    memory: WebAssembly.Memory;
    sim_alloc: (n: number) => number;
    sim_call: (p: number, n: number) => bigint;
    sim_free: (p: number, n: number) => void;
  };
  const bytes = new TextEncoder().encode(JSON.stringify({ op: "new" }));
  const ptr = exports.sim_alloc(bytes.length);
  new Uint8Array(exports.memory.buffer, ptr, bytes.length).set(bytes);
  const output = exports.sim_call(ptr, bytes.length);
  exports.sim_free(ptr, bytes.length);
  const address = Number(output >> 32n),
    length = Number(output & 0xffffffffn);
  const run = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(exports.memory.buffer, address, length),
    ),
  ).run;
  exports.sim_free(address, length);
  expect(run.version).toBe("moonpark-v4");
  await page.goto("/");
  await page.evaluate(
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
            deadline: Date.now() + 565000,
          },
          ops: [],
          credentials: null,
          config: null,
        }),
      ),
    run,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        Number(await page.locator(".moonpark").getAttribute("data-tick")),
      { timeout: 20000 },
    )
    .toBeGreaterThanOrEqual(2);
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("moonpark-current")!).state,
  );
  expect(state.run.version).toBe("moonpark-v4");
  expect(state.error).toBeNull();
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
