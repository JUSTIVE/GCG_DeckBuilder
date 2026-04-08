import { createFileRoute } from "@tanstack/react-router";
import { KeywordsPage } from "@/page/KeywordsPage";

export const Route = createFileRoute("/keywords")({
  component: KeywordsPage,
});
