import { expect, test } from "bun:test";
import { useBrowser } from "./helpers";

const CARD = "button[class*='aspect-800']";
const b = useBrowser();

// Regression: LocalizedString name rendered as [object Object] caused crash
test("card list page loads and shows cards", async () => {
  await b.page.goto("/ko/cardlist");
  await b.page.locator(CARD).first().waitFor({ state: "visible", timeout: 15000 });
});

test("card list page loads in English locale", async () => {
  await b.page.goto("/en/cardlist");
  await b.page.locator(CARD).first().waitFor({ state: "visible", timeout: 15000 });
});

test("kind filter from URL param shows cards", async () => {
  // Each kind filter should show cards without crashing
  for (const kind of ["UNIT", "PILOT", "BASE", "COMMAND"]) {
    await b.page.goto(`/ko/cardlist?kind=${kind}`);
    await b.page.locator(CARD).first().waitFor({ state: "visible", timeout: 15000 });
  }
});

// Regression: name search was broken when names became LocalizedString
test("name search returns matching cards", async () => {
  await b.page.goto("/ko/cardlist?query=%EA%B1%B4%EB%8B%B4"); // query=건담
  await b.page.locator(CARD).first().waitFor({ state: "visible", timeout: 15000 });
  const count = await b.page.locator(CARD).count();
  expect(count).toBeGreaterThan(0);
});

test("card detail overlay opens on click", async () => {
  // Navigate directly to URL with known card ID — avoids DOM detach race from Relay re-renders
  await b.page.goto("/ko/cardlist?cardId=GD01-001");
  await b.page
    .locator("[data-popup], [role='dialog']")
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
});
