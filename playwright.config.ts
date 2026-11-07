import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 90000,
  use: {
    baseURL: process.env.GAME_URL || "http://localhost:5173",
    headless: true,
    viewport: { width: 1440, height: 1100 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--disable-dev-shm-usage",
        ...(process.env.MOON_CAPTURE_GPU === "1"
          ? [
              "--enable-gpu",
              "--use-angle=vulkan",
              "--ignore-gpu-blocklist",
              "--disable-accelerated-video-decode",
            ]
          : []),
      ],
    },
  },
  workers: 1,
  reporter: "list",
});
