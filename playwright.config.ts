import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/customer",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 7"],
        ...(process.env.PLAYWRIGHT_CHROME ? { channel: "chrome" } : {}),
      },
    },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      NEXT_PUBLIC_API_URL: "https://dinehub-backend-42eq.onrender.com/api",
      NEXT_PUBLIC_BETTER_AUTH_URL: "https://dinehub-backend-42eq.onrender.com",
    },
  },
});
