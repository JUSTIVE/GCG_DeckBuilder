import { test, expect } from "@playwright/test";

// Regression: UnitCard.linkablePilots / PilotCard.linkableUnits only handled
// LinkPilot (name match), so trait-linked units like G-스카이 Ez
// (LinkTrait → WHITE_BASE_TEAM) never produced a linkable-pilots branch in
// the deck graph. Assert that clicking the card in the graph now shows both
// WHITE_BASE_TEAM pilots (Amuro Ray ST01-010, Sayla Mass GD01-087) under the
// linkablePilots branch specifically — React Flow's data-id prefix lets us
// distinguish this branch from the (also present) WHITE_BASE_TEAM trait
// branch.
test("deck graph shows LinkTrait-matched pilots branch (G-스카이 Ez)", async ({ page }) => {
  // Seed a deck in localStorage so the deck detail route resolves. The id
  // format mirrors serve/decks.ts:createDeck — `@${btoa("Deck:" + createdAt)}`.
  const createdAt = "2024-01-01T00:00:00.000Z";
  const deckId = "@" + Buffer.from(`Deck:${createdAt}`).toString("base64");
  await page.addInitScript(
    ({ deckId, createdAt }) => {
      localStorage.setItem(
        "gcg_decks",
        JSON.stringify([
          {
            __typename: "Deck",
            id: deckId,
            name: "e2e link-trait",
            cards: [],
            createdAt,
          },
        ]),
      );
    },
    { deckId, createdAt },
  );

  // Graph list mode, filtered down to only G-Sky Easy so it is the single
  // card rendered — removes any ambiguity about which node to click.
  await page.goto(
    `/ko/deck/${encodeURIComponent(deckId)}?view=graph&query=${encodeURIComponent("G-스카이 Ez")}`,
  );

  const gSkyImg = page.locator('img[src="/cards/GD01-014.webp"]');
  await expect(gSkyImg.first()).toBeVisible({ timeout: 20000 });

  // Click the React Flow node wrapper (the inner Card has pointer-events:none
  // so clicks must land on the node container for onNodeClick to fire).
  const gSkyNode = page
    .locator(".react-flow__node")
    .filter({ has: page.locator('img[src="/cards/GD01-014.webp"]') })
    .first();
  await gSkyNode.click();

  // Center mode — both WHITE_BASE_TEAM pilots must appear under the
  // linkablePilots branch. Pre-fix this assertion failed because the resolver
  // returned [] for LinkTrait units.
  await expect(page.locator('[data-id="branch:linkablePilots:ST01-010"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('[data-id="branch:linkablePilots:GD01-087"]')).toBeVisible({
    timeout: 15000,
  });
});
