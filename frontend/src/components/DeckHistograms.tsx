import { COLOR_HEX } from "src/render/color";
import { useTranslation } from "react-i18next";

const CHART_H = 36;
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
                <div
                  className="w-full rounded-sm overflow-hidden flex flex-col-reverse border border-border/70"
                  style={{ height: barH }}
                >
                  {COLOR_ORDER.map((color) => {
                    const colorCount = colorMap[i]?.[color] ?? 0;
                    if (!colorCount) return null;
                    return (
                      <div key={color} style={{ flex: colorCount, backgroundColor: COLOR_HEX[color] }} />
                    );
                  })}
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 leading-none">{label(i)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CostHistogram({ cards }: { cards: readonly { count: number; card: any }[] }) {
  const { t } = useTranslation("common");
  return (
    <Histogram
      cards={cards}
      getValue={(card) => card?.cost}
      maxBucket={7}
      label={(i) => (i === 7 ? "7+" : String(i))}
      title={t("filter.cost")}
    />
  );
}

export function LevelHistogram({ cards }: { cards: readonly { count: number; card: any }[] }) {
  const { t } = useTranslation("common");
  return (
    <Histogram
      cards={cards}
      getValue={(card) => card?.level}
      maxBucket={7}
      label={(i) => (i === 7 ? "7+" : String(i))}
      title={t("filter.level")}
    />
  );
}
