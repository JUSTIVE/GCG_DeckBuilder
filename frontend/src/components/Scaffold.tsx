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
import { ThemeToggle } from "@/components/ThemeToggle";
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

function MonobarBrand() {
  const { t } = useTranslation("common");
  const { locale = "ko" } = useParams({ strict: false });
  return (
    <Link
      to={`/${locale}` as any}
      className="flex items-baseline gap-2 docket-meta-strong text-foreground hover:opacity-80 transition-opacity"
    >
      <span className="display-title text-sm sm:text-base font-bold tracking-tight">
        GCG DECKBUILDER
      </span>
      <span className="hidden sm:inline docket-meta opacity-70">{t("nav.title")}</span>
    </Link>
  );
}

function MonobarMeta() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  return (
    <div className="hidden md:flex items-center gap-3 docket-meta px-3 border-l border-foreground/20 h-full">
      <span>EST. 2026</span>
      <span className="opacity-30">·</span>
      <span>SEOUL</span>
      <span className="opacity-30">·</span>
      <span className="tabular-nums">{today}</span>
    </div>
  );
}

export default function Scaffold({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex justify-between h-[calc(3.25rem+env(safe-area-inset-top))] shrink-0 items-center border-b border-foreground/30 sticky top-0 z-2 bg-background pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 px-3 h-full min-w-0">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <MonobarBrand />
            <MonobarMeta />
          </div>
          <div className="flex items-center gap-1 px-3 h-full border-l border-foreground/20 shrink-0">
            <AppBreadcrumb />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <LanguageSwitcher />
            <ThemeToggle />
            <QuickSearch />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
