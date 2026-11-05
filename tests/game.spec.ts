import { test, expect } from "@playwright/test";
const path = [
  "Protect the greenhouse",
  "Support household budgets",
  "Close the water loop",
  "Approve a working-capital grant",
  "Authorize full maintenance",
  "Bring everyone home",
  "Draw down the battery",
  "A promise of mutual aid",
];
test("a full colony: story, aid, decisions, market, ending, refresh and replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /LAST SIGNAL/ }),
  ).toBeVisible();
  await page.screenshot({ path: "outputs/title.png", fullPage: true });
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Take command", exact: true }).click();
  await page.getByRole("button", { name: "Skip transmission" }).click();
  await expect(
    page.getByRole("heading", { name: "The last transmission" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="colony-world"] canvas'),
  ).toBeVisible();
  await page
    .locator('[data-testid="colony-world"] canvas')
    .evaluate((e) => e.setAttribute("data-session-canvas", "original"));
  await page.screenshot({ path: "outputs/colony.png", fullPage: true });
  await page.getByRole("button", { name: /Colony aid/ }).click();
  await page
    .getByRole("button", { name: /Release emergency supplies/ })
    .click();
  await expect(page.getByRole("button", { name: /Colony aid/ })).toContainText(
    "2/3",
  );
  await page.getByRole("button", { name: "Forecast ↗" }).first().click();
  await expect(page.getByText("THREE-SOL CONDITIONAL FORECAST")).toBeVisible();
  for (let i = 0; i < path.length; i++) {
    await page.locator("button.choice").filter({ hasText: path[i] }).click();
    if (i === 0)
      await page.getByRole("button", { name: "Fast", exact: true }).click();
    if (i < 7)
      await expect(
        page.locator("button.choice").filter({ hasText: path[i + 1] }),
      ).toBeVisible({ timeout: 15000 });
  }
  await expect(
    page.getByRole("heading", { name: "A New Dawn", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('canvas[data-session-canvas="original"]'),
  ).toHaveCount(1);
  await page.screenshot({ path: "outputs/ending.png", fullPage: true });
  await page
    .getByRole("button", { name: "Inspect Greenhouse", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect inventory & trades" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Actual trades · last sol" }),
  ).toBeVisible();
  await expect(page.locator(".trade-row")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Resume/ }).click();
  await expect(
    page.getByRole("heading", { name: "A New Dawn", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay this scenario" }).click();
  await page.getByRole("button", { name: "Skip transmission" }).click();
  await page.getByRole("button", { name: "Mission record" }).click();
  await expect(page.getByText(/Seed 42/)).toBeVisible();
  expect(errors).toEqual([]);
});
test("small screen, keyboard and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Take command", exact: true }).click();
  await page.getByRole("button", { name: "Skip transmission" }).click();
  await expect(page.locator("button.choice")).toHaveCount(3);
  await page.screenshot({ path: "outputs/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("NEAR guest provisioning and a real signed decision", async ({
  page,
  browser,
}) => {
  test.skip(!process.env.RUN_NEAR, "Opt in to testnet-sponsored verification.");
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Take command", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Skip transmission" }),
  ).toBeEnabled({ timeout: 120000 });
  await page.getByRole("button", { name: "Skip transmission" }).click();
  await expect(
    page.getByRole("button", { name: "NEAR TESTNET", exact: true }),
  ).toBeVisible();
  await page
    .locator("button.choice")
    .filter({ hasText: "Protect the greenhouse" })
    .click();
  await expect(
    page.getByText("Colony is operating", { exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Pause colony", exact: true }).click();
  await page
    .getByRole("button", { name: "Mission record", exact: true })
    .click();
  await expect(
    page.getByRole("link").filter({ hasText: /^[1-9A-HJ-NP-Za-km-z]{40,50}/ }),
  ).toHaveCount(1);
  await page.screenshot({
    path: "outputs/near-transaction.png",
    fullPage: true,
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export private recovery" }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const recovery = Buffer.concat(chunks);
  const clean = await browser.newContext();
  const restored = await clean.newPage();
  await restored.goto(process.env.GAME_URL || "http://localhost:5173");
  await restored
    .getByLabel("Restore a colony from its private recovery file")
    .setInputFiles({
      name: "recovery.json",
      mimeType: "application/json",
      buffer: recovery,
    });
  await expect(
    restored.getByRole("button", { name: "NEAR TESTNET", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    restored.getByText("Colony paused", { exact: true }),
  ).toBeVisible();
  await clean.close();
});

test("the village stays interactive: camera, residents, speed and opening", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Take command", exact: true }).click();
  await expect(page.locator(".opening-canvas canvas")).toBeVisible();
  await page.waitForTimeout(12500);
  await page.screenshot({ path: "outputs/asteroid-impact.png" });
  await expect(
    page.getByText("IMPACT DETECTED", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip transmission" }).click();
  const canvas = page.locator('[data-testid="colony-world"] canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: /Your decision is needed/ }).click();
  await expect
    .poll(async () => canvas.getAttribute("data-agents"), { timeout: 20000 })
    .toBe("37");
  const zoom = Number(await canvas.getAttribute("data-zoom"));
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-zoom")), {
      timeout: 15000,
    })
    .toBeGreaterThan(zoom + 0.08);
  await page.getByRole("button", { name: "Return to colony overview" }).click();
  const before = await canvas.getAttribute("data-camera");
  await page.mouse.move(500, 470);
  await page.mouse.down();
  await page.mouse.move(600, 510, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => canvas.getAttribute("data-camera"), { timeout: 15000 })
    .not.toBe(before);
  await page.getByRole("button", { name: "Return to colony overview" }).click();
  await page.waitForTimeout(1300);
  let found = false;
  const residents = JSON.parse(
    (await canvas.getAttribute("data-residents")) || "[]",
  ) as { x: number; y: number; name: string }[];
  for (const resident of residents) {
    await page.mouse.move(resident.x, resident.y);
    await page.waitForTimeout(180);
    if (await page.locator(".world-tooltip.person").isVisible()) {
      await page.mouse.click(resident.x, resident.y);
      await page.waitForTimeout(150);
      if (await page.locator(".resident-card").isVisible()) {
        found = true;
        break;
      }
    }
  }
  expect(found).toBe(true);
  await expect(page.locator(".resident-card")).toBeVisible();
  await page.getByRole("button", { name: "Close resident details" }).click();
  await page
    .getByRole("button", { name: "Inspect Greenhouse", exact: true })
    .click();
  await expect(page.locator(".building-inspector")).toContainText("Greenhouse");
  await page.getByRole("button", { name: "Close building inspector" }).click();
  await page.getByRole("button", { name: /Your decision is needed/ }).click();
  await page.locator("button.choice").first().click();
  await page.getByLabel("Simulation speed").fill("4");
  await expect.poll(async () => canvas.getAttribute("data-speed")).toBe("4");
  await page.screenshot({ path: "outputs/living-colony.png" });
});
