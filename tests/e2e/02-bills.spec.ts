import { test, expect } from "@playwright/test";

test.describe("Bills Flow", () => {
  test("bills list displays with filtering options", async ({ page }) => {
    await page.goto("/bills");

    await expect(page.getByText("Bills")).toBeVisible();

    await expect(page.getByPlaceholder(/search bills/i)).toBeVisible();

    await page.getByRole("combobox").first().click();
    await expect(page.getByRole("option", { name: /all states/i })).toBeVisible();

    await page.keyboard.press("Escape");

    await page.getByRole("combobox").nth(1).click();
    await expect(page.getByRole("option", { name: /all statuses/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /introduced/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /passed/i })).toBeVisible();

    await page.keyboard.press("Escape");

    await page.screenshot({
      path: "test-results/screenshots/08-bills-filters.png",
      fullPage: true,
    });
  });

  test("bills can be filtered by state", async ({ page }) => {
    await page.goto("/bills");

    await page.getByRole("combobox").first().click();

    const firstState = await page
      .getByRole("option")
      .filter({ hasNotText: /all states/i })
      .first();

    if (await firstState.isVisible().catch(() => false)) {
      const stateName = await firstState.textContent();
      await firstState.click();

      await page.getByRole("button", { name: /filter/i }).click();

      await page.waitForLoadState("networkidle");

      await expect(page.getByText(stateName || "")).toBeVisible();

      await page.screenshot({
        path: "test-results/screenshots/09-bills-filtered-by-state.png",
        fullPage: true,
      });
    }
  });

  test("bills can be filtered by status", async ({ page }) => {
    await page.goto("/bills");

    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /introduced/i }).click();

    await page.getByRole("button", { name: /filter/i }).click();

    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "test-results/screenshots/10-bills-filtered-by-status.png",
      fullPage: true,
    });
  });

  test("search functionality works", async ({ page }) => {
    await page.goto("/bills");

    const searchInput = page.getByPlaceholder(/search bills/i);
    await searchInput.fill("health");

    await page.getByRole("button", { name: /filter/i }).click();

    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "test-results/screenshots/11-bills-search-results.png",
      fullPage: true,
    });
  });

  test("pagination works when multiple pages exist", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const nextButton = page.getByRole("link", { name: /next/i });

    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForURL(/\?.*page=1/);

      await expect(page.getByRole("link", { name: /previous/i })).toBeVisible();

      await page.screenshot({
        path: "test-results/screenshots/12-bills-page-2.png",
        fullPage: true,
      });

      await page.getByRole("link", { name: /previous/i }).click();
      await page.waitForURL(/\?.*page=0/);
    }
  });

  test("bill detail page displays correctly", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const firstBillLink = page
      .getByRole("link")
      .filter({ hasText: /^[A-Z]+\s+\d+/ })
      .first();

    if (await firstBillLink.isVisible().catch(() => false)) {
      await firstBillLink.click();

      await page.waitForURL(/\/bills\/[\w-]+/);

      await expect(page.getByText(/status/i)).toBeVisible();

      await page.screenshot({
        path: "test-results/screenshots/13-bill-detail.png",
        fullPage: true,
      });
    }
  });
});
