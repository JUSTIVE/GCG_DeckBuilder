import { expect, test } from "bun:test";
import type { Page } from "playwright";
import { useBrowser, waitForCount } from "./helpers";

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
const b = useBrowser();

async function openQuickSearch(page: Page) {
  // QuickSearch's Ctrl+k listener is registered in a useEffect, so wait for
  // the cardlist content to mount before pressing the hotkey — otherwise the
  // keypress fires before React has hooked up the global keydown handler.
  await page
    .locator("button[class*='aspect-800']")
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Control+k");
  const dialog = page.locator(DIALOG).first();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  // Wait for the QuickSearch input to be focused before typing.
  await dialog.locator("input.h-12[placeholder*='검색']").waitFor({ state: "visible" });
  return dialog;
}

test("QuickSearch returns search results for a known query", async () => {
  await b.page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(b.page);

  // "건담" must match multiple cards in the dataset.
  await dialog.locator("input.h-12[placeholder*='검색']").fill("건담");

  const resultButtons = dialog.locator("ul button");
  await resultButtons.first().waitFor({ state: "visible", timeout: 5000 });
  expect(await resultButtons.count()).toBeGreaterThan(0);

  // Result rows must contain the card name — proves the query returned real
  // data and the component didn't fall through to the "no results" branch.
  const firstText = (await resultButtons.first().textContent()) ?? "";
  expect(firstText).toContain("건담");
});

test("QuickSearch result click opens the card detail overlay", async () => {
  await b.page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(b.page);

  await dialog.locator("input.h-12[placeholder*='검색']").fill("건담");
  const firstResult = dialog.locator("ul button").first();
  await firstResult.waitFor({ state: "visible", timeout: 5000 });
  await firstResult.click();

  // The QuickSearch input (matched by its unique h-12 class — CardFilterControls
  // keeps its own search input with h-7 mounted on the cardlist page) disappears
  // when the dialog closes, and CardByIdOverlay mounts a new dialog in its place.
  await waitForCount(b.page.locator("input.h-12[placeholder*='검색']"), 0);
  await b.page.locator(DIALOG).first().waitFor({ state: "visible", timeout: 15000 });
});

test("QuickSearch history renders without broken color styles", async () => {
  // Visit a card detail URL so a CardViewHistory entry is created via
  // CardByIdOverlay's addCardView mutation.
  await b.page.goto("/ko/cardlist?cardId=ST01-001");
  await b.page.locator(DIALOG).first().waitFor({ state: "visible", timeout: 15000 });
  await b.page.keyboard.press("Escape");

  // Reopen the page and the QuickSearch dialog with an empty query so the
  // history section is rendered.
  await b.page.goto("/ko/cardlist");
  const dialog = await openQuickSearch(b.page);

  const historyItem = dialog.locator("ul button").first();
  await historyItem.waitFor({ state: "visible", timeout: 5000 });

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
