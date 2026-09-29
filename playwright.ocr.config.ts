import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/menu-ocr",
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: "http://localhost:3101",
    channel: process.env.CI ? undefined : "chrome",
    actionTimeout: 15000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3101",
    url: "http://localhost:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      NEXT_PUBLIC_API_URL: "https://dinehub-backend-42eq.onrender.com/api",
      NEXT_PUBLIC_BETTER_AUTH_URL: "https://dinehub-backend-42eq.onrender.com",
    },
  },
});
