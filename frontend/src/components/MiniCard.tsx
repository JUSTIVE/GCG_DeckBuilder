import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

// ── MiniCard ──────────────────────────────────────────────────────────────────
// 실제 카드 비율(800:1117) 모방. Relay 불필요.

const CARD_THEME = {
  red: {
    border: "border-red-400",
    bg: "bg-red-50",
    head: "bg-red-400",
    stat: "text-red-700",
  },
  blue: {
    border: "border-blue-400",
    bg: "bg-blue-50",
    head: "bg-blue-400",
    stat: "text-blue-700",
  },
  green: {
    border: "border-green-500",
    bg: "bg-green-50",
    head: "bg-green-500",
    stat: "text-green-700",
  },
  slate: {
    border: "border-slate-400",
    bg: "bg-slate-50",
    head: "bg-slate-400",
    stat: "text-slate-600",
  },
  purple: {
    border: "border-purple-400",
    bg: "bg-purple-50",
    head: "bg-purple-400",
    stat: "text-purple-700",
  },
} as const;
export type CardColor = keyof typeof CARD_THEME;

export function MiniCard({
  name,
  ap,
  hp,
  maxHp,
  color = "blue",
  rested = false,
  highlight = false,
  dim = false,
  tag,
  apBoost = 0,
  destroyed = false,
  attacking = false,
  attackDir = -1,
  hit = false,
}: {
  name: string;
  ap?: number;
  hp?: number;
  maxHp?: number;
  color?: CardColor;
  rested?: boolean;
  highlight?: boolean;
  dim?: boolean;
  tag?: string;
  apBoost?: number;
  destroyed?: boolean;
  /** true이면 대상 방향으로 이동 */
  attacking?: boolean;
  /** -1 = 위(P1→P2), 1 = 아래(P2→P1) */
  attackDir?: 1 | -1;
  /** true가 되는 순간 피격 흔들림 */
  hit?: boolean;
}) {
  const c = CARD_THEME[color];
  const cardRef = useRef<HTMLDivElement>(null);
  const [flyTo, setFlyTo] = useState<{ x: number; y: number } | null>(null);
  const [hitKey, setHitKey] = useState(0);
  useEffect(() => {
    if (hit) setHitKey((k) => k + 1);
  }, [hit]);

  useLayoutEffect(() => {
    if (!destroyed) {
      setFlyTo(null);
      return;
    }
    const cardEl = cardRef.current;
    if (!cardEl) return;
    const board = cardEl.closest(".dual-playfield");
    const trashEl = board?.querySelector(
      `[data-trash="${attackDir === 1 ? "p2" : "p1"}"]`,
    );
    if (!trashEl) return;
    const cardRect = cardEl.getBoundingClientRect();
    const trashRect = trashEl.getBoundingClientRect();
    setFlyTo({
      x:
        (trashRect.left + trashRect.right) / 2 -
        (cardRect.left + cardRect.right) / 2,
      y:
        (trashRect.top + trashRect.bottom) / 2 -
        (cardRect.top + cardRect.bottom) / 2,
    });
  }, [destroyed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={cardRef}
      style={{
        animation: "card-appear 280ms cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <div
        style={
          flyTo
            ? {
                transform: `translate(${flyTo.x}px, ${flyTo.y}px) scale(0.35) rotate(${attackDir * -25}deg)`,
                opacity: 0,
                transition:
                  "transform 480ms cubic-bezier(0.4,0,0.8,1), opacity 360ms ease 160ms",
                pointerEvents: "none",
              }
            : {
                transform: `translateY(${attacking ? attackDir * 28 : 0}px)`,
                transition: attacking
                  ? "transform 160ms cubic-bezier(0.4,0,0.2,1)"
                  : "transform 280ms cubic-bezier(0.34,1.56,0.64,1)",
              }
        }
      >
        <div
          key={hitKey}
          style={{ animation: hitKey > 0 ? `card-hit 320ms ease` : undefined }}
        >
          <div
            className={cn(
              "rounded border-2 flex flex-col overflow-hidden shrink-0 select-none",
              c.border,
              c.bg,
              highlight && "ring-2 ring-offset-1 ring-orange-500 shadow-md",
              dim && "opacity-25",
            )}
            style={{
              width: 64,
              height: 89,
              transform: rested ? "rotate(90deg)" : "rotate(0deg)",
              opacity: rested ? 0.72 : 1,
              transition:
                "transform 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 400ms, box-shadow 300ms",
            }}
          >
            <div className={cn("h-5 shrink-0", c.head)} />
            <div className="flex-1 flex items-center justify-center px-1">
              <span
                className={cn(
                  "text-[10px] font-bold text-center leading-tight break-keep",
                  c.stat,
                )}
              >
                {name}
              </span>
            </div>
            {tag && (
              <div className="text-center pb-0.5 px-1">
                <span className="text-[8px] bg-black/10 rounded-sm px-1 font-bold leading-none text-inherit">
                  {tag}
                </span>
              </div>
            )}
            {(ap !== undefined || hp !== undefined) && (
              <div className="flex justify-between items-end px-1.5 pb-1.5 shrink-0">
                {ap !== undefined && (
                  <span
                    className={cn(
                      "font-black leading-none transition-all duration-300",
                      apBoost > 0
                        ? "text-[15px] text-red-700"
                        : `text-[13px] ${c.stat}`,
                    )}
                  >
                    <NumberFlow value={ap + apBoost} />
                  </span>
                )}
                {hp !== undefined && (
                  <span
                    className={cn(
                      "text-[13px] font-black leading-none transition-colors duration-300",
                      hp <= 0 ? "text-red-500 line-through" : c.stat,
                    )}
                  >
                    <NumberFlow value={hp} />
                    {maxHp !== undefined && maxHp !== hp ? `/${maxHp}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
