import { createFileRoute } from "@tanstack/react-router";
import { MainPage } from "@/page/MainPage";

export const Route = createFileRoute("/")({ component: MainPage });
