import * as React from "react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { navMain } from "@/lib/nav";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { AppSideBarDeckListQuery } from "@/__generated__/AppSideBarDeckListQuery.graphql";
import { COLOR_BG } from "src/render/color";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon } from "lucide-react";
import icon from "/favicon.ico";

const DeckListQuery = graphql`
  query AppSideBarDeckListQuery {
    deckList {
      decks {
        id
        name
        colors
        hasLinkWarning
      }
    }
  }
`;

function DeckSubItems({ onNavigate, locale }: { onNavigate: () => void; locale: string }) {
  const data = useLazyLoadQuery<AppSideBarDeckListQuery>(DeckListQuery, {});
  const decks = data.deckList.decks;

  return (
    <>
      {decks.map((deck) => (
        <SidebarMenuSubItem key={deck.id}>
          <SidebarMenuSubButton
            render={
              <Link
                to="/$locale/deck/$deckId"
                params={{ locale: locale as "en" | "jp" | "ko", deckId: deck.id }}
                search={deck.colors.length >= 2 ? { color: deck.colors as any } : {}}
                onClick={onNavigate}
              >
                <span className="truncate flex-1">{deck.name}</span>
                {deck.hasLinkWarning && (
                  <AlertTriangleIcon className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <span className="flex gap-0.5 shrink-0">
                  {deck.colors.map((color) => (
                    <span
                      key={color}
                      className={cn(
                        "inline-block w-2.5 h-2.5 rounded-full",
                        COLOR_BG[color],
                        color === "WHITE" && "border border-gray-200",
                      )}
                    />
                  ))}
                </span>
              </Link>
            }
          />
        </SidebarMenuSubItem>
      ))}
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();
  const closeOnMobile = () => setOpenMobile(false);
  const { locale = "ko" } = useParams({ strict: false });
  const { t } = useTranslation("common");
  const lp = (path: string) => `/${locale}${path}` as const;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link to={lp("") as any} onClick={closeOnMobile}>
                  {/*<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>*/}
                  <img src={icon} alt="logo" className="size-8" />
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{t("nav.title")}</span>
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
              <SidebarMenuItem key={item.titleKey}>
                <SidebarMenuButton
                  render={
                    <Link to={lp(item.path) as any} className="font-medium" onClick={closeOnMobile}>
                      {t(item.titleKey as any)}
                    </Link>
                  }
                />
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.titleKey}>
                        <SidebarMenuSubButton
                          render={
                            <Link to={lp(subItem.path) as any} onClick={closeOnMobile}>
                              {t(subItem.titleKey as any)}
                            </Link>
                          }
                          isActive={subItem.isActive}
                        />
                      </SidebarMenuSubItem>
                    ))}
                    {item.items.some((subItem) => subItem.path === "/decklist") && (
                      <React.Suspense fallback={null}>
                        <DeckSubItems onNavigate={closeOnMobile} locale={locale} />
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
