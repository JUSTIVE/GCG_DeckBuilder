import "./i18n"; // must be first
import ReactDOM from "react-dom/client";

// Vite emits this event when a dynamically imported chunk fails to load.
// This happens after a new deployment invalidates old hashed filenames —
// the server returns index.html (SPA fallback) instead of JS, causing a
// MIME type error. Reloading fetches the latest index.html and assets.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RelayEnvironmentProvider } from "react-relay";
import { relayEnvironment as environment } from "./relay-environment";

import setupLocatorUI from "@locator/runtime";

if (process.env.NODE_ENV === "development") {
  setupLocatorUI();
}

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <RelayEnvironmentProvider environment={environment}>
      <RouterProvider router={router} />
    </RelayEnvironmentProvider>,
  );
}
