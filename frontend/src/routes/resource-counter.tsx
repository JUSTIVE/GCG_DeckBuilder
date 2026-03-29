import { ResourceCounterPage } from "src/page/ResourceCounterPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/resource-counter")({
  component: ResourceCounterPage,
});
