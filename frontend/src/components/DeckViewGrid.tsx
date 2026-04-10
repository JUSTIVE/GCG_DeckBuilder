import { MinusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLOR_HEX } from "src/render/color";
import { CardDescription } from "@/components/CardDescription";
import { extractCardInfo } from "@/lib/cardInfo";

export function DeckViewGrid({
  cards,
  onRemove,
  onOpenCard,
  showDescription,
}: {
  cards: readonly { count: number; card: any }[];
  onRemove: (cardId: string) => void;
  onOpenCard: (cardId: string) => void;
  showDescription: boolean;
}) {
  const { t } = useTranslation("common");
  const items = cards
    .map(({ card, count }) => {
      const info = extractCardInfo(card);
      if (!info) return null;
      return { ...info, count, description: (card?.description ?? []) as string[] };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        {t("deck.noCards")}
      </div>
    );
  }

  const ROTATION_STEP = 3;

  return (
    <div className="overflow-y-auto h-full py-4 px-3">
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
      >
        {items.map((info) => {
          const stackLayers = Math.min(info.count - 1, 2);
          return (
            <div key={info.id} className="flex flex-col gap-1 group">
              <div className="relative">
                {Array.from({ length: stackLayers }, (_, i) => {
                  const rotation = (stackLayers - i) * ROTATION_STEP;
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-lg overflow-hidden"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: "bottom right",
                        opacity: 0.55 + i * 0.15,
                      }}
                    >
                      <img
                        src={info.imageUrl ?? undefined}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          backgroundColor: COLOR_HEX[info.color]
                            ? `${COLOR_HEX[info.color]}33`
                            : "var(--muted)",
                        }}
                      />
                    </div>
                  );
                })}
                <div className="relative">
                  <button type="button" className="w-full block" onClick={() => onOpenCard(info.id)}>
                    <img
                      src={info.imageUrl ?? undefined}
                      alt={info.name}
                      className="w-full rounded-lg object-cover aspect-800/1117"
                      style={{
                        backgroundColor: COLOR_HEX[info.color]
                          ? `${COLOR_HEX[info.color]}`
                          : "var(--muted)",
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(info.id)}
                    className="absolute top-0.5 right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive"
                  >
                    <MinusIcon className="size-3" />
                  </button>
                  {info.count > 1 && (
                    <div className="absolute top-1.5 right-1.5 z-10 min-w-7 h-7 rounded-full bg-white text-black text-sm font-black flex items-center justify-center px-1 leading-none pointer-events-none shadow-lg ring-2 ring-black/20">
                      ×{info.count}
                    </div>
                  )}
                </div>
              </div>
              {showDescription && info.description.length > 0 && (
                <div className="rounded-md bg-black/80 px-2 py-1.5">
                  <CardDescription lines={info.description} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
