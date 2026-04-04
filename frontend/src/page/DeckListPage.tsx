import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { DeckListPageQuery } from "@/__generated__/DeckListPageQuery.graphql";
import type { DeckListPageCreateDeckMutation } from "@/__generated__/DeckListPageCreateDeckMutation.graphql";
import type { DeckListPageDeleteDeckMutation } from "@/__generated__/DeckListPageDeleteDeckMutation.graphql";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, Trash2Icon, LayersIcon } from "lucide-react";
import { COLOR_BG } from "src/render/color";
import { cn } from "@/lib/utils";
import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { renderTrait } from "@/render/trait";
import { triggerClass, abilityClass } from "@/components/CardDescription";

const Query = graphql`
  query DeckListPageQuery {
    deckList {
      id
      decks {
        id
        name
        createdAt
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on PilotCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on BaseCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on CommandCard {
              color
              imageUrl
              keywords
              traits
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
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on PilotCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on BaseCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on CommandCard {
              color
              imageUrl
              keywords
              traits
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
        cards {
          count
          card {
            __typename
            ... on UnitCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on PilotCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on BaseCard {
              color
              imageUrl
              keywords
              traits
            }
            ... on CommandCard {
              color
              imageUrl
              keywords
              traits
            }
          }
        }
      }
    }
  }
`;

export function DeckListPage() {
  const data = useLazyLoadQuery<DeckListPageQuery>(Query, {});
  const [commitCreate, isCreating] =
    useMutation<DeckListPageCreateDeckMutation>(CREATE_DECK_MUTATION);
  const [commitDelete] =
    useMutation<DeckListPageDeleteDeckMutation>(DELETE_DECK_MUTATION);
  const router = useRouter();
  const [newName, setNewName] = useState("");

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
    if (!confirm(`"${name}" 덱을 삭제하시겠습니까?`)) return;
    commitDelete({ variables: { id } });
  }

  function totalCards(cards: readonly { count: number }[]): number {
    return cards.reduce((s, c) => s + c.count, 0);
  }

  const KIND_LABELS: Record<string, string> = {
    UnitCard: "유닛",
    PilotCard: "파일럿",
    BaseCard: "베이스",
    CommandCard: "커맨드",
  };
  const KIND_ORDER = [
    "UnitCard",
    "PilotCard",
    "BaseCard",
    "CommandCard",
  ] as const;

  function deckKindCounts(cards: readonly { count: number; card: any }[]) {
    const counts: Record<string, number> = {};
    for (const { card, count } of cards) {
      const t = card?.__typename;
      if (t && t in KIND_LABELS) counts[t] = (counts[t] ?? 0) + count;
    }
    return counts;
  }

  function topKeywords(
    cards: readonly { count: number; card: any }[],
    limit = 3,
  ): string[] {
    const counts = new Map<string, number>();
    for (const { card, count } of cards) {
      for (const kw of card?.keywords ?? []) {
        counts.set(kw, (counts.get(kw) ?? 0) + count);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([kw]) => kw);
  }

  function topTraits(
    cards: readonly { count: number; card: any }[],
    limit = 3,
  ): string[] {
    const counts = new Map<string, number>();
    for (const { card, count } of cards) {
      for (const tr of card?.traits ?? []) {
        counts.set(tr, (counts.get(tr) ?? 0) + count);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tr]) => tr);
  }

  function deckColors(
    cards: readonly { count: number; card: any }[],
  ): string[] {
    const seen = new Set<string>();
    for (const { card } of cards) {
      const color = card?.color;
      if (color) seen.add(color);
    }
    return Array.from(seen);
  }

  function deckPreviewImages(
    cards: readonly { count: number; card: any }[],
  ): string[] {
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
        <h1 className="text-xl font-bold">덱 목록</h1>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder="새 덱 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isCreating || !newName.trim()}>
          <PlusIcon />
          만들기
        </Button>
      </form>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          덱이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min-content, 1fr))" }}>
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors min-w-max"
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0 flex flex-col gap-1"
                onClick={() =>
                  router.navigate({
                    to: "/deck/$deckId",
                    params: { deckId: deck.id },
                  })
                }
              >
                <div className="font-semibold truncate mt-2">{deck.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {totalCards(deck.cards)}장
                  </span>
                  <div className="flex gap-1 p-1">
                    {deckColors(deck.cards).map((color) => (
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
                        <span
                          key={k}
                          className="text-[11px] text-muted-foreground"
                        >
                          <span className="font-medium text-foreground/70">
                            {KIND_LABELS[k]}
                          </span>{" "}
                          {counts[k]}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const kws = topKeywords(deck.cards);
                  if (kws.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {kws.map((kw) => {
                        const name = KEYWORD_DESCRIPTIONS[kw]?.name ?? kw;
                        const isTrigger = name.startsWith("【");
                        const label = name.slice(1, -1);
                        if (isTrigger) {
                          return (
                            <span
                              key={kw}
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                                triggerClass(label),
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
                              abilityClass(label),
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
                  const traits = topTraits(deck.cards);
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
