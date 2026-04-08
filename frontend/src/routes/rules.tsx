import { createFileRoute } from "@tanstack/react-router";
import { RulesPage } from "@/page/RulesPage";

export const Route = createFileRoute("/rules")({
  component: RulesPage,
});
