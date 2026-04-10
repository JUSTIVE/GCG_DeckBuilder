import { usePreloadedQuery } from "react-relay";
import { graphql } from "relay-runtime";
import type { MainPageQuery } from "@/__generated__/MainPageQuery.graphql";
import type { PreloadedQuery } from "react-relay";
import { Route } from "@/routes/$locale/index";
import { useRouter, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { navMain } from "@/lib/nav";
import { COLOR_BG } from "src/render/color";
import { cn } from "@/lib/utils";
import {
  SearchIcon,
  LayersIcon,
  WrenchIcon,
  ChevronRightIcon,
} from "lucide-react";

export const Query = graphql`
  query MainPageQuery {
    deckList {
      decks {
        id
        name
        colors
        cards {
          count
          card {
            __typename
            ... on UnitCard { imageUrl }
            ... on PilotCard { imageUrl }
            ... on BaseCard { imageUrl }
            ... on CommandCard { imageUrl }
          }
        }
      }
    }
  }
`;

const NAV_ICONS: Record<string, React.ReactNode> = {
  "nav.cardSearch": <SearchIcon className="size-5" />,
  "nav.deckManagement": <LayersIcon className="size-5" />,
  "nav.tools": <WrenchIcon className="size-5" />,
};

function totalCards(cards: readonly { count: number }[]) {
  return cards.reduce((s, c) => s + c.count, 0);
}

function deckPreviewImages(cards: readonly { count: number; card: any }[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const { card } of cards) {
    const url = card?.imageUrl;
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
      if (urls.length >= 4) break;
    }
  }
  return urls;
}

export function MainPage() {
  const queryRef = Route.useLoaderData() as PreloadedQuery<MainPageQuery>;
  const data = usePreloadedQuery<MainPageQuery>(Query, queryRef);
  const router = useRouter();
  const { locale = "ko" } = useParams({ strict: false });
  const { t } = useTranslation("common");
  const decks = data.deckList.decks;
  const lp = (path: string) => `/${locale}${path}` as const;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Nav grid */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("nav.menu" as any)}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {navMain.flatMap((group) =>
            (group.items ?? []).map((item) => (
              <button
                key={item.titleKey}
                type="button"
                onClick={() => router.navigate({ to: lp(item.path) as any })}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-4 hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <span className="text-muted-foreground">
                  {NAV_ICONS[group.titleKey] ?? <SearchIcon className="size-5" />}
                </span>
                <span className="text-sm font-semibold">{t(item.titleKey as any)}</span>
                <span className="text-xs text-muted-foreground">{t(group.titleKey as any)}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Deck list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("nav.deckList")}</h2>
          <button
            type="button"
            onClick={() => router.navigate({ to: lp("/decklist") as any })}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            {t("action.viewAll" as any)}
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>

        {decks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("deck.empty" as any)}{" "}
            <button
              type="button"
              onClick={() => router.navigate({ to: lp("/decklist") as any })}
              className="underline cursor-pointer hover:text-foreground"
            >
              {t("deck.create" as any)}
            </button>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {decks.map((deck) => (
              <li key={deck.id}>
                <button
                  type="button"
                  onClick={() => router.navigate({ to: "/$locale/deck/$deckId", params: { locale, deckId: deck.id }, search: deck.colors.length >= 2 ? { color: deck.colors as any } : {} })}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex gap-1 shrink-0">
                    {deckPreviewImages(deck.cards).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        className="h-10 w-7 rounded object-cover"
                        alt=""
                      />
                    ))}
                    {deckPreviewImages(deck.cards).length === 0 && (
                      <div className="h-10 w-7 rounded bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{deck.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t("deck.cardCount", { count: totalCards(deck.cards) } as any)}</span>
                      <div className="flex gap-1">
                        {deck.colors.map((color) => (
                          <span
                            key={color}
                            className={cn("inline-block w-2.5 h-2.5 rounded-full", COLOR_BG[color], color === "WHITE" && "border border-gray-200")}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
