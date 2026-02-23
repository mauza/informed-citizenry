import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("homepage loads correctly with all key elements", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Informed Citizenry/);

    await expect(
      page.getByText("Does your representative", { exact: false })
    ).toBeVisible();
    await expect(page.getByText("actually represent you?")).toBeVisible();

    await expect(
      page.getByText("Civic Engagement Platform")
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Browse Bills" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Find Your Representatives" })
    ).toBeVisible();

    await expect(page.getByText("AI-Powered Summaries")).toBeVisible();
    await expect(page.getByText("Voice Your Opinion")).toBeVisible();
    await expect(page.getByText("Representation Score")).toBeVisible();

    await expect(page.getByText("Unlock the Representation Score")).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Premium" })).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/01-homepage.png",
      fullPage: true,
    });
  });

  test("login page displays correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(
      page.getByText("Use your email or GitHub to sign in")
    ).toBeVisible();

    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/02-login-page.png",
      fullPage: true,
    });
  });

  test("bills page is accessible and shows filters", async ({ page }) => {
    await page.goto("/bills");

    await expect(page.getByText("Bills", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Browse and track legislation across the country.")
    ).toBeVisible();

    await expect(page.getByPlaceholder(/search bills/i)).toBeVisible();

    await expect(page.getByRole("button", { name: /filter/i })).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/03-bills-page.png",
      fullPage: true,
    });
  });

  test("legislators page is accessible", async ({ page }) => {
    await page.goto("/legislators");

    await expect(page.getByText("Legislators")).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/04-legislators-page.png",
      fullPage: true,
    });
  });

  test("navigation works between pages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Browse Bills" }).click();
    await expect(page).toHaveURL(/\/bills/);
    await page.screenshot({
      path: "test-results/screenshots/05-nav-bills.png",
    });

    await page.goto("/");
    await page.getByRole("link", { name: "Find Your Representatives" }).click();
    await expect(page).toHaveURL(/\/legislators/);
    await page.screenshot({
      path: "test-results/screenshots/06-nav-legislators.png",
    });

    await page.goto("/");
    await page.getByRole("link", { name: "Get Premium" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await page.screenshot({
      path: "test-results/screenshots/07-nav-settings.png",
    });
  });
});
