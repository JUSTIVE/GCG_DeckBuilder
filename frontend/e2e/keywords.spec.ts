import { test, expect } from "@playwright/test";

// Regression: KeywordsPage crashed because n.name (LocalizedString) was
// rendered directly as a string in the card list.
test("keyword dictionary page loads", async ({ page }) => {
  await page.goto("/ko/keywords");
  await expect(page.getByText("키워드 사전").or(page.getByText("Keyword")).first()).toBeVisible({
    timeout: 15000,
  });
});

test("keyword card list expands without crash", async ({ page }) => {
  await page.goto("/ko/keywords");
  const firstKeyword = page
    .locator("button")
    .filter({ hasText: /버스트|블로커|고기동|돌파/ })
    .first();
  await expect(firstKeyword).toBeVisible({ timeout: 15000 });
  await firstKeyword.click();

  // Card list should render — regression: crashed due to LocalizedString as text
  await expect(page.locator(".font-mono").first()).toBeVisible({ timeout: 10000 });
});

test("keyword page loads in English", async ({ page }) => {
  await page.goto("/en/keywords");
  await expect(page.getByText(/Keyword|keyword/i).first()).toBeVisible({ timeout: 15000 });
});
