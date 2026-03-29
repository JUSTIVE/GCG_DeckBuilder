import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import {
  Environment,
  Network,
  type FetchFunction,
  type GraphQLResponse,
} from "relay-runtime";
import { RelayEnvironmentProvider } from "react-relay";
import { serveGraphQL } from "./serve";

import setupLocatorUI from "@locator/runtime";

if (process.env.NODE_ENV === "development") {
  setupLocatorUI();
}

const fetchGraphQL: FetchFunction = async (
  request,
  variables,
): Promise<GraphQLResponse> => {
  try {
    console.log("fetching", request.text?.split("\n").at(0), variables);
    const resp = await serveGraphQL(request.text ?? "", variables);
    console.log(resp);
    return resp as GraphQLResponse;
  } catch {
    throw new Error("Response failed.");
  }
};

const environment = new Environment({
  network: Network.create(fetchGraphQL),
});

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
