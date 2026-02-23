import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
  ],
  outputDir: "./test-results",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "public",
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /.*authenticated.*|.*sentiment.*/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "authenticated",
      testMatch: /.*authenticated.*|.*sentiment.*/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./tests/.auth/user.json",
      },
    },
  ],

  webServer: {
    command: process.env.E2E_USE_DOCKER
      ? "docker compose -f docker-compose.e2e.yml up"
      : "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: process.env.E2E_USE_DOCKER
      ? {}
      : { E2E_TESTING: "true" },
  },
});
