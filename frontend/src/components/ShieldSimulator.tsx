import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BoardHalfLayout,
  ZoneBox,
  ShieldSlots,
  PlayerSection,
  VsDivider,
} from "@/components/PlayfieldLayout";

// ── BurstOverlay ──────────────────────────────────────────────────────────────
// Absolute overlay inside the P2 section: shield card arcs from the right
// shield area → center, then explodes with particles + "버스트 효과 발동!" text.

function BurstOverlay({ animKey }: { animKey: number }) {
  if (animKey === 0) return null;

  const PARTICLE_COUNT = 10;
  const colors = ["#f97316", "#fbbf24", "#fb923c", "#fde68a", "#ef4444"];

  return (
    <div
      key={animKey}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 30 }}
    >
      {/* Shield card — arcs from shield area (right) to center */}
      <div
        style={{
          position: "absolute",
          width: 34,
          height: 24,
          animation: "burst-card-fly 620ms cubic-bezier(0.25,0.1,0.25,1) forwards",
        }}
        className="rounded border-2 border-yellow-400 bg-yellow-50 shadow-lg flex items-center justify-center text-[8px] font-black text-yellow-700"
      >
        실드
      </div>

      {/* Flash ring */}
      <div
        style={{
          position: "absolute",
          width: 56,
          height: 56,
          borderRadius: "50%",
          animation: "burst-flash 380ms ease-out 540ms forwards",
          opacity: 0,
        }}
        className="bg-yellow-300/50 border-2 border-yellow-400/60"
      />

      {/* Particles */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const size = 5 + (i % 3) * 2;
        return (
          <div
            key={i}
            style={
              {
                position: "absolute",
                width: size,
                height: size,
                borderRadius: i % 3 === 0 ? "2px" : "50%",
                background: colors[i % colors.length],
                animation: `burst-particle-${i} 520ms ease-out 540ms forwards`,
                opacity: 0,
              } as React.CSSProperties
            }
          />
        );
      })}

      {/* "버스트 효과 발동!" text */}
      <div
        style={{
          position: "absolute",
          animation: "burst-text 1400ms ease-out 580ms forwards",
          opacity: 0,
          whiteSpace: "nowrap",
        }}
        className="text-[11px] font-black text-orange-600 bg-white/95 px-2.5 py-1 rounded-lg shadow-lg border border-orange-300"
      >
        【버스트】 효과 발동!
      </div>
    </div>
  );
}

// ── ShieldSimulator ───────────────────────────────────────────────────────────

export function ShieldSimulator() {
  const INIT_SHIELDS = 6;
  const INIT_BASE_HP = 3;
  const [shields, setShields] = useState(INIT_SHIELDS);
  const [baseHp, setBaseHp] = useState(INIT_BASE_HP);
  const [hasBase, setHasBase] = useState(true);
  const [defeated, setDefeated] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [hasBurst, setHasBurst] = useState(false);
  const [flash, setFlash] = useState<"base" | "shield" | "player" | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  function addLog(msg: string) {
    setLog((l) => [msg, ...l.slice(0, 7)]);
  }

  function triggerFlash(zone: "base" | "shield" | "player") {
    setFlash(zone);
    setTimeout(() => setFlash(null), 600);
  }

  function attack() {
    if (defeated || isAttacking) return;

    const snap = { hasBase, baseHp, shields, hasBurst };
    setIsAttacking(true);

    setTimeout(() => {
      if (snap.hasBase) {
        const newHp = snap.baseHp - 1;
        triggerFlash("base");
        if (newHp <= 0) {
          setBaseHp(0);
          setHasBase(false);
          addLog("베이스 HP 0 → 파괴!");
        } else {
          setBaseHp(newHp);
          addLog(`베이스에 대미지 (남은 HP: ${newHp}/3)`);
        }
      } else if (snap.shields > 0) {
        triggerFlash("shield");
        const newShields = snap.shields - 1;
        setShields(newShields);
        if (snap.hasBurst) {
          setBurstKey((k) => k + 1);
          addLog(`실드 1장 파괴 → 【버스트】 발동! (남은: ${newShields}장)`);
        } else {
          addLog(`실드 1장 파괴 → 트래시 (남은: ${newShields}장)`);
        }
      } else {
        triggerFlash("player");
        setDefeated(true);
        addLog("배틀 대미지 직격 → 패배!");
      }
    }, 220);

    setTimeout(() => setIsAttacking(false), 650);
  }

  function reset() {
    setShields(INIT_SHIELDS);
    setBaseHp(INIT_BASE_HP);
    setHasBase(true);
    setDefeated(false);
    setLog([]);
    setFlash(null);
    setIsAttacking(false);
    setBurstKey(0);
  }

  const opponentShieldArea = (
    <div
      className={cn(
        "shrink-0 flex flex-col-reverse rounded border p-0.5 gap-0.5 transition-all duration-300",
        flash === "base" || flash === "shield"
          ? "border-orange-400/50 bg-orange-400/5"
          : flash === "player"
            ? "border-red-300 bg-red-50/50"
            : "border-border bg-white",
      )}
      style={{ width: 56 }}
    >
      <span className="text-[8px] text-center text-muted-foreground leading-none font-medium">
        실드 에어리어
      </span>
      <ZoneBox
        label={hasBase ? "⑥ 베이스" : "⑥ 파괴"}
        sub={hasBase ? `HP ${baseHp}/${INIT_BASE_HP}` : undefined}
        active={true}
        accent={flash === "base"}
        dim={!hasBase}
        className="flex-none py-1"
        animation={flash === "base" ? "hit-shake 320ms ease-out" : undefined}
      />
      <div
        className={cn(
          "flex-1 rounded border p-0.5 flex flex-col gap-0.5 transition-all duration-300",
          flash === "shield"
            ? "border-orange-400/50 bg-orange-400/5"
            : "border-border/50",
        )}
        style={{
          animation: flash === "shield" ? "hit-shake 320ms ease-out" : "none",
        }}
      >
        <span className="text-[8px] text-center text-muted-foreground leading-none">
          ③ 실드
        </span>
        <ShieldSlots count={shields} accent={flash === "shield"} reversed />
      </div>
    </div>
  );

  const myBattleZone = (
    <div className="flex-[3] h-full rounded border border-orange-400/40 bg-orange-400/5 flex items-center justify-center overflow-visible">
      <div
        className="rounded border-2 border-orange-400/50 bg-white shadow-sm flex flex-col items-center justify-center gap-0.5"
        style={{
          width: 34,
          height: 48,
          position: "relative",
          zIndex: isAttacking ? 20 : undefined,
          animation: isAttacking
            ? "unit-attack-diag 640ms ease-in-out forwards"
            : "none",
        }}
      >
        <span className="text-[7px] text-orange-400/70 leading-none">공격</span>
        <span className="text-[9px] font-bold text-orange-600 leading-none">
          유닛
        </span>
        <span className="text-[7px] bg-orange-500/15 rounded px-1 text-orange-600 font-semibold leading-none">
          AP
        </span>
      </div>
    </div>
  );

  const dim = (label: string, cls: string) => (
    <ZoneBox label={label} active={true} className={cls} />
  );

  // Generate per-particle keyframes with individual trajectories
  const particleKeyframes = Array.from({ length: 10 })
    .map((_, i) => {
      const angle = (i / 10) * 360;
      const dist = 28 + (i % 3) * 10;
      const tx = Math.cos((angle * Math.PI) / 180) * dist;
      const ty = Math.sin((angle * Math.PI) / 180) * dist;
      return `
        @keyframes burst-particle-${i} {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(${tx}px, ${ty}px) scale(0); opacity: 0; }
        }`;
    })
    .join("\n");

  return (
    <>
      <style>{`
        @keyframes unit-attack-diag {
          0%   { transform: translateY(0)     translateX(0)     rotate(0deg);  }
          30%  { transform: translateY(-94px) translateX(100px) rotate(14deg); }
          46%  { transform: translateY(-82px) translateX(88px)  rotate(10deg); }
          100% { transform: translateY(0)     translateX(0)     rotate(0deg);  }
        }
        @keyframes hit-shake {
          0%   { transform: translateX(0);   }
          20%  { transform: translateX(5px); }
          45%  { transform: translateX(-4px);}
          65%  { transform: translateX(3px); }
          82%  { transform: translateX(-2px);}
          100% { transform: translateX(0);   }
        }
        /* Curved arc: card starts right of center, swings up then curves down to center */
        @keyframes burst-card-fly {
          0%   { transform: translate(54px, 8px)  rotate(-14deg) scale(0.8);  opacity: 1; }
          30%  { transform: translate(28px, -26px) rotate(-6deg)  scale(0.95); opacity: 1; }
          58%  { transform: translate(4px,  -6px)  rotate(3deg)   scale(1.05); opacity: 1; }
          72%  { transform: translate(0,    0)     rotate(-1deg)  scale(1.15); opacity: 1; }
          86%  { transform: translate(0,    0)     scale(1.35);               opacity: 0.6; }
          100% { transform: translate(0,    0)     scale(0);                  opacity: 0; }
        }
        @keyframes burst-flash {
          0%   { transform: scale(0.2); opacity: 0.9; }
          50%  { transform: scale(1.6); opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes burst-text {
          0%   { transform: translateY(6px) scale(0.65); opacity: 0; }
          18%  { transform: translateY(0) scale(1.08);   opacity: 1; }
          65%  { transform: translateY(0) scale(1);      opacity: 1; }
          100% { transform: translateY(-5px) scale(0.9); opacity: 0; }
        }
        ${particleKeyframes}
      `}</style>
      <div className="rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
          <span className="text-xs font-bold tracking-wide">
            어택 시뮬레이터
          </span>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasBurst}
              onChange={(e) => setHasBurst(e.target.checked)}
              className="accent-primary"
            />
            실드에 【버스트】
          </label>
        </div>

        <div className="p-3 flex flex-col gap-0.5 text-[10px] select-none">
          {/* ── P2 (top, flipped) — 상대 ── */}
          <div className="relative">
            <PlayerSection
              player="p2"
              className={cn(
                "transition-all duration-300",
                flash === "player" && "border-red-400 bg-red-100/80",
              )}
            >
              <div className="flex items-center justify-between text-[9px] font-semibold pb-0.5">
                <span className="text-slate-400">상대</span>
                <span
                  className={cn(
                    "transition-all",
                    defeated ? "text-red-500 animate-pulse" : "text-slate-400",
                  )}
                >
                  {defeated ? "☠ 패배" : "★ 생존"}
                </span>
              </div>
              <BoardHalfLayout
                flipped={true}
                slots={{
                  shieldArea: opponentShieldArea,
                  battle: dim("⑤ 배틀", "flex-[3] h-full"),
                  deck: dim("① 덱", "flex-[1] h-full"),
                  resDeck: dim("② 리소스덱", "flex-[2] h-full"),
                  resource: dim("④ 리소스", "flex-[4] h-full"),
                  trash: dim("⑦ 트래시", "flex-[2] h-full"),
                }}
              />
            </PlayerSection>
            <BurstOverlay animKey={burstKey} />
          </div>

          <VsDivider active={isAttacking} />

          {/* ── P1 (bottom, not flipped) — 나 ── */}
          <PlayerSection player="p1">
            <BoardHalfLayout
              flipped={false}
              slots={{
                shieldArea: (
                  <ZoneBox
                    label="실드 에어리어"
                    active={true}
                    className="shrink-0"
                    // @ts-expect-error ZoneBox forwards style via inline usage
                    style={{ width: 56 }}
                  />
                ),
                battle: myBattleZone,
                deck: dim("① 덱", "flex-[1] h-full"),
                resDeck: dim("② 리소스덱", "flex-[2] h-full"),
                resource: dim("④ 리소스", "flex-[4] h-full"),
                trash: dim("⑦ 트래시", "flex-[2] h-full"),
              }}
            />
            <div className="text-center text-[9px] font-semibold text-blue-400 py-0.5">
              나
            </div>
          </PlayerSection>
        </div>

        {/* Controls + log */}
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={attack}
              disabled={defeated || isAttacking}
              className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-sm"
            >
              어택!
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/40 active:scale-95 transition-all text-muted-foreground"
            >
              ↺
            </button>
          </div>
          {log.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 flex flex-col gap-1 max-h-28 overflow-y-auto">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 text-[11px]",
                    i === 0
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 w-1 h-1 rounded-full mt-1",
                      i === 0 ? "bg-orange-500" : "bg-muted-foreground/40",
                    )}
                  />
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
