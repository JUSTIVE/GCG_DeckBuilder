import { createFileRoute } from "@tanstack/react-router";
import { loadQuery } from "react-relay";
import { relayEnvironment } from "@/relay-environment";
import { MainPage, Query } from "@/page/MainPage";

export const Route = createFileRoute("/")({
  loader: () => loadQuery(relayEnvironment, Query, {}),
  component: MainPage,
});
