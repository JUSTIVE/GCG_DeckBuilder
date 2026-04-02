import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { DeckDetailPageQuery } from "@/__generated__/DeckDetailPageQuery.graphql";
import type { DeckDetailPageAddCardMutation } from "@/__generated__/DeckDetailPageAddCardMutation.graphql";
import type { DeckDetailPageRemoveCardMutation } from "@/__generated__/DeckDetailPageRemoveCardMutation.graphql";
import type { DeckDetailPageRenameDeckMutation } from "@/__generated__/DeckDetailPageRenameDeckMutation.graphql";
import type { DeckDetailPageSetDeckCardsMutation } from "@/__generated__/DeckDetailPageSetDeckCardsMutation.graphql";
import type {
  CardFilterInput,
  CardSort,
} from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { Route } from "@/routes/deck/$deckId";
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
  PencilIcon,
  CheckIcon,
  XIcon,
  MinusIcon,
  LayersIcon,
  SlidersHorizontalIcon,
  FileTextIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  Trash2Icon,
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
              level
              color
              imageUrl
            }
            ... on PilotCard {
              id
              pilot {
                name
              }
              cost
              level
              color
              imageUrl
            }
            ... on BaseCard {
              id
              name
              cost
              level
              color
              imageUrl
            }
            ... on CommandCard {
              id
              name
              cost
              level
              color
              imageUrl
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

const SET_DECK_CARDS_MUTATION = graphql`
  mutation DeckDetailPageSetDeckCardsMutation($deckId: ID!, $cards: [DeckCardInput!]!) {
    setDeckCards(deckId: $deckId, cards: $cards) {
      id
      cards {
        count
        card {
          __typename
          ... on UnitCard { id name cost level color }
          ... on PilotCard { id pilot { name } cost level color }
          ... on BaseCard { id name cost level color }
          ... on CommandCard { id name cost level color }
        }
      }
    }
  }
`;

// ─── Deck code encode / decode ────────────────────────────────────────────────

type DeckCodePayload = { v: 1; cards: { id: string; n: number }[] };

function encodeDeckCode(cards: readonly { count: number; card: any }[]): string {
  const payload: DeckCodePayload = {
    v: 1,
    cards: cards
      .map((dc) => ({ id: (dc.card as any)?.id as string | undefined, n: dc.count }))
      .filter((c): c is { id: string; n: number } => !!c.id),
  };
  return btoa(JSON.stringify(payload));
}

function decodeDeckCode(code: string): { cardId: string; count: number }[] | null {
  try {
    const payload = JSON.parse(atob(code.trim())) as DeckCodePayload;
    if (payload.v !== 1 || !Array.isArray(payload.cards)) return null;
    return payload.cards.map((c) => ({ cardId: c.id, count: c.n }));
  } catch {
    return null;
  }
}

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
  level: number | null;
  color: string;
  typename: string;
  imageUrl: string | null;
};

function extractCardInfo(card: any): CardInfo | null {
  if (!card) return null;
  const { __typename, id, cost, level, color, imageUrl } = card;
  const name = card.name ?? card.pilot?.name;
  if (!id || !name || !color) return null;
  return { id, name, cost: cost ?? null, level: level ?? null, typename: __typename, color, imageUrl: imageUrl ?? null };
}

// ─── Histograms ───────────────────────────────────────────────────────────────

const CHART_H = 36; // px, bar area height
const COLOR_ORDER = ["BLUE", "GREEN", "RED", "PURPLE", "YELLOW", "WHITE"] as const;

function Histogram({
  cards,
  getValue,
  maxBucket,
  label,
  title,
}: {
  cards: readonly { count: number; card: any }[];
  getValue: (card: any) => number | null | undefined;
  maxBucket: number;
  label: (i: number) => string;
  title: string;
}) {
  const colorMap: Record<number, Record<string, number>> = {};
  for (const { card, count } of cards) {
    const val = getValue(card);
    const color = card?.color;
    if (val == null || !color) continue;
    const bucket = Math.min(val, maxBucket);
    if (!colorMap[bucket]) colorMap[bucket] = {};
    colorMap[bucket][color] = (colorMap[bucket][color] ?? 0) + count;
  }

  const totalPerBucket = Array.from({ length: maxBucket + 1 }, (_, i) =>
    Object.values(colorMap[i] ?? {}).reduce((s, n) => s + n, 0),
  );
  const maxCount = Math.max(...totalPerBucket, 1);

  return (
    <div className="px-3 pb-3 shrink-0">
      <p className="text-[10px] text-muted-foreground mb-1">{title}</p>
      <div className="flex items-end gap-1">
        {Array.from({ length: maxBucket + 1 }, (_, i) => {
          const count = totalPerBucket[i];
          const barH = count > 0 ? Math.max(Math.round((count / maxCount) * CHART_H), 4) : 0;
          return (
            <div key={i} className="flex flex-col items-center flex-1" style={{ height: CHART_H + 24 }}>
              <div className="flex flex-col justify-end flex-1 w-full">
                {count > 0 && (
                  <span className="text-[9px] text-muted-foreground text-center leading-none mb-0.5">
                    {count}
                  </span>
                )}
                <div className="w-full rounded-sm overflow-hidden flex flex-col-reverse border border-border/70" style={{ height: barH }}>
                  {COLOR_ORDER.map((color) => {
                    const colorCount = colorMap[i]?.[color] ?? 0;
                    if (!colorCount) return null;
                    return (
                      <div
                        key={color}
                        style={{ flex: colorCount, backgroundColor: COLOR_HEX[color] }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 leading-none">
                {label(i)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostHistogram({ cards }: { cards: readonly { count: number; card: any }[] }) {
  return (
    <Histogram
      cards={cards}
      getValue={(card) => card?.cost}
      maxBucket={7}
      label={(i) => (i === 7 ? "7+" : String(i))}
      title="코스트"
    />
  );
}

function LevelHistogram({ cards }: { cards: readonly { count: number; card: any }[] }) {
  return (
    <Histogram
      cards={cards}
      getValue={(card) => card?.level}
      maxBucket={7}
      label={(i) => (i === 7 ? "7+" : String(i))}
      title="레벨"
    />
  );
}

// ─── DeckPanel ────────────────────────────────────────────────────────────────

type DeckPanelProps = {
  deckName: string;
  cards: readonly { count: number; card: any }[];
  totalCards: number;
  errorMessage: string | null;
  onRemove: (cardId: string) => void;
  onRename: (name: string) => void;
  onSetCards: (cards: { cardId: string; count: number }[]) => void;
  onOpenCard: (cardId: string) => void;
  scrollAll?: boolean;
};

function DeckPanel({
  deckName,
  cards,
  totalCards,
  errorMessage,
  onRemove,
  onRename,
  onSetCards,
  onOpenCard,
  scrollAll = false,
}: DeckPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState(false);

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
    <div className={scrollAll ? "flex flex-col" : "flex flex-col h-full"}>
      {/* Name row */}
      {editing ? (
        <div className={cn("flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0", scrollAll && "sticky top-0 z-10 bg-background")}>
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
        <div className={cn("flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0", scrollAll && "sticky top-0 z-10 bg-background")}>
          <h2 className="font-bold text-sm flex-1 truncate">{deckName}</h2>
          <div className="flex gap-1 shrink-0">
            {Array.from(new Set(cards.map((dc) => dc.card?.color).filter(Boolean))).map((color) => (
              <span key={color} className={cn("inline-block w-2.5 h-2.5 rounded-full", COLOR_BG[color], color === "WHITE" && "border border-gray-200")} />
            ))}
          </div>
          <Button size="icon-sm" variant="ghost" onClick={startEditing}>
            <PencilIcon />
          </Button>
          {cards.length > 0 && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                if (confirm("덱의 모든 카드를 삭제하시겠습니까?")) onSetCards([]);
              }}
            >
              <Trash2Icon className="text-destructive" />
            </Button>
          )}
        </div>
      )}

      <div className="px-3 pb-2 text-xs text-muted-foreground shrink-0">
        {totalCards} / 50장
      </div>

      <LevelHistogram cards={cards} />
      <CostHistogram cards={cards} />

      {errorMessage && (
        <div className="mx-3 mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive shrink-0">
          {errorMessage}
        </div>
      )}

      <div className={scrollAll ? "px-2 pb-4" : "flex-1 min-h-0 overflow-y-auto px-2 pb-4"}>
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
                        <button
                          type="button"
                          className="block"
                          onClick={() => onOpenCard(info.id)}
                        >
                          <img
                            className="h-10 w-8 rounded object-cover cutout cutout-br-md"
                            src={info.imageUrl ?? undefined}
                            style={{
                              backgroundColor: COLOR_HEX[info.color]
                                ? `${COLOR_HEX[info.color]}33`
                                : "var(--muted)",
                            }}
                            alt={info.name}
                          />
                        </button>
                        {info.level != null && (
                          <div className="absolute top-0 left-0 w-4 h-4 rounded-br bg-black/70 text-[9px] font-bold flex items-center justify-center text-white/80 leading-none">
                            {info.level}
                          </div>
                        )}
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-tl text-[9px] font-bold flex items-center justify-center leading-none",
                            COLOR_BG[info.color] ?? "bg-gray-500",
                            info.color === "WHITE" ? "text-gray-700 border-t border-l border-gray-200" : "text-white",
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

      <div className={cn("px-3 pb-3 shrink-0 border-t border-border pt-3 flex flex-col gap-2", scrollAll && "sticky bottom-0 bg-background")}>
        <Button
          className="w-full"
          size="sm"
          disabled={totalCards !== 50}
          onClick={() => {
            const text = cards
              .map((dc) => {
                const id = (dc.card as any)?.id;
                if (!id) return null;
                return `${dc.count}X ${id}`;
              })
              .filter(Boolean)
              .join("\n");
            navigator.clipboard.writeText(text);
          }}
        >
          <ClipboardCopyIcon className="size-3.5" />
          MSA 코드 복사
        </Button>
        <div className="flex gap-1.5">
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(encodeDeckCode(cards))}
          >
            <ClipboardCopyIcon className="size-3.5" />
            덱 코드 복사
          </Button>
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={() => { setPasteOpen((v) => !v); setPasteValue(""); setPasteError(false); }}
          >
            <ClipboardPasteIcon className="size-3.5" />
            덱 코드 불러오기
          </Button>
        </div>
        {pasteOpen && (
          <div className="flex flex-col gap-1.5">
            <textarea
              className={cn(
                "w-full rounded-md border bg-background px-2 py-1.5 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring",
                pasteError && "border-destructive focus:ring-destructive",
              )}
              rows={3}
              placeholder="덱 코드를 붙여넣으세요"
              value={pasteValue}
              onChange={(e) => { setPasteValue(e.target.value); setPasteError(false); }}
            />
            {pasteError && (
              <p className="text-[10px] text-destructive">유효하지 않은 덱 코드입니다.</p>
            )}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  const cards = decodeDeckCode(pasteValue);
                  if (!cards) { setPasteError(true); return; }
                  onSetCards(cards);
                  setPasteOpen(false);
                  setPasteValue("");
                }}
              >
                <CheckIcon className="size-3.5" />
                불러오기
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DeckDetailPage() {
  const { deckId } = Route.useParams();

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
  const [commitSetCards] =
    useMutation<DeckDetailPageSetDeckCardsMutation>(SET_DECK_CARDS_MUTATION);
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
  const deckColorSet = new Set<string>();
  for (const { card, count } of deck.cards) {
    const id = (card as any)?.id;
    const color = (card as any)?.color;
    if (id) deckCardCounts[id] = count;
    if (color) deckColorSet.add(color);
  }
  const deckColors = [...deckColorSet];

  const effectiveFilter: CardFilterInput =
    deckColors.length >= 2
      ? {
          ...filter,
          color: (() => {
            const active = (filter.color as string[] | undefined) ?? [];
            const constrained = active.filter((c) => deckColors.includes(c));
            return (constrained.length > 0 ? constrained : deckColors) as CardFilterInput["color"];
          })(),
        }
      : filter;

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

  function handleSetCards(cards: { cardId: string; count: number }[]) {
    commitSetCards({ variables: { deckId, cards } });
  }

  const panelProps: DeckPanelProps = {
    deckName: deck.name,
    cards: deck.cards,
    totalCards,
    errorMessage,
    onRemove: handleRemove,
    onRename: handleRename,
    onSetCards: handleSetCards,
    onOpenCard: setOverlayCardId,
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-65px)]">
      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop: filter panel (left column) */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-border overflow-y-auto px-4 py-4 gap-4">
          <FilterControls
            filter={filter}
            sort={sort}
            onChange={setFilter}
            onSortChange={setSort}
            deckColors={deckColors}
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
              filter={effectiveFilter}
              sort={sort}
              showDescription={showDescription}
              onCardAdd={handleAdd}
              onCardOpen={setOverlayCardId}
              scrollClassName="overflow-y-auto h-full py-5"
              deckCardCounts={deckCardCounts}
              deckColors={deckColors}
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
              deckColors={deckColors}
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DeckPanel {...panelProps} scrollAll />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
