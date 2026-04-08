import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/page/InfoPage";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});
