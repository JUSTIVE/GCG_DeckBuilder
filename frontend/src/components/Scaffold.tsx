import { AppSidebar } from "@/components/AppSideBar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { PropsWithChildren } from "react";
import React from "react";
import { QuickSearch } from "@/components/QuickSearch";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useRouterState, Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { resolveBreadcrumb } from "@/lib/nav";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { ScaffoldDeckNameQuery } from "@/__generated__/ScaffoldDeckNameQuery.graphql";

const DeckNameQuery = graphql`
  query ScaffoldDeckNameQuery($deckId: ID!) {
    node(id: $deckId) {
      ... on Deck {
        name
      }
    }
  }
`;

function DeckNameCrumb({ deckId }: { deckId: string }) {
  const data = useLazyLoadQuery<ScaffoldDeckNameQuery>(DeckNameQuery, { deckId });
  const name = (data.node as any)?.name ?? deckId;
  return <BreadcrumbPage>{name}</BreadcrumbPage>;
}

function AppBreadcrumb() {
  const { pathname, deckId } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      deckId: (s.matches.find((m) => (m.params as any)?.deckId)?.params as any)?.deckId as
        | string
        | undefined,
    }),
  });
  const { locale = "ko" } = useParams({ strict: false });
  const { t } = useTranslation("common");

  if (deckId) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink render={<Link to="/$locale/decklist" params={{ locale }} />}>
              {t("nav.deckList")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <React.Suspense fallback={<BreadcrumbPage>…</BreadcrumbPage>}>
              <DeckNameCrumb deckId={deckId} />
            </React.Suspense>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const crumbs = resolveBreadcrumb(pathname);
  if (!crumbs) return null;
  const [parent, child] = crumbs;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {child ? (
          <>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink render={<Link to={`/${locale}${parent.path}` as any} />}>
                {t(parent.titleKey as any)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{t(child.titleKey as any)}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{t(parent.titleKey as any)}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function Scaffold({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b sticky top-0 z-2 bg-background pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </div>
          <div className="ml-auto flex items-center gap-1 px-3">
            <LanguageSwitcher />
            <QuickSearch />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
