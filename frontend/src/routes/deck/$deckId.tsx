import { createFileRoute } from "@tanstack/react-router";
import { DeckDetailPage } from "src/page/DeckDetailPage";

export const Route = createFileRoute("/deck/$deckId")({
  component: DeckDetailPage,
});
