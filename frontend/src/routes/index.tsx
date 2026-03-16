import { MainPage } from "@/page/MainPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return <MainPage />;
}
