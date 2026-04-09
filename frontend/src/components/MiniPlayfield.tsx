import { cn } from "@/lib/utils";
import {
  type ZoneId,
  VisibilityDot,
  BoardHalfLayout,
} from "@/components/PlayfieldLayout";

export type { ZoneId };

// ── MiniPlayfield ─────────────────────────────────────────────────────────────
// Compact read-only overview of one player's play sheet.
// Pass `highlights` to accent specific zones (e.g. for turn-phase annotation).

export function MiniPlayfield({ highlights }: { highlights: ZoneId[] }) {
  const hi = (id: ZoneId) => highlights.includes(id);
  const zone = (id: ZoneId, label: string, cls?: string) => (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center rounded border transition-all duration-300 text-[10px] font-medium leading-tight p-0.5 h-full",
        hi(id)
          ? "bg-orange-500/15 border-orange-500 text-orange-600 font-bold z-10 shadow-sm"
          : "bg-background border-border text-muted-foreground",
        cls,
      )}
    >
      <span className="absolute top-0.5 right-0.5">
        <VisibilityDot id={id} />
      </span>
      {label}
    </div>
  );

  const shieldArea = (
    <div
      className={cn(
        "shrink-0 flex flex-col gap-0.5 rounded border p-0.5 transition-all duration-300",
        hi("base") || hi("shield")
          ? "border-orange-400/50 bg-orange-400/5"
          : "border-border bg-white",
      )}
      style={{ width: 76 }}
    >
      <span className="text-[8px] text-center text-muted-foreground leading-none font-medium">
        실드 에어리어
      </span>
      {zone("base", "⑥\n베이스존", "flex-none py-1 h-auto")}
      {zone("shield", "③\n실드존", "flex-1")}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5 text-[10px] select-none">
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />공개
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />비공개
        </span>
      </div>
      <BoardHalfLayout
        slots={{
          shieldArea,
          battle: zone("battle", "⑤ 배틀 에어리어", "flex-[3]"),
          deck: zone("deck", "①\n덱", "flex-[1] min-w-0"),
          resDeck: zone("resourceDeck", "②\n리소스덱", "flex-[2] min-w-0"),
          resource: zone("resource", "④ 리소스 에어리어", "flex-[4]"),
          trash: zone("trash", "⑦\n트래시", "flex-[2] min-w-0"),
        }}
      />
    </div>
  );
}
