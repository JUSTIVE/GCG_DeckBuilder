import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";
import { DeckListPage, Query } from "@/page/DeckListPage";

export const Route = createFileRoute("/$locale/decklist")({
  loader: () => loadQuery(relayEnvironment, Query, {}),
  component: DeckListPage,
});
