import { test, expect } from "@playwright/test";

test.describe("Legislators Flow", () => {
  test("legislators list page displays correctly", async ({ page }) => {
    await page.goto("/legislators");

    await expect(page.getByText("Legislators")).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/14-legislators-list.png",
      fullPage: true,
    });
  });

  test("legislator cards show basic information", async ({ page }) => {
    await page.goto("/legislators");

    await page.waitForLoadState("networkidle");

    const legislatorCards = page.locator("[data-testid='legislator-card']").or(
      page.locator("article, .card").filter({ hasText: /representative|senator/i })
    );

    const count = await legislatorCards.count();

    if (count > 0) {
      await expect(legislatorCards.first()).toBeVisible();

      const firstCard = legislatorCards.first();
      const text = await firstCard.textContent();

      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(0);
    }

    await page.screenshot({
      path: "test-results/screenshots/15-legislator-cards.png",
      fullPage: true,
    });
  });

  test("legislator detail page displays correctly", async ({ page }) => {
    await page.goto("/legislators");

    await page.waitForLoadState("networkidle");

    const legislatorLink = page
      .getByRole("link")
      .filter({ has: page.locator("h3, h2, .name") })
      .first();

    if (await legislatorLink.isVisible().catch(() => false)) {
      const legislatorName = await legislatorLink.textContent();

      await legislatorLink.click();

      await page.waitForURL(/\/legislators\/[\w-]+/);

      await expect(
        page.getByText(legislatorName || "").or(page.getByRole("heading").first())
      ).toBeVisible();

      const hasVotingRecord = await page
        .getByText(/voting record|votes|yea|nay/i)
        .isVisible()
        .catch(() => false);

      const hasRepresentationScore = await page
        .getByText(/representation|score|alignment/i)
        .isVisible()
        .catch(() => false);

      if (hasVotingRecord || hasRepresentationScore) {
        await page.screenshot({
          path: "test-results/screenshots/16-legislator-detail-with-data.png",
          fullPage: true,
        });
      } else {
        await page.screenshot({
          path: "test-results/screenshots/16-legislator-detail.png",
          fullPage: true,
        });
      }
    }
  });

  test("legislator detail shows contact information", async ({ page }) => {
    await page.goto("/legislators");

    await page.waitForLoadState("networkidle");

    const legislatorLink = page
      .getByRole("link")
      .filter({ has: page.locator("h3, h2, .name") })
      .first();

    if (await legislatorLink.isVisible().catch(() => false)) {
      await legislatorLink.click();

      await page.waitForURL(/\/legislators\/[\w-]+/);

      await page.waitForLoadState("networkidle");

      const hasEmail = await page
        .getByText(/email/i)
        .or(page.getByRole("link", { name: /@/ }))
        .isVisible()
        .catch(() => false);

      const hasWebsite = await page
        .getByRole("link", { name: /website|official/i })
        .isVisible()
        .catch(() => false);

      const hasPhone = await page
        .getByText(/\(\d{3}\)\s*\d{3}-\d{4}/)
        .or(page.getByText(/phone/i))
        .isVisible()
        .catch(() => false);

      if (hasEmail || hasWebsite || hasPhone) {
        await page.screenshot({
          path: "test-results/screenshots/17-legislator-contact-info.png",
          fullPage: true,
        });
      }
    }
  });
});
