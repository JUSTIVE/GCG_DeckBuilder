import { createFileRoute } from "@tanstack/react-router";
import { DeckDetailPage } from "src/page/DeckDetailPage";

export type DeckDetailSearch = {
  view?: "deck";
};

export const Route = createFileRoute("/deck/$deckId")({
  validateSearch: (raw: Record<string, unknown>): DeckDetailSearch => ({
    view: raw.view === "deck" ? "deck" : undefined,
  }),
  component: DeckDetailPage,
});
