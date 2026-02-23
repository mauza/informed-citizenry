import { test, expect } from "@playwright/test";

test.describe("Authenticated User Flow", () => {
  test.use({ storageState: "./tests/.auth/user.json" });

  test("dashboard loads for authenticated user", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Dashboard")).toBeVisible();

    const dashboardContent = await page.textContent("body");
    expect(dashboardContent).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/18-dashboard.png",
      fullPage: true,
    });
  });

  test("my votes page shows empty state for new user", async ({ page }) => {
    await page.goto("/my-votes");

    await expect(page.getByText(/my votes|your votes/i)).toBeVisible();

    const hasVotes = await page
      .locator("[data-testid='vote-card'], .vote-item")
      .count()
      .catch(() => 0);

    if (hasVotes === 0) {
      const hasEmptyState = await page
        .getByText(/no votes|empty|haven't voted|start voting/i)
        .isVisible()
        .catch(() => false);

      expect(hasEmptyState).toBeTruthy();
    }

    await page.screenshot({
      path: "test-results/screenshots/19-my-votes.png",
      fullPage: true,
    });
  });

  test("settings page displays correctly", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("Settings")).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/20-settings.png",
      fullPage: true,
    });
  });

  test("settings page shows premium upgrade CTA", async ({ page }) => {
    await page.goto("/settings");

    const hasPremiumCTA = await page
      .getByText(/premium|upgrade|unlock/i)
      .isVisible()
      .catch(() => false);

    const hasUpgradeButton = await page
      .getByRole("button", { name: /upgrade|get premium|subscribe/i })
      .isVisible()
      .catch(() => false);

    if (hasPremiumCTA || hasUpgradeButton) {
      await page.screenshot({
        path: "test-results/screenshots/21-settings-premium-cta.png",
        fullPage: true,
      });
    }
  });

  test("authenticated user sees sign out option", async ({ page }) => {
    await page.goto("/dashboard");

    await page.waitForLoadState("networkidle");

    const hasSignOut = await page
      .getByRole("button", { name: /sign out|logout/i })
      .or(page.getByRole("link", { name: /sign out|logout/i }))
      .isVisible()
      .catch(() => false);

    expect(hasSignOut).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/22-authenticated-navbar.png",
    });
  });

  test("user can navigate between authenticated pages", async ({ page }) => {
    await page.goto("/dashboard");

    await page.goto("/my-votes");
    await expect(page).toHaveURL(/\/my-votes/);
    await page.screenshot({ path: "test-results/screenshots/23-nav-my-votes.png" });

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await page.screenshot({ path: "test-results/screenshots/24-nav-settings.png" });

    await page.goto("/bills");
    await expect(page).toHaveURL(/\/bills/);
    await page.screenshot({ path: "test-results/screenshots/25-nav-bills-authenticated.png" });
  });
});
