import { graphql, usePreloadedQuery, useMutation } from "react-relay";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import type { PreloadedQuery } from "react-relay";
import type { DeckListPageQuery } from "@/__generated__/DeckListPageQuery.graphql";
import { Route } from "@/routes/$locale/decklist";
import type { DeckListPageCreateDeckMutation } from "@/__generated__/DeckListPageCreateDeckMutation.graphql";
import type { DeckListPageDeleteDeckMutation } from "@/__generated__/DeckListPageDeleteDeckMutation.graphql";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, Trash2Icon, LayersIcon, AlertCircleIcon } from "lucide-react";
import { COLOR_BG } from "src/render/color";
import { cn } from "@/lib/utils";
import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { renderTrait } from "@/render/trait";
import { triggerClassByKeyword, abilityClassByKeyword } from "@/components/CardDescription";
import { renderKeyword } from "@/render/keyword";
import type { CardKeyword } from "@/routes/$locale/cardlist";

export const Query = graphql`
  query DeckListPageQuery {
    deckList {
      id
      decks {
        id
        name
        createdAt
        colors
        topKeywords
        topTraits
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              imageUrl
            }
            ... on PilotCard {
              imageUrl
            }
            ... on BaseCard {
              imageUrl
            }
            ... on CommandCard {
              imageUrl
            }
          }
        }
      }
    }
  }
`;

const CREATE_DECK_MUTATION = graphql`
  mutation DeckListPageCreateDeckMutation($name: String!) {
    createDeck(name: $name) {
      id
      decks {
        id
        name
        createdAt
        colors
        topKeywords
        topTraits
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              imageUrl
            }
            ... on PilotCard {
              imageUrl
            }
            ... on BaseCard {
              imageUrl
            }
            ... on CommandCard {
              imageUrl
            }
          }
        }
      }
    }
  }
`;

const DELETE_DECK_MUTATION = graphql`
  mutation DeckListPageDeleteDeckMutation($id: ID!) {
    deleteDeck(id: $id) {
      id
      decks {
        id
        name
        createdAt
        colors
        topKeywords
        topTraits
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              imageUrl
            }
            ... on PilotCard {
              imageUrl
            }
            ... on BaseCard {
              imageUrl
            }
            ... on CommandCard {
              imageUrl
            }
          }
        }
      }
    }
  }
`;

export function DeckListPage() {
  const queryRef = Route.useLoaderData() as PreloadedQuery<DeckListPageQuery>;
  const data = usePreloadedQuery<DeckListPageQuery>(Query, queryRef);
  const [commitCreate, isCreating] =
    useMutation<DeckListPageCreateDeckMutation>(CREATE_DECK_MUTATION);
  const [commitDelete] = useMutation<DeckListPageDeleteDeckMutation>(DELETE_DECK_MUTATION);
  const router = useRouter();
  const { locale } = Route.useParams();
  const [newName, setNewName] = useState("");
  const { t } = useTranslation("common");

  const decks = data.deckList.decks;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    commitCreate({
      variables: { name },
      onCompleted: () => setNewName(""),
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(t("deck.confirmDelete", { name }))) return;
    commitDelete({ variables: { id } });
  }

  function totalCards(cards: readonly { count: number }[]): number {
    return cards.reduce((s, c) => s + c.count, 0);
  }

  const KIND_LABELS: Record<string, string> = {
    UnitCard: i18n.t("kind.UNIT", { ns: "game" }),
    PilotCard: i18n.t("kind.PILOT", { ns: "game" }),
    BaseCard: i18n.t("kind.BASE", { ns: "game" }),
    CommandCard: i18n.t("kind.COMMAND", { ns: "game" }),
  };
  const KIND_ORDER = ["UnitCard", "PilotCard", "BaseCard", "CommandCard"] as const;

  function deckKindCounts(cards: readonly { count: number; card: any }[]) {
    const counts: Record<string, number> = {};
    for (const { card, count } of cards) {
      const t = card?.__typename;
      if (t && t in KIND_LABELS) counts[t] = (counts[t] ?? 0) + count;
    }
    return counts;
  }

  function deckPreviewImages(cards: readonly { count: number; card: any }[]): string[] {
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const { card } of cards) {
      const url = card?.imageUrl;
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
        if (urls.length >= 5) break;
      }
    }
    return urls;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <LayersIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">{t("deck.list")}</h1>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder={t("deck.newDeckName")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isCreating || !newName.trim()}>
          <PlusIcon />
          {t("action.create")}
        </Button>
      </form>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">{t("deck.empty")}</p>
      ) : (
        <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors"
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0 flex flex-col gap-1"
                onClick={() =>
                  router.navigate({
                    to: "/$locale/deck/$deckId",
                    params: { locale, deckId: deck.id },
                    search: deck.colors.length >= 2 ? { color: deck.colors as any } : {},
                  })
                }
              >
                <div className="font-semibold truncate mt-2">{deck.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {totalCards(deck.cards) === 50 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("deck.cardCount", { count: 50 })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <AlertCircleIcon className="size-3 shrink-0" />
                      {t("deck.cardCountOf", {
                        count: totalCards(deck.cards),
                        max: 50,
                      })}
                    </span>
                  )}
                  <div className="flex gap-1 p-1">
                    {deck.colors.map((color) => (
                      <span
                        key={color}
                        className={cn(
                          "inline-block w-3 h-3 rounded-full",
                          COLOR_BG[color],
                          color === "WHITE" && "border border-gray-200",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {deckPreviewImages(deck.cards).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      className="h-14 w-10 rounded object-cover shrink-0"
                      alt=""
                    />
                  ))}
                </div>

                {(() => {
                  const counts = deckKindCounts(deck.cards);
                  const parts = KIND_ORDER.filter((k) => counts[k]);
                  if (parts.length === 0) return null;
                  return (
                    <div className="flex gap-2 mt-1">
                      {parts.map((k) => (
                        <span key={k} className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">{KIND_LABELS[k]}</span>{" "}
                          {counts[k]}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const kws = deck.topKeywords;
                  if (kws.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {kws.map((kw) => {
                        const firstToken = KEYWORD_DESCRIPTIONS[kw]?.name[0];
                        const keyword = kw as CardKeyword;
                        const label = renderKeyword(keyword);
                        if (firstToken?.type === "trigger") {
                          return (
                            <span
                              key={kw}
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                                triggerClassByKeyword(keyword),
                              )}
                            >
                              {label}
                            </span>
                          );
                        }
                        return (
                          <span
                            key={kw}
                            className={cn(
                              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] leading-none",
                              abilityClassByKeyword(keyword),
                            )}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
                {(() => {
                  const traits = deck.topTraits;
                  if (traits.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {traits.map((tr) => (
                        <span
                          key={tr}
                          className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground"
                        >
                          {renderTrait(tr)}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(deck.id, deck.name)}
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
