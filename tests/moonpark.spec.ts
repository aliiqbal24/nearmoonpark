import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { KeyPair } from "near-api-js";
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
    .getByRole("button", { name: "Open your park", exact: true })
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
  await open(page);
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
  await expect(
    page.getByText("OPENING DAY COMPLETE", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
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
  await page.getByRole("button", { name: "Play on NEAR", exact: true }).click();
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
  expect(result.error).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "outputs/moon-near-browser-result.png" });
});
