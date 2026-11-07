import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { KeyPair, JsonRpcProvider } from "near-api-js";
import { writeFile } from "node:fs/promises";
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
    if (message.text().includes("BufferGeometryUtils"))
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
  await page.getByRole("button", { name: /Return to your park/ }).click();
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

test("sponsored NEAR round confirms through the complete browser flow", async ({
  page,
}) => {
  test.skip(
    process.env.MOON_CHAIN_UI !== "1",
    "Opt-in test spends testnet sponsorship; use MOON_CHAIN_UI=1.",
  );
  test.setTimeout(420000);
  page.setDefaultTimeout(15000);
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
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("building-inspector")).toContainText(
    "Mass-Driver Coaster",
  );
  await page.getByRole("button", { name: /Connect entrance/ }).click();
  await page.getByLabel("Ticket price").fill("1000");
  await page.getByRole("button", { name: "Merchant partnerships" }).click();
  await page.getByRole("button", { name: "Partner with Omar" }).click();
  await expect(page.getByTestId("partnership-1")).toContainText(
    "reserved on NEAR",
  );
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = JSON.parse(
            localStorage.getItem("moonpark-current") || "null",
          );
          return s?.state.record?.run.tick ?? 0;
        }),
      { timeout: 90000, intervals: [2000] },
    )
    .toBeGreaterThan(40);
  await page.reload();
  await page.getByRole("button", { name: /Return to your park/ }).click();
  await expect(
    page.getByRole("button", { name: "4×", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = JSON.parse(
            localStorage.getItem("moonpark-current") || "null",
          );
          return (
            s?.state.record?.run.finished === true && s.state.pending === 0
          );
        }),
      { timeout: 290000, intervals: [2000] },
    )
    .toBe(true);
  const result = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("moonpark-current")!);
    return {
      run: s.state.run,
      record: s.state.record,
      txs: s.state.txs,
      error: s.state.error,
      receipts: s.state.receipts,
    };
  });
  expect(result.run).toEqual(result.record.run);
  expect(
    result.record.run.buildings.some(
      (b: { kind: string }) => b.kind === "coaster",
    ),
  ).toBe(true);
  expect(result.record.ranked).toBe(false);
  expect(result.txs.length).toBeGreaterThan(20);
  expect(result.record.run.partnerships[0].status).toBe("completed");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("moonpark-current")!).state.receipts[
          "1"
        ].payment,
    ),
  ).toBeTruthy();
  expect(result.error).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "outputs/moon-near-browser-result.png" });
  await page.getByRole("button", { name: "Your NEAR business shares" }).click();
  const share = page
    .locator(".mp-owned-share")
    .filter({ hasText: "Omar’s concession" });
  await expect(share).toBeVisible({ timeout: 30000 });
  await expect(
    share.getByRole("button", { name: "Collect reward" }),
  ).toBeEnabled();
  await share.getByRole("button", { name: "Collect reward" }).click();
  await expect(
    share.getByRole("button", { name: "Collected", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("link", { name: /Confirmed on NEAR/ }),
  ).toBeVisible();
  await page.screenshot({ path: "outputs/moon-concession-collected.png" });
  await page.getByRole("button", { name: "Close panel" }).click();
  await page
    .getByRole("button", { name: /Build a better opening day/ })
    .click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("button", { name: "Build Mass-Driver Coaster" }),
  ).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "View NEAR economy" }).click();
  await expect(
    share.getByRole("button", { name: "Collected", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(share.getByText("YOURS", { exact: true })).toBeVisible();
  const root = await page.evaluate(async () => {
    const c = (await (await fetch("/moon-config.json")).json()) as {
      contractId: string;
    };
    return c.contractId.replace(/^economy\./, "");
  });
  await share
    .getByRole("button", { name: "Transfer ownership", exact: true })
    .click();
  await share.getByLabel("New owner’s NEAR testnet account").fill(root);
  await share
    .getByRole("button", { name: "Review transfer", exact: true })
    .click();
  await expect(
    share.getByRole("button", {
      name: "Confirm ownership transfer",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  await share
    .getByRole("button", { name: "Confirm ownership transfer", exact: true })
    .click();
  await expect(
    page.getByText(`Ownership transferred to ${root}`, { exact: true }),
  ).toBeVisible({
    timeout: 45000,
  });
  const config = await page.evaluate(
    async () =>
      (await (await fetch("/moon-config.json")).json()) as {
        rpcUrl: string;
        contractId: string;
      },
  );
  const transferred = await new JsonRpcProvider({
    url: config.rpcUrl,
  }).callFunction<{ owner_id: string }>({
    contractId: config.contractId,
    method: "get_business_share",
    args: { token_id: `${result.record.run_id}:1` },
  });
  expect(transferred?.owner_id).toBe(root);
  expect(errors).toEqual([]);
  await writeFile(
    "outputs/moon-ui-proof.json",
    JSON.stringify(
      {
        url: process.env.GAME_URL ?? "http://localhost:5173",
        runId: result.record.run_id,
        owner: result.record.owner,
        ranked: result.record.ranked,
        score: result.run.score,
        tradeCount: result.run.trade_count,
        hash: result.run.hash,
        partnerships: result.run.partnerships,
        receipts: result.receipts,
        transactions: result.txs,
        browserTestPassed: true,
        businessRewardCollected: true,
        businessSharesPersistAfterReplay: true,
        concessionTransferredTo: root,
      },
      null,
      2,
    ),
  );
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
  await expect(page.getByText("Own your share", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Competition escrow", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/moon-near-mobile-explanation.png" });
});

test("merchant partnership reserves funding, rewards service, and shuttles carry departures", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page);
  await page.getByRole("button", { name: "Merchant partnerships" }).click();
  await page.getByRole("button", { name: "Partner with Omar" }).click();
  await expect(page.getByTestId("partnership-1")).toContainText(
    "180 credits reserved in practice",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("moonpark-current")!).state.run
          .grant_escrow,
    ),
  ).toBe(18000);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  // Observe the running timer before jumping it, so the speed effect is installed.
  await expect
    .poll(() =>
      page.locator("main.moonpark").getAttribute("data-tick").then(Number),
    )
    .toBeGreaterThan(12);
  await page.clock.install();
  await page.clock.fastForward(60000);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("moonpark-current")!).state.run
              .partnerships[0].status,
        ),
      { timeout: 20000 },
    )
    .toBe("completed");
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          JSON.parse(
            localStorage.getItem("moonpark-current")!,
          ).state.run.departures.reduce((a: number, b: number) => a + b, 0),
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Merchant partnerships" }).click();
  await expect(page.getByTestId("partnership-1")).toContainText("Paid +180");
  await page.screenshot({ path: "outputs/moon-partnership-paid.png" });
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
