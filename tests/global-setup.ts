import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const authFile = path.join(__dirname, ".auth", "user.json");

async function globalSetup(_config: FullConfig) {
  console.log("🎭 Starting Playwright global setup...");

  await waitForAppHealth();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🔐 Creating authenticated session via test API...");

  const sessionResponse = await page.request.post(`${baseURL}/api/test/session`, {
    data: {
      email: "e2e-test@example.com",
      name: "E2E Test User",
    },
  });

  if (!sessionResponse.ok()) {
    const body = await sessionResponse.text();
    throw new Error(
      `Failed to create test session (HTTP ${sessionResponse.status()}). ` +
      `Is E2E_TESTING=true set on the server? Response: ${body}`
    );
  }

  await page.goto(`${baseURL}/dashboard`);

  await page.waitForURL("**/dashboard");

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await context.storageState({ path: authFile });

  console.log("✅ Authenticated session saved to", authFile);

  await browser.close();
}

async function waitForAppHealth(
  url: string = baseURL,
  maxRetries: number = 60,
  delay: number = 2000
) {
  console.log(`🏥 Waiting for app to be healthy at ${url}...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        console.log("✅ App is healthy and ready!");
        return;
      }
    } catch {
      process.stdout.write(".");
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error(`App failed to become healthy at ${url} after ${maxRetries} retries`);
}

export default globalSetup;
