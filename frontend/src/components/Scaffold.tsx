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
import { useRouterState, Link } from "@tanstack/react-router";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const deckDetailMatch = pathname.match(/^\/deck\/(.+)$/);
  if (deckDetailMatch) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink render={<Link to="/decklist" />}>덱 목록</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <React.Suspense fallback={<BreadcrumbPage>…</BreadcrumbPage>}>
              <DeckNameCrumb deckId={deckDetailMatch[1]} />
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
              <BreadcrumbLink render={<Link to={parent.url} />}>{parent.title}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{child.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{parent.title}</BreadcrumbPage>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 z-2 bg-background">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </div>
          <div className="ml-auto px-3">
            <QuickSearch />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
