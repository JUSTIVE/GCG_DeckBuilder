import { DeckListPage } from "@/page/DeckListPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/decklist")({
  component: DeckListPage,
});
