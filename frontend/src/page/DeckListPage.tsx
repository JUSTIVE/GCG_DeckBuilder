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
            ... on UnitCard { color }
            ... on PilotCard { color }
            ... on BaseCard { color }
            ... on CommandCard { color }
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
            ... on UnitCard { color }
            ... on PilotCard { color }
            ... on BaseCard { color }
            ... on CommandCard { color }
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
            ... on UnitCard { color }
            ... on PilotCard { color }
            ... on BaseCard { color }
            ... on CommandCard { color }
          }
        }
      }
    }
  }
`;

export function DeckListPage() {
  const data = useLazyLoadQuery<DeckListPageQuery>(Query, {});
  const [commitCreate, isCreating] = useMutation<DeckListPageCreateDeckMutation>(CREATE_DECK_MUTATION);
  const [commitDelete] = useMutation<DeckListPageDeleteDeckMutation>(DELETE_DECK_MUTATION);
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

  function deckColors(cards: readonly { count: number; card: any }[]): string[] {
    const seen = new Set<string>();
    for (const { card } of cards) {
      const color = card?.color;
      if (color) seen.add(color);
    }
    return Array.from(seen);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
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
        <p className="text-muted-foreground text-sm text-center py-8">덱이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors"
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => router.navigate({ to: "/deck/$deckId", params: { deckId: deck.id } })}
              >
                <div className="font-semibold truncate">{deck.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{totalCards(deck.cards)}장</span>
                  <div className="flex gap-1">
                    {deckColors(deck.cards).map((color) => (
                      <span
                        key={color}
                        className={cn("inline-block w-3 h-3 rounded-full", COLOR_BG[color])}
                      />
                    ))}
                  </div>
                </div>
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
