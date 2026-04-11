import { test, expect } from "@playwright/test";

const CARD = "button[class*='aspect-800']";

// Regression: LocalizedString name rendered as [object Object] caused crash
test("card list page loads and shows cards", async ({ page }) => {
  await page.goto("/ko/cardlist");
  await expect(page.locator(CARD).first()).toBeVisible({ timeout: 15000 });
});

test("card list page loads in English locale", async ({ page }) => {
  await page.goto("/en/cardlist");
  await expect(page.locator(CARD).first()).toBeVisible({ timeout: 15000 });
});

test("kind filter from URL param shows cards", async ({ page }) => {
  // Each kind filter should show cards without crashing
  for (const kind of ["UNIT", "PILOT", "BASE", "COMMAND"]) {
    await page.goto(`/ko/cardlist?kind=${kind}`);
    await expect(page.locator(CARD).first()).toBeVisible({ timeout: 15000 });
  }
});

// Regression: name search was broken when names became LocalizedString
test("name search returns matching cards", async ({ page }) => {
  await page.goto("/ko/cardlist?query=%EA%B1%B4%EB%8B%B4"); // query=건담
  await expect(page.locator(CARD).first()).toBeVisible({ timeout: 15000 });
  const cards = await page.locator(CARD).count();
  expect(cards).toBeGreaterThan(0);
});

test("card detail overlay opens on click", async ({ page }) => {
  // Navigate directly to URL with known card ID — avoids DOM detach race from Relay re-renders
  await page.goto("/ko/cardlist?cardId=GD01-001");
  await expect(page.locator("[data-popup], [role='dialog']").first()).toBeVisible({
    timeout: 15000,
  });
});
