import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ShieldSlots } from "@/components/PlayfieldLayout";
import { HL, type SetupHighlight } from "@/components/SetupDualPlayfield";

// ── MiniCard ──────────────────────────────────────────────────────────────────
// Compact card visual matching actual card proportions (800:1117 ≈ 36×50px).
// Standalone — no Relay dependency.

const CARD_THEME = {
  red:    { border: "border-red-400",    bg: "bg-red-50",    head: "bg-red-400",    stat: "text-red-700"    },
  blue:   { border: "border-blue-400",   bg: "bg-blue-50",   head: "bg-blue-400",   stat: "text-blue-700"   },
  green:  { border: "border-green-500",  bg: "bg-green-50",  head: "bg-green-500",  stat: "text-green-700"  },
  slate:  { border: "border-slate-400",  bg: "bg-slate-50",  head: "bg-slate-400",  stat: "text-slate-600"  },
  yellow: { border: "border-yellow-500", bg: "bg-yellow-50", head: "bg-yellow-400", stat: "text-yellow-700" },
  purple: { border: "border-purple-400", bg: "bg-purple-50", head: "bg-purple-400", stat: "text-purple-700" },
} as const;
type CardColor = keyof typeof CARD_THEME;

function MiniCard({
  name, ap, hp, maxHp, color = "blue", rested = false,
  highlight = false, dim = false, tag, apBoost = 0, destroyed = false,
}: {
  name: string; ap?: number; hp?: number; maxHp?: number;
  color?: CardColor; rested?: boolean; highlight?: boolean; dim?: boolean;
  tag?: string; apBoost?: number; destroyed?: boolean;
}) {
  const c = CARD_THEME[color];
  const displayAp = (ap ?? 0) + apBoost;
  return (
    <div
      className={cn(
        "rounded border-2 flex flex-col overflow-hidden shrink-0 select-none",
        c.border, c.bg,
        highlight && "ring-2 ring-offset-1 ring-primary shadow-lg",
        (dim || destroyed) && "opacity-25",
      )}
      style={{
        width: 36, height: 50,
        transform: rested ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 400ms ease, box-shadow 300ms ease",
      }}
    >
      {/* Color header — simulates card artwork area */}
      <div className={cn("h-3 shrink-0", c.head)} />
      {/* Name */}
      <div className="flex-1 flex items-center justify-center px-0.5">
        <span className={cn("text-[7px] font-bold text-center leading-tight break-keep", c.stat)}>
          {name}
        </span>
      </div>
      {/* Keyword tag */}
      {tag && (
        <div className="text-center pb-0.5 px-0.5">
          <span className="text-[6px] bg-black/10 rounded-sm px-0.5 font-bold leading-none text-inherit">
            {tag}
          </span>
        </div>
      )}
      {/* Stats: AP left, HP right */}
      {(ap !== undefined || hp !== undefined) && (
        <div className="flex justify-between items-end px-1 pb-0.5 shrink-0">
          {ap !== undefined && (
            <span className={cn(
              "text-[9px] font-black leading-none transition-colors duration-300",
              apBoost > 0 ? "text-primary" : c.stat,
            )}>
              {displayAp}
            </span>
          )}
          {hp !== undefined && (
            <span className={cn(
              "text-[9px] font-black leading-none text-right transition-colors duration-300",
              hp <= 0 ? "text-red-500 line-through" : c.stat,
            )}>
              {hp}{maxHp !== undefined && maxHp !== hp ? `/${maxHp}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── DemoShell ─────────────────────────────────────────────────────────────────
// Shared dual-player layout: P2 (top/flipped) vs P1 (bottom) + log + replay.
// Accent color pulled from SetupDualPlayfield's HL map.

function DemoShell({
  p1, p2,
  p2Shields, p1Shields,
  p2ShieldAccent = false, p1ShieldAccent = false,
  log, done, onReplay, accentKey,
}: {
  p1: React.ReactNode;
  p2: React.ReactNode;
  p2Shields?: number;
  p1Shields?: number;
  p2ShieldAccent?: boolean;
  p1ShieldAccent?: boolean;
  log?: string;
  done: boolean;
  onReplay: () => void;
  accentKey?: SetupHighlight;
}) {
  const hlColor = accentKey ? HL[accentKey] : null;

  return (
    <div className="flex flex-col gap-0 text-[10px] select-none">
      {/* P2 (opponent, top) */}
      <div className="flex items-stretch gap-2 rounded-md bg-blue-50/70 px-2 py-1.5 min-h-[68px]">
        <span className="text-[8px] font-semibold text-slate-400 self-start pt-0.5 shrink-0">상대</span>
        {p2Shields !== undefined && (
          <div className="flex flex-col items-center gap-[2px] justify-center shrink-0">
            <ShieldSlots count={p2Shields} accent={p2ShieldAccent} />
            <span className="text-[7px] text-muted-foreground leading-none">실드</span>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center gap-3">
          {p2}
        </div>
      </div>

      {/* VS divider */}
      <div className="flex items-center gap-2 py-0.5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[8px] font-medium text-muted-foreground px-1">VS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* P1 (me, bottom) */}
      <div className="flex items-stretch gap-2 rounded-md bg-rose-50/70 px-2 py-1.5 min-h-[68px]">
        <div className="flex-1 flex items-center justify-center gap-3">
          {p1}
        </div>
        {p1Shields !== undefined && (
          <div className="flex flex-col items-center gap-[2px] justify-center shrink-0">
            <span className="text-[7px] text-muted-foreground leading-none">실드</span>
            <ShieldSlots count={p1Shields} accent={p1ShieldAccent} />
          </div>
        )}
        <span className="text-[8px] font-semibold text-slate-400 self-end pb-0.5 shrink-0">나</span>
      </div>

      {/* Log + Replay */}
      <div className="flex items-center gap-2 px-1 pt-1.5 min-h-[26px]">
        {log ? (
          <span
            className={cn(
              "flex-1 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all duration-300",
              hlColor ? `${hlColor.bg} ${hlColor.text}` : "bg-muted/60 text-foreground",
            )}
          >
            {log}
          </span>
        ) : (
          <span className="flex-1 text-[10px] text-muted-foreground/40 px-2">─</span>
        )}
        {done && (
          <button
            type="button"
            onClick={onReplay}
            className="text-[9px] px-2 py-0.5 rounded border border-border hover:bg-muted/50 text-muted-foreground shrink-0 transition-colors"
          >
            ↺ 다시 보기
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Timing helper ─────────────────────────────────────────────────────────────

function useAutoStep(
  delays: number[],
  key: number,
): [number, () => void] {
  const [step, setStep] = useState(0);
  const [replayKey, setReplayKey] = useState(key);

  useEffect(() => {
    setStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((delay, i) => {
      timers.push(setTimeout(() => setStep(i + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [replayKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  return [step, () => setReplayKey(k => k + 1)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual ability demos
// ─────────────────────────────────────────────────────────────────────────────

// ── <블로커> ──────────────────────────────────────────────────────────────────

function BlockerDemo() {
  const [step, replay] = useAutoStep([700, 1600, 2600], 0);

  const logs = [
    "P1이 상대 플레이어에게 어택 선언",
    "P2 블로커 유닛을 레스트 → 공격 대상 변경",
    "블로커 유닛이 배틀 대미지를 받음",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step === 1 ? "start" : step >= 2 ? "shield" : undefined}
      p2={
        <div className="flex items-end gap-3">
          {/* Blocker unit */}
          <div className="flex flex-col items-center gap-0.5">
            <MiniCard
              name="블로커 유닛" ap={2} hp={3} color="blue"
              tag="블로커"
              dim={step === 0}
              rested={step >= 2}
              highlight={step === 2}
            />
            {step === 2 && (
              <span className="text-[8px] text-blue-600 font-bold">발동!</span>
            )}
          </div>
          {/* Player target indicator */}
          <div className={cn(
            "rounded-lg border-2 px-2 py-2 text-center text-[9px] font-bold leading-tight transition-all duration-400",
            step === 1
              ? "border-red-400 bg-red-100 text-red-700 scale-110"
              : step >= 2
                ? "border-border/30 text-muted-foreground/50 scale-100"
                : "border-border text-muted-foreground",
          )}>
            플레이어
          </div>
        </div>
      }
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="공격 유닛" ap={3} hp={3} color="red"
            rested={step >= 1}
            highlight={step >= 1 && step < 3}
          />
          {step >= 1 && (
            <span className={cn(
              "text-[8px] font-bold transition-all duration-300",
              step === 1 ? "text-red-500" : "text-blue-500",
            )}>
              {step === 1 ? "→ 플레이어" : step === 2 ? "→ 블로커!" : "어택"}
            </span>
          )}
        </div>
      }
    />
  );
}

// ── <선제공격> ────────────────────────────────────────────────────────────────

function FirstStrikeDemo() {
  const [step, replay] = useAutoStep([700, 1700, 2700], 0);

  // P1 (AP 3) attacks P2 (HP 2). First Strike: P1 hits first →
  // P2 is destroyed before it can counterattack → P1 takes 0 damage.
  const p2Hp = step >= 2 ? 0 : 2;

  const logs = [
    "선제공격: P1 유닛이 먼저 대미지를 줌 (AP 3)",
    "P2 유닛 HP 2 → 0 파괴! 반격 불가",
    "P1 유닛은 대미지를 받지 않음",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step === 3 ? "hand" : "start"}
      p2={
        <div className="flex flex-col items-center gap-0.5">
          <MiniCard
            name="P2 유닛" ap={2} hp={p2Hp} maxHp={2} color="blue"
            rested={step >= 1}
            highlight={step === 2}
            destroyed={step >= 2}
          />
          {step >= 2 && (
            <span className="text-[8px] text-red-500 font-bold">파괴! 반격 없음</span>
          )}
        </div>
      }
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="P1 유닛" ap={3} hp={3} maxHp={3} color="red"
            tag="선제공격"
            rested={step >= 1}
            highlight={step >= 1}
          />
          {step === 1 && (
            <span className="text-[8px] text-red-500 font-bold">먼저 공격!</span>
          )}
          {step >= 3 && (
            <span className="text-[8px] text-green-600 font-bold">HP 3/3 무손</span>
          )}
        </div>
      }
    />
  );
}

// ── <고기동> ──────────────────────────────────────────────────────────────────

function HighManeuverDemo() {
  const [step, replay] = useAutoStep([700, 1600, 2500], 0);

  const logs = [
    "P2가 블로커 발동 시도",
    "고기동: 블로커 효과를 받지 않음!",
    "P1이 상대 플레이어에게 직접 대미지",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step === 1 ? "shield" : step === 2 ? "order" : "start"}
      p2={
        <div className="flex items-end gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <MiniCard
              name="블로커 유닛" ap={2} hp={3} color="blue"
              tag="블로커"
              dim={step === 0}
              rested={step === 1}
              highlight={step === 1}
              destroyed={step >= 2}
            />
            {step === 1 && <span className="text-[8px] text-blue-500 font-bold">발동 시도</span>}
            {step >= 2 && <span className="text-[8px] text-slate-400 line-through">블로커</span>}
          </div>
          <div className={cn(
            "rounded-lg border-2 px-2 py-2 text-center text-[9px] font-bold leading-tight transition-all duration-400",
            step === 3
              ? "border-red-400 bg-red-100 text-red-700 scale-110"
              : "border-border text-muted-foreground",
          )}>
            플레이어
          </div>
        </div>
      }
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="고기동 유닛" ap={3} hp={3} color="red"
            tag="고기동"
            rested={step >= 1}
            highlight={step >= 2}
          />
          {step >= 2 && (
            <span className="text-[8px] text-primary font-bold">블로커 무시!</span>
          )}
        </div>
      }
    />
  );
}

// ── <돌파 X> ──────────────────────────────────────────────────────────────────

function BreachDemo() {
  const [step, replay] = useAutoStep([700, 1600, 2500], 0);

  // Start with 4 shields, breach 2 → 2 remain
  const shieldCount = step >= 3 ? 2 : 4;

  const logs = [
    "P1 유닛이 P2 유닛을 배틀 대미지로 파괴!",
    "돌파 2 발동: 실드 에어리어에 2 대미지",
    "실드 2장 추가 파괴!",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step >= 2 ? "shield" : "start"}
      p2Shields={shieldCount}
      p2ShieldAccent={step >= 2}
      p2={
        <div className="flex flex-col items-center gap-0.5">
          <MiniCard
            name="P2 유닛" ap={2} hp={0} maxHp={2} color="blue"
            destroyed={step >= 1}
            highlight={step === 1}
          />
          {step >= 1 && <span className="text-[8px] text-red-500 font-bold">파괴!</span>}
        </div>
      }
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="돌파 유닛" ap={3} hp={3} color="red"
            tag="돌파 2"
            rested={step >= 1}
            highlight={step >= 2}
          />
          {step >= 2 && (
            <span className="text-[8px] text-primary font-bold">돌파 발동!</span>
          )}
        </div>
      }
    />
  );
}

// ── <원호 X> ──────────────────────────────────────────────────────────────────

function SupportDemo() {
  const [step, replay] = useAutoStep([700, 1500, 2500], 0);

  const apBoost = step >= 3 ? 2 : 0;

  const logs = [
    "원호 유닛을 레스트시킴",
    "공격 유닛 AP +2 (이 턴 동안)",
    "AP 2 → 4로 강화!",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step >= 2 ? "hand" : "order"}
      p2={
        <MiniCard name="P2 유닛" ap={3} hp={3} color="blue" />
      }
      p1={
        <div className="flex items-end gap-3">
          {/* Support unit */}
          <div className="flex flex-col items-center gap-0.5">
            <MiniCard
              name="원호 유닛" ap={1} hp={2} color="slate"
              tag="원호 2"
              rested={step >= 2}
              highlight={step === 1 || step === 2}
            />
            {step === 1 && <span className="text-[8px] text-primary font-bold">발동!</span>}
          </div>
          {/* Attacker unit */}
          <div className="flex flex-col items-center gap-0.5">
            <MiniCard
              name="공격 유닛" ap={2} hp={3} color="red"
              apBoost={apBoost}
              highlight={step >= 3}
            />
            {step >= 3 && (
              <span className="text-[8px] text-primary font-bold">AP +2!</span>
            )}
          </div>
        </div>
      }
    />
  );
}

// ── <제압> ────────────────────────────────────────────────────────────────────

function SuppressionDemo() {
  // Without 제압: 1 shield breaks. With 제압: 2 shields break simultaneously.
  const [step, replay] = useAutoStep([700, 1600, 2600], 0);

  const shieldCount = step >= 3 ? 4 : 6;

  const logs = [
    "제압 유닛이 상대 플레이어에게 어택!",
    "제압: 실드 2장에 동시에 대미지 부여",
    "실드 2장 동시 파괴!",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step >= 2 ? "shield" : "start"}
      p2Shields={shieldCount}
      p2ShieldAccent={step >= 2}
      p2={
        <div className={cn(
          "rounded-lg border-2 px-2 py-2 text-center text-[9px] font-bold leading-tight transition-all duration-400",
          step >= 2
            ? "border-red-400 bg-red-100 text-red-700"
            : "border-border text-muted-foreground",
        )}>
          플레이어
        </div>
      }
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="제압 유닛" ap={2} hp={3} color="purple"
            tag="제압"
            rested={step >= 1}
            highlight={step >= 2}
          />
          {step >= 2 && (
            <span className="text-[8px] text-primary font-bold">2장 동시!</span>
          )}
        </div>
      }
    />
  );
}

// ── <리페어 X> ────────────────────────────────────────────────────────────────

function RepairDemo() {
  const [step, replay] = useAutoStep([700, 1500, 2400], 0);

  const hp = step >= 3 ? 3 : 1;

  const logs = [
    "턴 종료 시 리페어 2 발동",
    "HP 회복 중… (+2)",
    "HP 1 → 3 회복 완료!",
  ];

  return (
    <DemoShell
      done={step === 3}
      onReplay={replay}
      log={logs[step - 1]}
      accentKey={step >= 2 ? "exres" : "deck"}
      p2={<MiniCard name="P2 유닛" ap={2} hp={3} color="blue" />}
      p1={
        <div className="flex flex-col items-center gap-1">
          <MiniCard
            name="리페어 유닛" ap={2} hp={hp} maxHp={3} color="green"
            tag="리페어 2"
            highlight={step >= 2}
          />
          {step === 0 && (
            <span className="text-[8px] text-muted-foreground">HP 1/3 (피해 받음)</span>
          )}
          {step >= 2 && (
            <span className="text-[8px] text-green-600 font-bold">
              {step === 2 ? "HP 회복 중…" : "HP 회복!"}
            </span>
          )}
        </div>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AbilityDemo — entry point
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_MAP: Partial<Record<string, () => React.ReactElement>> = {
  BLOCKER:      BlockerDemo,
  FIRST_STRIKE: FirstStrikeDemo,
  HIGH_MANEUVER: HighManeuverDemo,
  BREACH:       BreachDemo,
  SUPPORT:      SupportDemo,
  SUPPRESSION:  SuppressionDemo,
  REPAIR:       RepairDemo,
};

export function AbilityDemo({ keyword }: { keyword: string }) {
  const Demo = DEMO_MAP[keyword];
  if (!Demo) return null;
  return (
    <div className="border-t border-border px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground font-medium mb-2 uppercase tracking-wide">메커니즘</p>
      <Demo />
    </div>
  );
}
