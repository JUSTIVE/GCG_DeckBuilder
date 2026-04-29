import { useTranslation } from "react-i18next";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { MulliganSimulatorPageDeckListQuery } from "@/__generated__/MulliganSimulatorPageDeckListQuery.graphql";
import type { MulliganSimulatorPageDeckCardsQuery } from "@/__generated__/MulliganSimulatorPageDeckCardsQuery.graphql";
import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import type { FragmentRefs } from "relay-runtime";
import { Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { Button } from "@/components/ui/button";
import { ShuffleIcon, ChevronsUpDownIcon } from "lucide-react";
import { Card } from "@/components/Card";
import { Dossier } from "@/components/docket";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const DeckListQuery = graphql`
  query MulliganSimulatorPageDeckListQuery {
    deckList {
      id
      decks {
        id
        name
      }
    }
  }
`;

const DeckCardsQuery = graphql`
  query MulliganSimulatorPageDeckCardsQuery($deckId: ID!) {
    node(id: $deckId) {
      __typename
      ... on Deck {
        id
        cards {
          __typename
          ... on UnitDeckCard {
            count
            card {
              ...CardFragment
            }
          }
          ... on PilotDeckCard {
            count
            card {
              ...CardFragment
            }
          }
          ... on BaseDeckCard {
            count
            card {
              ...CardFragment
            }
          }
          ... on CommandDeckCard {
            count
            card {
              ...CardFragment
            }
          }
          ... on ResourceDeckCard {
            count
            card {
              ...CardFragment
            }
          }
        }
      }
    }
  }
`;

import { flattenDeckCards } from "@/lib/deckCards";

type DeckCardEntry = {
  readonly count: number;
  readonly card: { readonly " $fragmentSpreads": FragmentRefs<"CardFragment"> };
};

function drawCards(cards: readonly DeckCardEntry[], n: number): CardFragment$key[] {
  const pool: CardFragment$key[] = [];
  for (const { count, card } of cards) {
    for (let i = 0; i < count; i++) {
      pool.push(card as CardFragment$key);
    }
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

function DeckDrawer({ deckId }: { deckId: string }) {
  const { t } = useTranslation("common");
  const data = useLazyLoadQuery<MulliganSimulatorPageDeckCardsQuery>(DeckCardsQuery, { deckId });
  const deck = data.node?.__typename === "Deck" ? data.node : null;
  const flatCards = flattenDeckCards(deck?.cards) as unknown as DeckCardEntry[];

  const [animPhase, setAnimPhase] = useState<"idle" | "out" | "in">("idle");
  const [history, setHistory] = useState<{ id: number; cards: CardFragment$key[] }[]>([]);
  const [drawn, setDrawn] = useState<{ id: number; cards: CardFragment$key[] }>(() => ({
    id: 1,
    cards: deck ? drawCards(flatCards, 5) : [],
  }));
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!deck) return <p className="text-muted-foreground text-sm">{t("deck.notFound")}</p>;

  const totalCards = flatCards.reduce((s, c) => s + c.count, 0);
  const nextRound = drawn.id + 1;

  function redraw() {
    const next = { id: nextRound, cards: drawCards(flatCards, 5) };
    setAnimPhase("out");
    timerRef.current = setTimeout(() => {
      setHistory((h) => [drawn, ...h].slice(0, 10));
      setDrawn(next);
      setAnimPhase("in");
    }, 400);
  }

  function cardStyle(i: number): CSSProperties {
    if (animPhase === "out") {
      return {
        transform: "translateY(-50px) scale(0.15)",
        opacity: 0,
        transition: "transform 220ms ease-in, opacity 180ms ease-in",
        transitionDelay: `${i * 30}ms`,
      };
    }
    if (animPhase === "in") {
      return {
        transform: "translateY(0) scale(1)",
        opacity: 1,
        transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease-out",
        transitionDelay: `${i * 60}ms`,
      };
    }
    return {};
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {t("mulligan.drawCount", { count: totalCards })}
          </span>
          <Button onClick={redraw} variant="outline" size="sm">
            <ShuffleIcon className="size-4" />
            {t("mulligan.redraw")}
          </Button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {drawn.cards.map((cardRef, i) => (
            <div key={i} style={cardStyle(i)}>
              <Card cardRef={cardRef} showDescription={false} onOpen={setOverlayCardId} />
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-muted-foreground border-t pt-4">
            {t("search.history")}
          </div>
          {history.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground/60">
                {t("mulligan.drawLabel", { id: entry.id })}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {entry.cards.map((cardRef, i) => (
                  <Card
                    key={i}
                    cardRef={cardRef}
                    showDescription={false}
                    onOpen={setOverlayCardId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {overlayCardId && (
        <Suspense>
          <CardByIdOverlay cardId={overlayCardId} onClose={() => setOverlayCardId(null)} />
        </Suspense>
      )}
    </div>
  );
}

export function MulliganSimulatorPage() {
  const { t } = useTranslation("common");
  const data = useLazyLoadQuery<MulliganSimulatorPageDeckListQuery>(DeckListQuery, {});
  const decks = data.deckList.decks;
  const [selectedId, setSelectedId] = useState<string | null>(
    decks.length > 0 ? decks[0].id : null,
  );
  const [open, setOpen] = useState(false);

  const selectedName = decks.find((d) => d.id === selectedId)?.name;

  return (
    <div className="flex flex-col w-full">
      <Dossier
        docId="GCG-MULLI-SIM"
        category="TOOLS / マリガン"
        title={t("nav.mulliganSimulator")}
        description={t("nav.mulliganSimulator") as string}
        edition="LAB"
      />
      <div className="max-w-xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        {decks.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("mulligan.noDecks")}</p>
        ) : (
          <>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                className={cn(
                  "flex w-56 items-center justify-between rounded-lg border border-border bg-background px-3 py-1.5 text-sm",
                  "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
                )}
              >
                <span className={cn(!selectedName && "text-muted-foreground")}>
                  {selectedName ?? t("mulligan.selectDeck")}
                </span>
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0">
                <Command>
                  <CommandInput placeholder={t("mulligan.searchDeck")} />
                  <CommandList>
                    <CommandEmpty>{t("deck.notFound")}</CommandEmpty>
                    <CommandGroup>
                      {decks.map((deck) => (
                        <CommandItem
                          key={deck.id}
                          value={deck.name}
                          data-checked={selectedId === deck.id}
                          onSelect={() => {
                            setSelectedId(deck.id);
                            setOpen(false);
                          }}
                        >
                          {deck.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedId && (
              <Suspense
                fallback={<p className="text-muted-foreground text-sm">{t("search.searching")}</p>}
              >
                <DeckDrawer key={selectedId} deckId={selectedId} />
              </Suspense>
            )}
          </>
        )}
      </div>
    </div>
  );
}
