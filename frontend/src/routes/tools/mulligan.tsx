import { MulliganSimulatorPage } from "@/page/MulliganSimulatorPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/mulligan")({
  component: MulliganSimulatorPage,
});
