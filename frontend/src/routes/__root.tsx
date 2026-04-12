import { Outlet, createRootRoute, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import "../styles.css";

import Scaffold from "@/components/Scaffold";
import { getDefaultLocale } from "@/i18n";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // Redirect bare "/" to the default locale
    if (location.pathname === "/") {
      throw redirect({ to: "/$locale", params: { locale: getDefaultLocale() }, replace: true });
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Scaffold>
        <Outlet />
      </Scaffold>

      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
