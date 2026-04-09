import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";
import { RulesPage, Query } from "@/page/RulesPage";

export const Route = createFileRoute("/rules")({
  loader: () => loadQuery(relayEnvironment, Query, {}),
  component: RulesPage,
});
