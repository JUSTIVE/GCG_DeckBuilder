import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BoardHalfLayout,
  ZoneBox,
  ShieldSlots,
  PlayerSection,
  VsDivider,
} from "@/components/PlayfieldLayout";

// ── ShieldSimulator ───────────────────────────────────────────────────────────
// Interactive play-sheet-proportioned simulator showing how player attacks
// resolve against 실드 에어리어 (베이스 존 first, then 실드 존 top-to-bottom).

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

  function addLog(msg: string) {
    setLog((l) => [msg, ...l.slice(0, 7)]);
  }

  function triggerFlash(zone: "base" | "shield" | "player") {
    setFlash(zone);
    setTimeout(() => setFlash(null), 600);
  }

  function attack() {
    if (defeated || isAttacking) return;

    // Snapshot current state to avoid stale closure inside timeout
    const snap = { hasBase, baseHp, shields, hasBurst };
    setIsAttacking(true);

    // Damage lands at peak of lunge animation (~220ms)
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
        const burst = snap.hasBurst ? " → 【버스트】 발동!" : " → 트래시";
        addLog(`실드 1장 파괴${burst} (남은: ${newShields}장)`);
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
  }

  // ── Opponent's shield area (P2 top, flipped → shield on RIGHT) ──────────────
  const opponentShieldArea = (
    <div
      className={cn(
        "shrink-0 flex flex-col-reverse rounded border p-0.5 gap-0.5 transition-all duration-300",
        flash === "base" || flash === "shield"
          ? "border-primary/50 bg-primary/5"
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
            ? "border-primary/50 bg-primary/5"
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

  // ── My battle area (P1 bottom, attacker unit) ─────────────────────────────
  const myBattleZone = (
    <div className="flex-[3] h-full rounded border border-primary/40 bg-primary/5 flex items-center justify-center overflow-visible">
      <div
        className="rounded border-2 border-primary/50 bg-white shadow-sm flex flex-col items-center justify-center gap-0.5"
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
        <span className="text-[7px] text-primary/50 leading-none">공격</span>
        <span className="text-[9px] font-bold text-primary leading-none">
          유닛
        </span>
        <span className="text-[7px] bg-primary/15 rounded px-1 text-primary font-semibold leading-none">
          AP
        </span>
      </div>
    </div>
  );

  const dim = (label: string, cls: string) => (
    <ZoneBox label={label} active={true} className={cls} />
  );

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
                      i === 0 ? "bg-primary" : "bg-muted-foreground/40",
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
