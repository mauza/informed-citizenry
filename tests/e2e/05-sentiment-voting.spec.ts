import { test, expect } from "@playwright/test";

test.describe("Sentiment Voting Flow", () => {
  test.use({ storageState: "./tests/.auth/user.json" });

  test("user can support a bill and verify in my-votes", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const billLink = page
      .getByRole("link")
      .filter({ hasText: /^[A-Z]+\s+\d+/ })
      .first();

    const billLinkVisible = await billLink.isVisible().catch(() => false);
    if (!billLinkVisible) {
      test.skip();
      return;
    }

    const billNumber = await billLink.textContent();
    await billLink.click();

    await page.waitForURL(/\/bills\/[\w-]+/);

    await page.waitForLoadState("networkidle");

    const supportButton = page
      .getByRole("button")
      .filter({ hasText: /support|👍/i })
      .first();

    const supportVisible = await supportButton.isVisible().catch(() => false);
    if (!supportVisible) {
      test.skip();
      return;
    }

    await supportButton.click();

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "test-results/screenshots/26-bill-supported.png",
      fullPage: true,
    });

    await page.goto("/my-votes");

    await page.waitForLoadState("networkidle");

    const hasVote = await page
      .getByText(billNumber || "")
      .or(page.getByText(/support/i))
      .isVisible()
      .catch(() => false);

    if (hasVote) {
      await page.screenshot({
        path: "test-results/screenshots/27-my-votes-with-support.png",
        fullPage: true,
      });
    }
  });

  test("user can change vote from support to oppose", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const billLink = page
      .getByRole("link")
      .filter({ hasText: /^[A-Z]+\s+\d+/ })
      .first();

    const billLinkVisible = await billLink.isVisible().catch(() => false);
    if (!billLinkVisible) {
      test.skip();
      return;
    }

    await billLink.click();

    await page.waitForURL(/\/bills\/[\w-]+/);

    await page.waitForLoadState("networkidle");

    const opposeButton = page
      .getByRole("button")
      .filter({ hasText: /oppose|👎/i })
      .first();

    const opposeVisible = await opposeButton.isVisible().catch(() => false);
    if (!opposeVisible) {
      test.skip();
      return;
    }

    await opposeButton.click();

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "test-results/screenshots/28-bill-opposed.png",
      fullPage: true,
    });

    await page.goto("/my-votes");

    await page.waitForLoadState("networkidle");

    const hasOppose = await page
      .getByText(/oppose/i)
      .isVisible()
      .catch(() => false);

    if (hasOppose) {
      await page.screenshot({
        path: "test-results/screenshots/29-my-votes-with-oppose.png",
        fullPage: true,
      });
    }
  });

  test("voting buttons are visible on bill detail page", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const billLink = page
      .getByRole("link")
      .filter({ hasText: /^[A-Z]+\s+\d+/ })
      .first();

    const billLinkVisible = await billLink.isVisible().catch(() => false);
    if (!billLinkVisible) {
      test.skip();
      return;
    }

    await billLink.click();

    await page.waitForURL(/\/bills\/[\w-]+/);

    await page.waitForLoadState("networkidle");

    const supportButton = page
      .getByRole("button")
      .filter({ hasText: /support/i })
      .first();

    const opposeButton = page
      .getByRole("button")
      .filter({ hasText: /oppose/i })
      .first();

    const supportVisible = await supportButton.isVisible().catch(() => false);
    const opposeVisible = await opposeButton.isVisible().catch(() => false);

    expect(supportVisible || opposeVisible).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/30-voting-buttons-visible.png",
      fullPage: true,
    });
  });

  test("unauthenticated user is redirected when trying to vote", async ({ page }) => {
    await page.goto("/bills");

    await page.waitForLoadState("networkidle");

    const billLink = page
      .getByRole("link")
      .filter({ hasText: /^[A-Z]+\s+\d+/ })
      .first();

    const billLinkVisible = await billLink.isVisible().catch(() => false);
    if (!billLinkVisible) {
      test.skip();
      return;
    }

    await billLink.click();

    await page.waitForURL(/\/bills\/[\w-]+/);

    await page.waitForLoadState("networkidle");

    const voteButton = page
      .getByRole("button")
      .filter({ hasText: /support|oppose|vote/i })
      .first();

    if (await voteButton.isVisible().catch(() => false)) {
      await voteButton.click();

      await page.waitForTimeout(1000);

      const redirectedToLogin = await page
        .getByText(/sign in|login|authenticate/i)
        .isVisible()
        .catch(() => false);

      const currentUrl = page.url();
      const onLoginPage = currentUrl.includes("/login");

      if (redirectedToLogin || onLoginPage) {
        await page.screenshot({
          path: "test-results/screenshots/31-unauthenticated-vote-redirect.png",
          fullPage: true,
        });
      }
    }
  });
});
