import { test, expect, type Page } from "@playwright/test";
import { OrthographicCamera, Vector3 } from "three";

async function expectRenderedPark(page: Page) {
  await expect
    .poll(
      () =>
        page.locator("canvas").evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          return new Promise<number>((resolve) =>
            requestAnimationFrame(() => {
              const gl = canvas.getContext("webgl2")!;
              const pixel = new Uint8Array(4);
              gl.readPixels(
                Math.floor(canvas.width / 2),
                Math.floor(canvas.height / 2),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixel,
              );
              resolve(pixel[3]);
            }),
          );
        }),
      { timeout: 15000 },
    )
    .toBe(255);
}

test("isometric preview compares cameras, picks attractions and preserves the saved park", async ({
  page,
}) => {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem("moonpark-current", "preserve-this-park"),
  );
  await page.goto("/lab/isometric");
  await expect(page.locator("main.camera-preview")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
  await expect(
    page.getByRole("button", { name: "Isometric", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("canvas")).toBeVisible();
  await expectRenderedPark(page);
  const viewport = page.viewportSize()!;
  const aspect = viewport.width / viewport.height;
  const halfHeight =
    Math.sqrt(35 ** 2 * 3) *
    Math.tan((25 * Math.PI) / 180) *
    Math.max(1, 0.95 / aspect);
  const camera = new OrthographicCamera(
    -halfHeight * aspect,
    halfHeight * aspect,
    halfHeight,
    -halfHeight,
    0.1,
    2200,
  );
  camera.position.set(35, 35, 37);
  camera.lookAt(0, 0, 2);
  camera.updateMatrixWorld();
  const wheel = new Vector3(10, 3.56, -6.25).project(camera);
  await page.mouse.click(
    ((wheel.x + 1) / 2) * viewport.width,
    ((1 - wheel.y) / 2) * viewport.height,
  );
  await expect(page.locator(".camera-preview-selection strong")).toHaveText(
    "Earthrise Wheel",
  );
  await page.screenshot({
    path: "outputs/moonpark-cinematic-rework/isometric-preview-desktop.png",
  });
  await page.getByRole("button", { name: "Perspective", exact: true }).click();
  await expect(page.locator("main.camera-preview")).toHaveAttribute(
    "data-projection",
    "perspective",
  );
  await expectRenderedPark(page);
  await page.getByRole("button", { name: "Reset preview camera" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(
    page.getByRole("button", { name: "Play animation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play animation" }).click();
  await page.getByLabel("Park layout").selectOption("opening");
  await expect(page.locator(".camera-preview-selection")).toHaveCount(0);
  await page.getByRole("button", { name: "Isometric", exact: true }).click();
  await page.mouse.move(800, 550);
  await page.mouse.wheel(0, -250);
  await page.mouse.down();
  await page.mouse.move(900, 600, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Reset preview camera" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("moonpark-current")),
  ).toBe("preserve-this-park");
  expect(writes.filter((url) => !url.includes("__nextjs"))).toEqual([]);
  expect(errors).toEqual([]);
});

test("isometric preview fits phone screens and switches layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab/isometric");
  await expect(page.locator("main.camera-preview")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15000 },
  );
  await expectRenderedPark(page);
  await expect(
    page.getByRole("button", { name: "Isometric", exact: true }),
  ).toBeInViewport();
  await expect(page.getByLabel("Park layout")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Reset preview camera" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "outputs/moonpark-cinematic-rework/isometric-preview-mobile.png",
  });
  await page.getByRole("button", { name: "Perspective", exact: true }).click();
  await page.getByLabel("Park layout").selectOption("opening");
  await expect(page.locator("main.camera-preview")).toHaveAttribute(
    "data-projection",
    "perspective",
  );
});
