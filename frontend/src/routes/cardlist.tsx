import { CardListPage } from "@/page/CardListPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cardlist")({
  component: CardListPage,
});
