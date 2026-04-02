import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
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

function DeckSubItems() {
  const data = useLazyLoadQuery<AppSideBarDeckListQuery>(DeckListQuery, {});
  const decks = data.deckList.decks;

  return (
    <>
      {decks.map((deck) => {
        const colors = Array.from(
          new Set(deck.cards.map((c) => c.card?.color).filter(Boolean) as string[])
        );
        return (
          <SidebarMenuSubItem key={deck.id}>
            <SidebarMenuSubButton
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
          </SidebarMenuSubItem>
        );
      })}
    </>
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
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          render={<Link to={subItem.url}>{subItem.title}</Link>}
                          isActive={subItem.isActive}
                        />
                      </SidebarMenuSubItem>
                    ))}
                    {item.items.some((subItem) => subItem.url === "/decklist") && (
                      <React.Suspense fallback={null}>
                        <DeckSubItems />
                      </React.Suspense>
                    )}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
