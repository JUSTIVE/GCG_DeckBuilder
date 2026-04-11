import { graphql, usePreloadedQuery, useMutation } from "react-relay";
import type { PreloadedQuery } from "react-relay";
import type { DeckDetailPageQuery } from "@/__generated__/DeckDetailPageQuery.graphql";
import type { DeckDetailPageAddCardMutation } from "@/__generated__/DeckDetailPageAddCardMutation.graphql";
import type { DeckDetailPageRemoveCardMutation } from "@/__generated__/DeckDetailPageRemoveCardMutation.graphql";
import type { DeckDetailPageRenameDeckMutation } from "@/__generated__/DeckDetailPageRenameDeckMutation.graphql";
import type { DeckDetailPageSetDeckCardsMutation } from "@/__generated__/DeckDetailPageSetDeckCardsMutation.graphql";
import type { CardFilterInput, CardSort } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { Route } from "@/routes/$locale/deck/$deckId";
import type { DeckDetailSearch } from "@/routes/$locale/deck/$deckId";
import { useState, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { CardList } from "@/components/CardList";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { DeckPanel } from "@/components/DeckPanel";
import type { DeckPanelProps } from "@/components/DeckPanel";
import { DeckViewGrid } from "@/components/DeckViewGrid";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayersIcon, SlidersHorizontalIcon, FileTextIcon, LayoutGridIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterControls, activeFilterCount } from "@/components/CardFilterControls";

// ─── Queries & Mutations ──────────────────────────────────────────────────────

export const Query = graphql`
  query DeckDetailPageQuery($deckId: ID!, $filter: CardFilterInput!, $sort: CardSort) {
    node(id: $deckId) {
      __typename
      ... on Deck {
        id name colors
        cards {
          count
          card {
            __typename
            ... on UnitCard { id name cost level color imageUrl description { tokens { ... on TriggerToken { type keyword qualifier { en ko } } ... on AbilityToken { type keyword n } ... on ProseToken { type en ko } } } }
            ... on PilotCard { id pilot { name { en ko } } cost level color imageUrl description { tokens { ... on TriggerToken { type keyword qualifier { en ko } } ... on AbilityToken { type keyword n } ... on ProseToken { type en ko } } } }
            ... on BaseCard { id name cost level color imageUrl description { tokens { ... on TriggerToken { type keyword qualifier { en ko } } ... on AbilityToken { type keyword n } ... on ProseToken { type en ko } } } }
            ... on CommandCard { id name cost level color imageUrl description { tokens { ... on TriggerToken { type keyword qualifier { en ko } } ... on AbilityToken { type keyword n } ... on ProseToken { type en ko } } } }
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
        deck { id colors cards { count card { __typename ... on UnitCard { id name cost color } ... on PilotCard { id pilot { name { en ko } } cost color } ... on BaseCard { id name cost color } ... on CommandCard { id name cost color } } } }
      }
      ... on DeckFullError { current max }
      ... on DeckColorLimitExceededError { currentColors max }
      ... on CardCopyLimitExceededError { cardId limit current }
    }
  }
`;

const REMOVE_CARD_MUTATION = graphql`
  mutation DeckDetailPageRemoveCardMutation($deckId: ID!, $cardId: ID!) {
    removeCardFromDeck(deckId: $deckId, cardId: $cardId) {
      id colors cards { count card { __typename ... on UnitCard { id name cost color } ... on PilotCard { id pilot { name { en ko } } cost color } ... on BaseCard { id name cost color } ... on CommandCard { id name cost color } } }
    }
  }
`;

const RENAME_MUTATION = graphql`
  mutation DeckDetailPageRenameDeckMutation($id: ID!, $name: String!) {
    renameDeck(id: $id, name: $name) { id name colors }
  }
`;

const SET_DECK_CARDS_MUTATION = graphql`
  mutation DeckDetailPageSetDeckCardsMutation($deckId: ID!, $cards: [DeckCardInput!]!) {
    setDeckCards(deckId: $deckId, cards: $cards) {
      id colors cards { count card { __typename ... on UnitCard { id name cost level color } ... on PilotCard { id pilot { name { en ko } } cost level color } ... on BaseCard { id name cost level color } ... on CommandCard { id name cost level color } } }
    }
  }
`;

// ─── Filter helpers ───────────────────────────────────────────────────────────

const INITIAL_FILTER: CardFilterInput = { kind: ["UNIT", "PILOT", "BASE", "COMMAND"] };

function searchToFilter(search: DeckDetailSearch): CardFilterInput {
  return {
    kind: (search.kind as CardFilterInput["kind"]) ?? INITIAL_FILTER.kind,
    cost: search.cost ?? undefined,
    level: search.level ?? undefined,
    zone: search.zone as CardFilterInput["zone"],
    color: search.color as CardFilterInput["color"],
    keyword: search.keyword as CardFilterInput["keyword"],
    trait: search.trait as CardFilterInput["trait"],
    package: search.package as CardFilterInput["package"],
    series: search.series as any,
    query: search.query,
  };
}

function filterToSearch(f: CardFilterInput): Omit<DeckDetailSearch, "view" | "sort"> {
  return {
    kind: f.kind as DeckDetailSearch["kind"],
    cost: f.cost ? [...f.cost] : undefined,
    level: f.level ? [...f.level] : undefined,
    zone: f.zone as DeckDetailSearch["zone"],
    color: f.color as DeckDetailSearch["color"],
    keyword: f.keyword as DeckDetailSearch["keyword"],
    trait: f.trait as DeckDetailSearch["trait"],
    package: f.package as DeckDetailSearch["package"],
    series: (f as any).series as DeckDetailSearch["series"],
    query: f.query ?? undefined,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DeckDetailPage() {
  const { t } = useTranslation("common");
  const { deckId } = Route.useParams();
  const search = Route.useSearch();
  const router = useRouter();
  const isDeckView = search.view === "deck";
  const filter = searchToFilter(search);
  const sort = (search.sort as CardSort | undefined) ?? null;

  const queryRef = Route.useLoaderData() as PreloadedQuery<DeckDetailPageQuery>;
  const data = usePreloadedQuery<DeckDetailPageQuery>(Query, queryRef);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);

  const [commitAdd] = useMutation<DeckDetailPageAddCardMutation>(ADD_CARD_MUTATION);
  const [commitRemove] = useMutation<DeckDetailPageRemoveCardMutation>(REMOVE_CARD_MUTATION);
  const [commitRename] = useMutation<DeckDetailPageRenameDeckMutation>(RENAME_MUTATION);
  const [commitSetCards] = useMutation<DeckDetailPageSetDeckCardsMutation>(SET_DECK_CARDS_MUTATION);

  const node = data.node;
  if (!node || node.__typename !== "Deck") {
    return <div className="px-4 py-8"><p className="text-muted-foreground">{t("deck.notFound")}</p></div>;
  }

  const deck = node;
  const totalCards = deck.cards.reduce((s, c) => s + c.count, 0);
  const deckColors = deck.colors as readonly string[] as string[];
  const deckCardCounts: Record<string, number> = {};
  for (const { card, count } of deck.cards) {
    const id = (card as any)?.id;
    if (id) deckCardCounts[id] = count;
  }

  const { locale } = Route.useParams();
  function navigate(search: (prev: DeckDetailSearch) => DeckDetailSearch) {
    router.navigate({ to: "/$locale/deck/$deckId", params: { locale, deckId }, search, replace: true });
  }
  function toggleView() { navigate((prev) => ({ ...prev, view: isDeckView ? undefined : "deck" })); }
  function setFilter(f: CardFilterInput) { navigate((prev) => ({ ...prev, ...filterToSearch(f) })); }
  function setSort(s: CardSort | null) { navigate((prev) => ({ ...prev, sort: s as DeckDetailSearch["sort"] ?? undefined })); }
  function resetFilter() {
    navigate((prev) => ({
      view: prev.view,
      color: deckColors.length >= 2 ? (prev.color ?? (deckColors as DeckDetailSearch["color"])) : undefined,
    }));
  }

  function handleAdd(cardId: string) {
    commitAdd({
      variables: { deckId, cardId },
      onCompleted: (res) => {
        const result = res.addCardToDeck;
        if (!result || "deck" in result) return;
        let msg = t("deck.addError.generic");
        if ("current" in result && "max" in result && !("currentColors" in result)) {
          msg = t("deck.addError.full", { current: (result as any).current, max: (result as any).max });
        } else if ("currentColors" in result) {
          msg = t("deck.addError.colorLimit", { max: (result as any).max });
        } else if ("limit" in result) {
          msg = t("deck.addError.copyLimit", { limit: (result as any).limit });
        }
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 3000);
      },
    });
  }
  function handleRemove(cardId: string) { commitRemove({ variables: { deckId, cardId } }); }
  function handleRename(name: string) { commitRename({ variables: { id: deckId, name } }); }
  function handleSetCards(cards: { cardId: string; count: number }[]) { commitSetCards({ variables: { deckId, cards } }); }

  const panelProps: DeckPanelProps = {
    deckName: deck.name, colors: deckColors, cards: deck.cards, totalCards,
    errorMessage, onRemove: handleRemove, onRename: handleRename,
    onSetCards: handleSetCards, onOpenCard: setOverlayCardId,
  };

  const filterActiveCount = activeFilterCount(filter);

  return (
    <div className="flex flex-col h-[calc(100dvh-65px)]">
      <div className="flex flex-1 min-h-0">
        {!isDeckView && (
          <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-border overflow-y-auto px-4 py-4 gap-4">
            <FilterControls filter={filter} sort={sort} onChange={setFilter} onSortChange={setSort} deckColors={deckColors} />
            {filterActiveCount > 0 && (
              <button type="button" onClick={resetFilter} className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer self-start">
                {t("action.reset")}
              </button>
            )}
          </aside>
        )}

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Mobile toolbar */}
          <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b border-border shrink-0">
            <button type="button" onClick={toggleView} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", isDeckView ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <LayoutGridIcon className="h-3.5 w-3.5" />{t("deck.view")}
            </button>
            <button type="button" onClick={() => setShowDescription((v) => !v)} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", showDescription ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <FileTextIcon className="h-3.5 w-3.5" />{t("card.effect")}
            </button>
            {!isDeckView && (
              <>
                <button type="button" onClick={() => setFilterSheetOpen(true)} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", filterActiveCount > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <SlidersHorizontalIcon className="h-3.5 w-3.5" />{t("filter.label")}
                  {filterActiveCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">{filterActiveCount}</span>}
                </button>
                {filterActiveCount > 0 && <button type="button" onClick={resetFilter} className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer">{t("action.reset")}</button>}
              </>
            )}
          </div>

          {/* Desktop toolbar */}
          <div className="hidden md:flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
            <button type="button" onClick={toggleView} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", isDeckView ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <LayoutGridIcon className="h-3.5 w-3.5" />{t("deck.view")}
            </button>
            <button type="button" onClick={() => setShowDescription((v) => !v)} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", showDescription ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <FileTextIcon className="h-3.5 w-3.5" />{t("card.effect")}
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {isDeckView ? (
              <DeckViewGrid cards={deck.cards} onRemove={handleRemove} onOpenCard={setOverlayCardId} showDescription={showDescription} />
            ) : (
              <CardList queryRef={data} filter={filter} sort={sort} showDescription={showDescription} onCardAdd={handleAdd} onCardOpen={setOverlayCardId} scrollClassName="overflow-y-auto h-full py-5" deckCardCounts={deckCardCounts} deckColors={deckColors} />
            )}
          </div>
        </div>

        <aside className="hidden md:flex flex-col w-64 shrink-0 border-l border-border overflow-hidden">
          <DeckPanel {...panelProps} />
        </aside>
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="px-4 pb-0 pt-0 rounded-t-xl max-h-[85dvh] flex flex-col">
          <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
          <SheetHeader className="p-0 mb-4 shrink-0"><SheetTitle>{t("filter.label")}</SheetTitle></SheetHeader>
          <div className="overflow-y-auto pb-8">
            <FilterControls filter={filter} sort={sort} onChange={setFilter} onSortChange={setSort} deckColors={deckColors} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <Button onClick={() => setDeckSheetOpen(true)} className="rounded-full shadow-lg h-11 px-4 gap-2">
          <LayersIcon className="size-4" />
          <span className="text-sm">{t("deck.cardCountOf", { count: totalCards, max: 50 })}</span>
        </Button>
      </div>

      {overlayCardId && (
        <Suspense>
          <CardByIdOverlay cardId={overlayCardId} onClose={() => setOverlayCardId(null)} />
        </Suspense>
      )}

      <Sheet open={deckSheetOpen} onOpenChange={setDeckSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="px-0 pb-0 pt-0 rounded-t-xl max-h-[75dvh] flex flex-col">
          <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
          <SheetHeader className="px-3 pb-0 pt-0 shrink-0"><SheetTitle className="sr-only">{deck.name}</SheetTitle></SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DeckPanel {...panelProps} scrollAll />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
