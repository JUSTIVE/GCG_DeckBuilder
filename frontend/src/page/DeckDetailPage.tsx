import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { DeckDetailPageQuery } from "@/__generated__/DeckDetailPageQuery.graphql";
import type { DeckDetailPageAddCardMutation } from "@/__generated__/DeckDetailPageAddCardMutation.graphql";
import type { DeckDetailPageRemoveCardMutation } from "@/__generated__/DeckDetailPageRemoveCardMutation.graphql";
import type { DeckDetailPageRenameDeckMutation } from "@/__generated__/DeckDetailPageRenameDeckMutation.graphql";
import type {
  CardFilterInput,
  CardSort,
} from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { Route } from "@/routes/deck/$deckId";
import { useRouter } from "@tanstack/react-router";
import { useState, useRef, Suspense } from "react";
import { CardList } from "@/components/CardList";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  MinusIcon,
  LayersIcon,
  SlidersHorizontalIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_BG, COLOR_HEX } from "src/render/color";
import {
  FilterControls,
  activeFilterCount,
} from "@/components/CardFilterControls";

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const Query = graphql`
  query DeckDetailPageQuery(
    $deckId: ID!
    $filter: CardFilterInput!
    $sort: CardSort
  ) {
    node(id: $deckId) {
      __typename
      ... on Deck {
        id
        name
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              id
              name
              cost
              color
            }
            ... on PilotCard {
              id
              pilot {
                name
              }
              cost
              color
            }
            ... on BaseCard {
              id
              name
              cost
              color
            }
            ... on CommandCard {
              id
              name
              cost
              color
            }
          }
        }
      }
    }
    ...CardListFragment @arguments(first: 20, filter: $filter, sort: $sort)
  }
`;

const ADD_CARD_MUTATION = graphql`
  mutation DeckDetailPageAddCardMutation($deckId: ID!, $cardId: ID!) {
    addCardToDeck(deckId: $deckId, cardId: $cardId) {
      ... on AddCardToDeckSuccess {
        deck {
          id
          cards {
            count
            card {
              __typename
              ... on UnitCard {
                id
                name
                cost
                color
              }
              ... on PilotCard {
                id
                pilot {
                  name
                }
                cost
                color
              }
              ... on BaseCard {
                id
                name
                cost
                color
              }
              ... on CommandCard {
                id
                name
                cost
                color
              }
            }
          }
        }
      }
      ... on DeckFullError {
        current
        max
      }
      ... on DeckColorLimitExceededError {
        currentColors
        max
      }
      ... on CardCopyLimitExceededError {
        cardId
        limit
        current
      }
    }
  }
`;

const REMOVE_CARD_MUTATION = graphql`
  mutation DeckDetailPageRemoveCardMutation($deckId: ID!, $cardId: ID!) {
    removeCardFromDeck(deckId: $deckId, cardId: $cardId) {
      id
      cards {
        count
        card {
          __typename
          ... on UnitCard {
            id
            name
            cost
            color
          }
          ... on PilotCard {
            id
            pilot {
              name
            }
            cost
            color
          }
          ... on BaseCard {
            id
            name
            cost
            color
          }
          ... on CommandCard {
            id
            name
            cost
            color
          }
        }
      }
    }
  }
`;

const RENAME_MUTATION = graphql`
  mutation DeckDetailPageRenameDeckMutation($id: ID!, $name: String!) {
    renameDeck(id: $id, name: $name) {
      id
      name
    }
  }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const KIND_ORDER = [
  "UnitCard",
  "PilotCard",
  "BaseCard",
  "CommandCard",
] as const;

const KIND_LABELS: Record<string, string> = {
  UnitCard: "유닛",
  PilotCard: "파일럿",
  BaseCard: "베이스",
  CommandCard: "커맨드",
};

const INITIAL_FILTER: CardFilterInput = {
  kind: ["UNIT", "PILOT", "BASE", "COMMAND"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CardInfo = {
  id: string;
  name: string;
  cost: number | null;
  color: string;
  typename: string;
};

function extractCardInfo(card: any): CardInfo | null {
  if (!card) return null;
  const { __typename, id, cost, color } = card;
  const name = card.name ?? card.pilot?.name;
  if (!id || !name || !color) return null;
  return { id, name, cost: cost ?? null, typename: __typename, color };
}

// ─── DeckPanel ────────────────────────────────────────────────────────────────

type DeckPanelProps = {
  deckName: string;
  cards: readonly { count: number; card: any }[];
  totalCards: number;
  errorMessage: string | null;
  onRemove: (cardId: string) => void;
  onRename: (name: string) => void;
};

function DeckPanel({
  deckName,
  cards,
  totalCards,
  errorMessage,
  onRemove,
  onRename,
}: DeckPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  function startEditing() {
    setEditName(deckName);
    setEditing(true);
  }

  function commitEdit() {
    const name = editName.trim();
    if (name && name !== deckName) onRename(name);
    setEditing(false);
  }

  // Group by kind
  const grouped = new Map<string, { count: number; card: any }[]>();
  for (const k of KIND_ORDER) grouped.set(k, []);
  for (const dc of cards) {
    const t = dc.card?.__typename;
    if (grouped.has(t)) grouped.get(t)!.push(dc);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Name row */}
      {editing ? (
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex-1 h-7 text-sm font-bold"
            autoFocus
          />
          <Button size="icon-sm" onClick={commitEdit}>
            <CheckIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0">
          <h2 className="font-bold text-sm flex-1 truncate">{deckName}</h2>
          <Button size="icon-sm" variant="ghost" onClick={startEditing}>
            <PencilIcon />
          </Button>
        </div>
      )}

      <div className="px-3 pb-2 text-xs text-muted-foreground shrink-0">
        {totalCards} / 50장
      </div>

      {errorMessage && (
        <div className="mx-3 mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive shrink-0">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            카드가 없습니다.
          </p>
        )}
        {KIND_ORDER.map((kind) => {
          const group = grouped.get(kind) ?? [];
          if (group.length === 0) return null;
          const groupTotal = group.reduce((s, c) => s + c.count, 0);
          return (
            <div key={kind} className="mb-3">
              <div className="px-1 mb-1 text-xs font-semibold text-muted-foreground">
                {KIND_LABELS[kind]} ({groupTotal})
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.map((dc, i) => {
                  const info = extractCardInfo(dc.card);
                  if (!info) return null;
                  return (
                    <li
                      key={`${info.id}-${i}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
                    >
                      <div className="relative shrink-0">
                        <img
                          className="h-10 w-8 rounded object-cover cutout cutout-br-md"
                          style={{
                            backgroundColor: COLOR_HEX[info.color]
                              ? `${COLOR_HEX[info.color]}33`
                              : "var(--muted)",
                          }}
                          alt={info.name}
                        />
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-tl text-[9px] font-bold flex items-center justify-center text-white leading-none",
                            COLOR_BG[info.color] ?? "bg-gray-500",
                          )}
                        >
                          {info.cost ?? "-"}
                        </div>
                      </div>
                      <span className="flex-1 flex-col text-xs truncate">
                        <div>{info.name}</div>
                        <div>{info.id}</div>
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground w-5 text-center">
                        ×{dc.count}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRemove(info.id)}
                      >
                        <MinusIcon className="text-muted-foreground" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DeckDetailPage() {
  const { deckId } = Route.useParams();
  const router = useRouter();

  const initialFilterRef = useRef<CardFilterInput>(INITIAL_FILTER);
  const data = useLazyLoadQuery<DeckDetailPageQuery>(Query, {
    deckId,
    filter: initialFilterRef.current,
    sort: null,
  });

  const [filter, setFilter] = useState<CardFilterInput>(INITIAL_FILTER);
  const [sort, setSort] = useState<CardSort | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [commitAdd] =
    useMutation<DeckDetailPageAddCardMutation>(ADD_CARD_MUTATION);
  const [commitRemove] =
    useMutation<DeckDetailPageRemoveCardMutation>(REMOVE_CARD_MUTATION);
  const [commitRename] =
    useMutation<DeckDetailPageRenameDeckMutation>(RENAME_MUTATION);
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);

  const node = data.node;
  if (!node || node.__typename !== "Deck") {
    return (
      <div className="px-4 py-8">
        <p className="text-muted-foreground">덱을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const deck = node;
  const totalCards = deck.cards.reduce((s, c) => s + c.count, 0);

  const deckCardCounts: Record<string, number> = {};
  for (const { card, count } of deck.cards) {
    const id = (card as any)?.id;
    if (id) deckCardCounts[id] = count;
  }

  function handleAdd(cardId: string) {
    commitAdd({
      variables: { deckId, cardId },
      onCompleted: (res) => {
        const result = res.addCardToDeck;
        if (!result) return;
        if ("deck" in result) return;
        let msg = "카드를 추가할 수 없습니다.";
        if (
          "current" in result &&
          "max" in result &&
          !("currentColors" in result)
        ) {
          msg = `덱이 가득 찼습니다 (${(result as any).current}/${(result as any).max}장)`;
        } else if ("currentColors" in result) {
          msg = `색상 제한 초과 (최대 ${(result as any).max}색)`;
        } else if ("limit" in result) {
          msg = `복사 한도 초과 (최대 ${(result as any).limit}장)`;
        }
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 3000);
      },
    });
  }

  function handleRemove(cardId: string) {
    commitRemove({ variables: { deckId, cardId } });
  }

  function handleRename(name: string) {
    commitRename({ variables: { id: deckId, name } });
  }

  const panelProps: DeckPanelProps = {
    deckName: deck.name,
    cards: deck.cards,
    totalCards,
    errorMessage,
    onRemove: handleRemove,
    onRename: handleRename,
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-65px)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.navigate({ to: "/decklist" })}
        >
          <ArrowLeftIcon />
        </Button>
        <LayersIcon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold truncate">{deck.name}</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop: filter panel (left column) */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-border overflow-y-auto px-4 py-4 gap-4">
          <FilterControls
            filter={filter}
            sort={sort}
            onChange={setFilter}
            onSortChange={setSort}
          />
          {activeFilterCount(filter) > 0 && (
            <button
              type="button"
              onClick={() => setFilter(INITIAL_FILTER)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer self-start"
            >
              초기화
            </button>
          )}
        </aside>

        {/* Card list (center) */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Mobile top bar */}
          <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                showDescription
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <FileTextIcon className="h-3.5 w-3.5" />
              효과
            </button>
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                activeFilterCount(filter) > 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <SlidersHorizontalIcon className="h-3.5 w-3.5" />
              필터
              {activeFilterCount(filter) > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                  {activeFilterCount(filter)}
                </span>
              )}
            </button>
            {activeFilterCount(filter) > 0 && (
              <button
                type="button"
                onClick={() => setFilter(INITIAL_FILTER)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
              >
                초기화
              </button>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                showDescription
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <FileTextIcon className="h-3.5 w-3.5" />
              효과
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <CardList
              queryRef={data}
              filter={filter}
              sort={sort}
              showDescription={showDescription}
              onCardAdd={handleAdd}
              onCardOpen={setOverlayCardId}
              scrollClassName="overflow-y-auto h-full py-5"
              deckCardCounts={deckCardCounts}
            />
          </div>
        </div>

        {/* Desktop: deck panel (right column) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-l border-border overflow-hidden">
          <DeckPanel {...panelProps} />
        </aside>
      </div>

      {/* Mobile: filter bottom sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-4 pb-0 pt-0 rounded-t-xl max-h-[85dvh] flex flex-col"
        >
          <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
          <SheetHeader className="p-0 mb-4 shrink-0">
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <FilterControls
              filter={filter}
              sort={sort}
              onChange={setFilter}
              onSortChange={setSort}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: floating button to open deck sheet */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <Button
          onClick={() => setDeckSheetOpen(true)}
          className="rounded-full shadow-lg h-11 px-4 gap-2"
        >
          <LayersIcon className="size-4" />
          <span className="text-sm">덱 ({totalCards}/50)</span>
        </Button>
      </div>

      {/* Card detail overlay */}
      {overlayCardId && (
        <Suspense>
          <CardByIdOverlay
            cardId={overlayCardId}
            onClose={() => setOverlayCardId(null)}
          />
        </Suspense>
      )}

      {/* Mobile: deck bottom sheet */}
      <Sheet open={deckSheetOpen} onOpenChange={setDeckSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-0 pb-0 pt-0 rounded-t-xl max-h-[75dvh] flex flex-col"
        >
          <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
          <SheetHeader className="px-3 pb-0 pt-0 shrink-0">
            <SheetTitle className="sr-only">{deck.name}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <DeckPanel {...panelProps} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
