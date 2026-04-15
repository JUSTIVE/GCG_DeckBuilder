import { test } from "bun:test";
import { useBrowser } from "./helpers";

const b = useBrowser();

// Regression: KeywordsPage crashed because n.name (LocalizedString) was
// rendered directly as a string in the card list.
test("keyword dictionary page loads", async () => {
  await b.page.goto("/ko/keywords");
  await b.page
    .getByText("키워드 사전")
    .or(b.page.getByText("Keyword"))
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
});

test("keyword card list expands without crash", async () => {
  await b.page.goto("/ko/keywords");
  const firstKeyword = b.page
    .locator("button")
    .filter({ hasText: /버스트|블로커|고기동|돌파/ })
    .first();
  await firstKeyword.waitFor({ state: "visible", timeout: 15000 });
  await firstKeyword.click();

  // Card list should render — regression: crashed due to LocalizedString as text
  await b.page.locator(".font-mono").first().waitFor({ state: "visible", timeout: 10000 });
});

test("keyword page loads in English", async () => {
  await b.page.goto("/en/keywords");
  await b.page
    .getByText(/Keyword|keyword/i)
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
});
