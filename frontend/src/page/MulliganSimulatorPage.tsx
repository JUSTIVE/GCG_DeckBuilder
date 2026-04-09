import { graphql, useLazyLoadQuery } from "react-relay";
import type { MulliganSimulatorPageDeckListQuery } from "@/__generated__/MulliganSimulatorPageDeckListQuery.graphql";
import type { MulliganSimulatorPageDeckCardsQuery } from "@/__generated__/MulliganSimulatorPageDeckCardsQuery.graphql";
import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import type { FragmentRefs } from "relay-runtime";
import { Suspense, useState } from "react";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { Button } from "@/components/ui/button";
import { ShuffleIcon, DicesIcon, ChevronsUpDownIcon, CheckIcon } from "lucide-react";
import { Card } from "@/components/Card";
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
          count
          card {
            ...CardFragment
          }
        }
      }
    }
  }
`;

type DeckCardEntry = { readonly count: number; readonly card: { readonly " $fragmentSpreads": FragmentRefs<"CardFragment"> } };

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
  const data = useLazyLoadQuery<MulliganSimulatorPageDeckCardsQuery>(DeckCardsQuery, { deckId });
  const deck = data.node?.__typename === "Deck" ? data.node : null;

  const [history, setHistory] = useState<{ id: number; cards: CardFragment$key[] }[]>([]);
  const [drawn, setDrawn] = useState<{ id: number; cards: CardFragment$key[] }>(() => ({
    id: 1,
    cards: deck ? drawCards(deck.cards, 5) : [],
  }));
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);

  if (!deck) return <p className="text-muted-foreground text-sm">덱을 찾을 수 없습니다.</p>;

  const totalCards = deck.cards.reduce((s, c) => s + c.count, 0);
  const nextRound = drawn.id + 1;

  function redraw() {
    setHistory((h) => [drawn, ...h].slice(0, 10));
    setDrawn({ id: nextRound, cards: drawCards(deck!.cards, 5) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{totalCards}장 중 5장</span>
          <Button onClick={redraw} variant="outline" size="sm">
            <ShuffleIcon className="size-4" />
            다시 뽑기
          </Button>
        </div>
        <div className="flex flex-row gap-3 overflow-x-auto pb-2">
          {drawn.cards.map((cardRef, i) => (
            <div key={i} className="w-40 shrink-0">
              <Card cardRef={cardRef} showDescription={false} onOpen={setOverlayCardId} />
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-muted-foreground border-t pt-4">히스토리</div>
          {history.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground/60">뽑기 #{entry.id}</div>
              <div className="flex flex-row gap-2 overflow-x-auto pb-1">
                {entry.cards.map((cardRef, i) => (
                  <div key={i} className="w-32 shrink-0">
                    <Card cardRef={cardRef} showDescription={false} onOpen={setOverlayCardId} />
                  </div>
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
  const data = useLazyLoadQuery<MulliganSimulatorPageDeckListQuery>(DeckListQuery, {});
  const decks = data.deckList.decks;
  const [selectedId, setSelectedId] = useState<string | null>(
    decks.length > 0 ? decks[0].id : null,
  );
  const [open, setOpen] = useState(false);

  const selectedName = decks.find((d) => d.id === selectedId)?.name;

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <DicesIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">멀리건 시뮬레이터</h1>
      </div>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm">덱이 없습니다. 먼저 덱을 만들어주세요.</p>
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
                {selectedName ?? "덱 선택..."}
              </span>
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
              <Command>
                <CommandInput placeholder="덱 검색..." />
                <CommandList>
                  <CommandEmpty>덱을 찾을 수 없습니다.</CommandEmpty>
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
                        <CheckIcon
                          className={cn(
                            "ml-auto size-4",
                            selectedId === deck.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedId && (
            <Suspense fallback={<p className="text-muted-foreground text-sm">로딩 중...</p>}>
              <DeckDrawer key={selectedId} deckId={selectedId} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
