import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { graphql, useMutation } from "react-relay";
import { useRouter } from "@tanstack/react-router";
import { useCardRecognition } from "@/hooks/use-card-recognition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScanIcon, UploadIcon, XIcon } from "lucide-react";
import type {
  CardScannerPageCreateDeckMutation,
  CardScannerPageCreateDeckMutation$data,
} from "@/__generated__/CardScannerPageCreateDeckMutation.graphql";
import type { CardScannerPageSetCardsMutation } from "@/__generated__/CardScannerPageSetCardsMutation.graphql";
import type { RecognizedCard } from "@/lib/card-recognition-types";

const CreateDeckMutation = graphql`
  mutation CardScannerPageCreateDeckMutation($name: String!) {
    createDeck(name: $name) {
      id
      decks {
        id
        name
      }
    }
  }
`;

const SetCardsMutation = graphql`
  mutation CardScannerPageSetCardsMutation($deckId: ID!, $cards: [DeckCardInput!]!) {
    setDeckCards(deckId: $deckId, cards: $cards) {
      id
      cards {
        __typename
      }
    }
  }
`;

export function CardScannerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = (router.state.location.pathname.match(/^\/(ko|en|jp)/) ?? ["", "ko"])[1];

  const { state, progress, results, error, recognize, reset } = useCardRecognition();
  const [deckName, setDeckName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [commitCreate] = useMutation<CardScannerPageCreateDeckMutation>(CreateDeckMutation);
  const [commitSetCards] = useMutation<CardScannerPageSetCardsMutation>(SetCardsMutation);

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      recognize(file);
    },
    [recognize],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const visibleResults = results.filter((_, i) => !removedIndices.has(i));

  const aggregatedCards = aggregateCards(visibleResults);

  const handleCreateDeck = useCallback(() => {
    const name = deckName.trim() || t("scanner.defaultDeckName");
    commitCreate({
      variables: { name },
      onCompleted: (resp: CardScannerPageCreateDeckMutation$data) => {
        const newDeck = resp.createDeck.decks[resp.createDeck.decks.length - 1];
        if (!newDeck) return;

        const cards = aggregatedCards.map((c) => ({
          cardId: c.cardId,
          count: c.count,
        }));

        commitSetCards({
          variables: { deckId: newDeck.id, cards },
          onCompleted: () => {
            router.navigate({
              to: "/$locale/deck/$deckId",
              params: { locale, deckId: newDeck.id },
            });
          },
        });
      },
    });
  }, [deckName, t, commitCreate, commitSetCards, aggregatedCards, router, locale]);

  const handleReset = useCallback(() => {
    reset();
    setPreviewUrl(null);
    setRemovedIndices(new Set());
    setDeckName("");
    if (fileRef.current) fileRef.current.value = "";
  }, [reset]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScanIcon className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">{t("scanner.title")}</h1>
      </div>

      {/* Upload area */}
      {(state === "idle" || state === "initializing" || state === "ready") && !previewUrl && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-12 text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            state === "initializing" && "pointer-events-none opacity-50",
          )}
        >
          <UploadIcon className="h-12 w-12" />
          <p className="text-center text-sm">
            {state === "initializing" ? progress.stage : t("scanner.uploadPrompt")}
          </p>
          <p className="text-xs">{t("scanner.dropHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Processing */}
      {state === "processing" && (
        <div className="space-y-4">
          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              className="w-full rounded-lg border border-border object-contain"
              style={{ maxHeight: 300 }}
            />
          )}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">{progress.stage}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error ?? t("scanner.error")}</p>
          <Button variant="outline" onClick={handleReset}>
            {t("scanner.retry")}
          </Button>
        </div>
      )}

      {/* Results */}
      {state === "done" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("scanner.tips")}</p>

          {visibleResults.length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
              {t("scanner.noCardsFound")}
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold">
                {t("scanner.resultsTitle")} ({visibleResults.length})
              </h2>
              <ul className="space-y-2">
                {results.map((r, i) => {
                  if (removedIndices.has(i)) return null;
                  return (
                    <li
                      key={`${r.cardId}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-2"
                    >
                      <img
                        src={`/cards/${r.cardId}-sm.webp`}
                        alt={r.cardId}
                        className="h-16 w-auto shrink-0 rounded"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{r.cardId}</p>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                            ×{r.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                r.confidence > 0.3 ? "bg-green-500" : "bg-yellow-500",
                              )}
                              style={{ width: `${r.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {t("scanner.confidence", {
                              percent: Math.round(r.confidence * 100),
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setRemovedIndices((s) => new Set(s).add(i))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Deck creation */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Input
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder={t("scanner.defaultDeckName")}
                />
                <Button className="w-full" onClick={handleCreateDeck}>
                  {t("scanner.createDeck")} ({aggregatedCards.length}{" "}
                  {t("deck.cardCount", { count: aggregatedCards.reduce((s, c) => s + c.count, 0) })}
                  )
                </Button>
              </div>
            </>
          )}

          <Button variant="outline" className="w-full" onClick={handleReset}>
            {t("scanner.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}

function aggregateCards(cards: RecognizedCard[]): { cardId: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of cards) {
    map.set(c.cardId, (map.get(c.cardId) ?? 0) + c.count);
  }
  return Array.from(map, ([cardId, count]) => ({ cardId, count }));
}
