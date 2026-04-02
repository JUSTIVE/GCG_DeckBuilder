import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { navMain } from "@/lib/nav";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { AppSideBarDeckListQuery } from "@/__generated__/AppSideBarDeckListQuery.graphql";
import { COLOR_BG } from "src/render/color";
import { cn } from "@/lib/utils";

const DeckListQuery = graphql`
  query AppSideBarDeckListQuery {
    deckList {
      decks {
        id
        name
        cards {
          card {
            ... on UnitCard { color }
            ... on PilotCard { color }
            ... on BaseCard { color }
            ... on CommandCard { color }
          }
        }
      }
    }
  }
`;

function DeckListSection() {
  const data = useLazyLoadQuery<AppSideBarDeckListQuery>(DeckListQuery, {});
  const decks = data.deckList.decks;

  if (decks.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>내 덱</SidebarGroupLabel>
      <SidebarMenu>
        {decks.map((deck) => {
          const colors = Array.from(
            new Set(deck.cards.map((c) => c.card?.color).filter(Boolean) as string[])
          );
          return (
            <SidebarMenuItem key={deck.id}>
              <SidebarMenuButton
                render={
                  <Link to="/deck/$deckId" params={{ deckId: deck.id }}>
                    <span className="truncate flex-1">{deck.name}</span>
                    <span className="flex gap-0.5 shrink-0">
                      {colors.map((color) => (
                        <span
                          key={color}
                          className={cn("inline-block w-2.5 h-2.5 rounded-full", COLOR_BG[color], color === "WHITE" && "border border-gray-200")}
                        />
                      ))}
                    </span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link to="/cardlist">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">건담카드게임</span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={
                    <Link to={item.url} className="font-medium">
                      {item.title}
                    </Link>
                  }
                />
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          render={<Link to={item.url}>{item.title}</Link>}
                          isActive={item.isActive}
                        />
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <React.Suspense fallback={null}>
          <DeckListSection />
        </React.Suspense>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
