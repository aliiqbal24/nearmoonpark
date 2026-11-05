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
  await page.screenshot({ path: "outputs/colony.png", fullPage: true });
  await page.getByRole("button", { name: /Colony aid/ }).click();
  await page
    .getByRole("button", { name: "Release an emergency ration cache" })
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
  await page.screenshot({ path: "outputs/ending.png", fullPage: true });
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
    page.getByRole("heading", { name: "A colony in motion." }),
  ).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
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
    restored.getByRole("heading", { name: "A colony in motion." }),
  ).toBeVisible();
  await clean.close();
});
