import { cn } from "@/lib/utils";

// ── Zone identifiers ──────────────────────────────────────────────────────────

export type ZoneId =
  | "base"
  | "shield"
  | "battle"
  | "deck"
  | "resourceDeck"
  | "resource"
  | "trash"
  | "hand";

export const ZONE_VISIBILITY: Record<ZoneId, "공개" | "비공개"> = {
  battle: "공개",
  deck: "비공개",
  resourceDeck: "비공개",
  resource: "공개",
  trash: "공개",
  base: "공개",
  shield: "비공개",
  hand: "비공개",
};

export function VisibilityDot({ id }: { id: ZoneId }) {
  const v = ZONE_VISIBILITY[id];
  return (
    <span
      title={v}
      className={cn(
        "inline-block rounded-full shrink-0",
        v === "공개" ? "bg-green-400" : "bg-gray-400",
      )}
      style={{ width: 5, height: 5 }}
    />
  );
}

// ── Board half layout ─────────────────────────────────────────────────────────
// Shared proportions for both MiniPlayfield and the setup/battle simulators.
// Layout (normal, not flipped):
//   row A: [실드 에어리어] | [배틀 flex-3] | [덱 flex-1]
//   row B: [리소스덱 flex-2] | [리소스 flex-4] | [트래시 flex-2]
// P2 is flipped=true → rows and columns are mirrored.

export const BATTLE_H = 56;
export const RES_H = 38;

export type BoardHalfSlots = {
  shieldArea: React.ReactNode;
  battle: React.ReactNode;
  deck: React.ReactNode;
  resDeck: React.ReactNode;
  resource: React.ReactNode;
  trash: React.ReactNode;
};

export function BoardHalfLayout({
  flipped = false,
  slots,
}: {
  flipped?: boolean;
  slots: BoardHalfSlots;
}) {
  const battleRow = (
    <div className="flex gap-0.5" style={{ height: BATTLE_H }}>
      {flipped ? <>{slots.deck}{slots.battle}</> : <>{slots.battle}{slots.deck}</>}
    </div>
  );
  const resourceRow = (
    <div className="flex gap-0.5" style={{ height: RES_H }}>
      {flipped
        ? <>{slots.trash}{slots.resource}{slots.resDeck}</>
        : <>{slots.resDeck}{slots.resource}{slots.trash}</>}
    </div>
  );
  const rightCols = (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      {flipped ? <>{resourceRow}{battleRow}</> : <>{battleRow}{resourceRow}</>}
    </div>
  );
  return (
    <div className="flex gap-0.5">
      {flipped ? <>{rightCols}{slots.shieldArea}</> : <>{slots.shieldArea}{rightCols}</>}
    </div>
  );
}

// ── ZoneBox ───────────────────────────────────────────────────────────────────
// Generic zone placeholder used across simulators.

export function ZoneBox({
  label,
  sub,
  active,
  accent,
  dim,
  children,
  className,
  delay = 0,
  animation,
}: {
  label?: string;
  sub?: string;
  active: boolean;
  accent?: boolean;
  dim?: boolean;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: string;
}) {
  return (
    <div
      className={cn(
        "rounded border flex flex-col items-center justify-center text-center leading-none transition-all duration-300 overflow-hidden",
        active
          ? accent
            ? "bg-primary/15 border-primary text-primary"
            : "bg-background border-border text-foreground"
          : "border-dashed border-border/40 bg-transparent opacity-25",
        dim && "opacity-40",
        className,
      )}
      style={{ transitionDelay: `${delay}ms`, animation }}
    >
      {label && <span className="text-[9px] font-semibold px-0.5">{label}</span>}
      {sub && <span className="text-[8px] opacity-60 mt-0.5">{sub}</span>}
      {children}
    </div>
  );
}

// ── ShieldSlots ───────────────────────────────────────────────────────────────
// Six vertically-stacked shield slot indicators.

export function ShieldSlots({
  count,
  accent,
}: {
  count: number;
  accent: boolean;
}) {
  return (
    <div className="flex flex-col gap-[2px] self-stretch">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 w-[13px] rounded-[2px] border transition-all duration-300",
            i < count
              ? accent
                ? "bg-primary/60 border-primary"
                : "bg-slate-700 border-slate-500"
              : "border-dashed border-border/30 opacity-20",
          )}
          style={{ transitionDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}
