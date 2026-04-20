import { CardScannerPage } from "@/page/CardScannerPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/tools/card-scanner")({
  component: CardScannerPage,
});
