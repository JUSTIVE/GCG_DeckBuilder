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
import { ChevronRightIcon } from "lucide-react";
import { flattenDeckCards } from "@/lib/deckCards";
import {
  MetaBlock,
  DisplayTitle,
  MarkerHighlight,
  StatStrip,
  SectionMark,
  BarcodeStub,
  TickerBand,
  type Stat,
} from "@/components/docket";

export const Query = graphql`
  query MainPageQuery {
    deckList {
      decks {
        id
        name
        colors
        cards {
          __typename
          ... on UnitDeckCard {
            count
            card {
              imageUrl
            }
          }
          ... on PilotDeckCard {
            count
            card {
              imageUrl
            }
          }
          ... on BaseDeckCard {
            count
            card {
              imageUrl
            }
          }
          ... on CommandDeckCard {
            count
            card {
              imageUrl
            }
          }
          ... on ResourceDeckCard {
            count
          }
        }
      }
    }
  }
`;

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

  const now = new Date();
  const today = now.toISOString().slice(0, 10).replace(/-/g, ".");
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const docId = `GCG-${now.getFullYear()}-Q${quarter}`;
  const boostPacks = 3; // GD01..GD03 — released boost packs (out of GD series total)
  const starterDecks = 9; // ST01..ST09
  const totalGameSets = boostPacks + starterDecks;
  const edition = `GD III / III`;
  const totalAcrossDecks = decks.reduce((sum, d) => sum + totalCards(flattenDeckCards(d.cards)), 0);

  const stats: Stat[] = [
    { label: "EST.", value: "2026", sublabel: "Seoul · Tokyo" },
    { label: "DECKS", value: String(decks.length).padStart(3, "0"), sublabel: "In rotation" },
    {
      label: "CARDS",
      value: String(totalAcrossDecks).padStart(3, "0"),
      sublabel: "Across collections",
    },
    {
      label: "SETS",
      value: String(totalGameSets).padStart(3, "0"),
      sublabel: `${boostPacks} boost · ${starterDecks} starter`,
    },
    { label: "LOCALES", value: "03", sublabel: "ko · en · jp" },
  ];

  return (
    <div className="flex flex-col">
      {/* ── HERO / DOSSIER COVER ─────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-8 lg:py-12 docket-grid-bg">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[18rem_1fr]">
          {/* Left meta column */}
          <aside className="flex flex-col gap-4">
            <MetaBlock
              title="FILE"
              subtitle="文書番号"
              rows={[
                { label: "DOC.", value: docId },
                { label: "ISSUED", value: today },
                { label: "EDITION", value: edition },
                { label: "STATUS", value: "CURRENT", highlight: true },
              ]}
            />

            <div className="border border-foreground bg-card p-3 sm:p-4">
              <div className="docket-meta-strong mb-2 pb-2 border-b border-foreground/30">
                CONTENTS / 目次
              </div>
              <ol className="docket-mono text-xs flex flex-col gap-1 tabular-nums">
                {navMain
                  .flatMap((g) => g.items ?? [])
                  .map((item, i) => (
                    <li key={item.titleKey} className="flex gap-2">
                      <span className="text-muted-foreground w-5">
                        {String(i + 1).padStart(2, "0")}.
                      </span>
                      <button
                        type="button"
                        onClick={() => router.navigate({ to: lp(item.path) as any })}
                        className="text-left hover:bg-foreground hover:text-background transition-colors flex-1 cursor-pointer truncate"
                      >
                        {t(item.titleKey as any)}
                      </button>
                    </li>
                  ))}
              </ol>
            </div>

            <div className="border border-foreground bg-card p-3 sm:p-4">
              <div className="docket-meta-strong mb-2">SET IN</div>
              <div className="docket-mono text-xs text-foreground leading-relaxed">
                JetBrains Mono · Archivo Narrow · Noto Sans KR
              </div>
              <div className="mt-3 pt-3 border-t border-foreground/30">
                <BarcodeStub code="gcg-builder.com" />
              </div>
            </div>
          </aside>

          {/* Right hero column */}
          <div className="flex flex-col gap-6 min-w-0 relative">
            <div className="absolute -top-2 -left-2 size-4 border-t border-l border-foreground" />
            <div className="absolute -bottom-2 -right-2 size-4 border-b border-r border-foreground" />

            <div className="flex items-baseline gap-3 docket-meta">
              <span>GCG DECKBUILDER / 機動戦士ガンダム</span>
            </div>
            <div className="docket-meta-strong">INDUSTRIAL DECKS &amp; UNUSUAL PILOTS</div>

            <DisplayTitle className="break-words leading-[0.78]">
              GUNDAM
              <br />
              DECKBUILDER
            </DisplayTitle>

            <p className="docket-mono text-sm sm:text-base text-foreground/85 leading-relaxed max-w-[44rem] mt-2">
              We catalogue <MarkerHighlight>industrial decks</MarkerHighlight> and{" "}
              <MarkerHighlight>unusual pilots</MarkerHighlight> for the table, the matchup and the
              corner of the binder nobody looks at. Catalogued. Numbered. Stamped.
            </p>
          </div>
        </div>
      </section>

      <StatStrip stats={stats} />

      <TickerBand
        items={["SEOUL", "GUNDAM", "GCG DECKBUILDER", "TOKYO", "WE BUILD UNUSUAL DECKS"]}
      />

      {/* ── CATALOGUE / NAV GRID ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-8">
        <SectionMark number="01" title="CATALOGUE" subtitle={t("nav.menu" as any) as string} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6 border border-foreground">
          {navMain.flatMap((group, gi) =>
            (group.items ?? []).map((item, ii) => {
              const idx = gi * 10 + ii;
              return (
                <button
                  key={item.titleKey}
                  type="button"
                  onClick={() => router.navigate({ to: lp(item.path) as any })}
                  className={cn(
                    "group flex flex-col gap-3 p-4 sm:p-5 text-left bg-card",
                    "border-foreground border-r border-b -mr-px -mb-px",
                    "hover:bg-foreground hover:text-background transition-colors cursor-pointer",
                    "min-h-[8.5rem]",
                  )}
                >
                  <div className="flex items-baseline justify-between docket-meta group-hover:text-background/70">
                    <span>0{String(idx).padStart(2, "0")}</span>
                    <span>{t(group.titleKey as any)}</span>
                  </div>
                  <div className="display-title text-lg sm:text-xl font-bold uppercase leading-tight">
                    {t(item.titleKey as any)}
                  </div>
                  <ChevronRightIcon className="size-4 mt-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            }),
          )}
        </div>
      </section>

      {/* ── DECK INDEX ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <SectionMark
          number="02"
          title="DECK INDEX"
          subtitle={`${decks.length} active decks · ${t("nav.deckList") as string}`}
        />

        {decks.length === 0 ? (
          <div className="mt-6 border border-foreground bg-card p-10 flex flex-col items-center gap-3">
            <span className="docket-meta">/ EMPTY</span>
            <p className="docket-mono text-sm text-muted-foreground">
              {t("deck.empty" as any) as string}
            </p>
            <button
              type="button"
              onClick={() => router.navigate({ to: lp("/decklist") as any })}
              className="docket-mono text-xs uppercase tracking-wider px-4 py-2 bg-foreground text-background hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              {t("deck.create" as any) as string} →
            </button>
          </div>
        ) : (
          <ul className="mt-6 border border-foreground divide-y divide-foreground/30 bg-card">
            {decks.map((deck, i) => (
              <li key={deck.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.navigate({
                      to: "/$locale/deck/$deckId",
                      params: { locale, deckId: deck.id },
                      search: deck.colors.length >= 2 ? { color: deck.colors as any } : {},
                    })
                  }
                  className="w-full grid grid-cols-[3.5rem_3fr_2fr_auto] sm:grid-cols-[4rem_3fr_2fr_8rem_auto] gap-3 sm:gap-6 items-center px-4 sm:px-5 py-4 text-left hover:bg-foreground hover:text-background transition-colors cursor-pointer group"
                >
                  <span className="docket-meta tabular-nums">
                    № {String(i + 1).padStart(3, "0")}
                  </span>
                  <span className="display-title text-base sm:text-lg font-bold uppercase truncate">
                    {deck.name}
                  </span>
                  <span className="docket-mono text-xs text-muted-foreground group-hover:text-background/70 tabular-nums">
                    {totalCards(flattenDeckCards(deck.cards))} CARDS
                  </span>
                  <div className="hidden sm:flex gap-1 shrink-0">
                    {deckPreviewImages(flattenDeckCards(deck.cards))
                      .slice(0, 3)
                      .map((url, j) => (
                        <img
                          key={j}
                          src={url}
                          className="h-9 w-6 object-cover border border-foreground/40 grayscale-0 group-hover:grayscale"
                          alt=""
                        />
                      ))}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {deck.colors.map((color) => (
                      <span
                        key={color}
                        className={cn(
                          "inline-block size-2.5",
                          COLOR_BG[color],
                          color === "WHITE" && "border border-foreground/40",
                        )}
                      />
                    ))}
                    <ChevronRightIcon className="size-4 ml-1 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between docket-meta">
          <span>END OF FILE — DC-2026-Q2-001</span>
          <button
            type="button"
            onClick={() => router.navigate({ to: lp("/decklist") as any })}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {t("action.viewAll" as any) as string} →
          </button>
        </div>
      </section>
    </div>
  );
}
