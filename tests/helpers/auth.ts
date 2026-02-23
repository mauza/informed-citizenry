/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, type Page } from "@playwright/test";

export type TestUser = {
  email: string;
  name: string;
};

export const testUser: TestUser = {
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

export async function createTestSession(page: Page, user: TestUser = testUser) {
  const response = await page.request.post("/api/test/session", {
    data: user,
  });

  expect(response.status()).toBe(200);

  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard");

  return response;
}

export async function expectAuthenticated(page: Page) {
  await expect(page.getByRole("button", { name: /sign out|logout/i })).toBeVisible();
}

export async function expectNotAuthenticated(page: Page) {
  await expect(page.getByRole("link", { name: /sign in|login/i })).toBeVisible();
}

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, fixtureUse) => {
    await createTestSession(page);
    await fixtureUse(page);
  },
});
