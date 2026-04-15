import { test, expect, type Page } from "@playwright/test";

// Regression: The schema refactor changed `color: CardColor!` (scalar) to
// `color: Color!` (object type). QuickSearch.tsx still queried `color`
// without a sub-selection, so its GraphQL documents became invalid.
//
// `serveGraphQL` uses `executeSync` without `validate()`, so broken queries
// do NOT throw — they silently return `color: {}`, which in turn renders
// `COLOR_HEX[{}] + "33"` → inline style `background-color: undefined33`.
// These tests exercise the full QuickSearch flow so that future schema
// drift fails loudly instead of silently degrading.

const DIALOG = "[data-popup], [role='dialog']";

async function openQuickSearch(page: Page) {
  await page.keyboard.press("Control+k");
  const dialog = page.locator(DIALOG).first();
  await expect(dialog).toBeVisible({ timeout: 15000 });
  // Wait for the QuickSearch input to be focused before typing.
  await expect(dialog.getByPlaceholder(/검색/)).toBeVisible();
  return dialog;
}

test("QuickSearch returns search results for a known query", async ({ page }) => {
  await page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(page);

  // "건담" must match multiple cards in the dataset.
  await dialog.getByPlaceholder(/검색/).fill("건담");

  const resultButtons = dialog.locator("ul button");
  await expect(resultButtons.first()).toBeVisible({ timeout: 5000 });
  expect(await resultButtons.count()).toBeGreaterThan(0);

  // Result rows must contain the card name — proves the query returned real
  // data and the component didn't fall through to the "no results" branch.
  await expect(resultButtons.first()).toContainText("건담");
});

test("QuickSearch result click opens the card detail overlay", async ({ page }) => {
  await page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(page);

  await dialog.getByPlaceholder(/검색/).fill("건담");
  const firstResult = dialog.locator("ul button").first();
  await expect(firstResult).toBeVisible({ timeout: 5000 });
  await firstResult.click();

  // The QuickSearch input disappears when its dialog closes, and
  // CardByIdOverlay mounts a new dialog in its place.
  await expect(page.getByPlaceholder(/검색/)).toHaveCount(0);
  await expect(page.locator(DIALOG).first()).toBeVisible({ timeout: 15000 });
});

test("QuickSearch history renders without broken color styles", async ({ page }) => {
  // Visit a card detail URL so a CardViewHistory entry is created via
  // CardByIdOverlay's addCardView mutation.
  await page.goto("/ko/cardlist?cardId=ST01-001");
  await expect(page.locator(DIALOG).first()).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");

  // Reopen the page and the QuickSearch dialog with an empty query so the
  // history section is rendered.
  await page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(page);

  const historyItem = dialog.locator("ul button").first();
  await expect(historyItem).toBeVisible({ timeout: 5000 });

  // Any element with an inline background-color must not contain literal
  // "undefined" — that is the signature of `COLOR_HEX[{}] + "33"` produced
  // when the history query forgets to sub-select `color { value }`.
  const styled = dialog.locator("[style*='background-color']");
  const styledCount = await styled.count();
  for (let i = 0; i < styledCount; i++) {
    const style = await styled.nth(i).getAttribute("style");
    expect(style ?? "").not.toContain("undefined");
  }
});
