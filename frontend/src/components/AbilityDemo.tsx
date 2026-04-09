import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import {
  DualPlayfield,
  type DualBoardState,
  type DualAccent,
} from "@/components/DualPlayfield";

// ── MiniCard ──────────────────────────────────────────────────────────────────
// 실제 카드 비율(800:1117 ≈ 36×50px) 모방. Relay 불필요.

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
type CardColor = keyof typeof CARD_THEME;

function MiniCard({
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
                transform: `translateY(${attacking ? attackDir * 22 : 0}px)`,
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
              highlight && "ring-2 ring-offset-1 ring-primary shadow-md",
              dim && "opacity-25",
            )}
            style={{
              width: 48,
              height: 67,
              transform: rested ? "rotate(90deg)" : "rotate(0deg)",
              transition:
                "transform 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 400ms, box-shadow 300ms",
            }}
          >
            <div className={cn("h-4 shrink-0", c.head)} />
            <div className="flex-1 flex items-center justify-center px-0.5">
              <span
                className={cn(
                  "text-[8px] font-bold text-center leading-tight break-keep",
                  c.stat,
                )}
              >
                {name}
              </span>
            </div>
            {tag && (
              <div className="text-center pb-0.5 px-0.5">
                <span className="text-[7px] bg-black/10 rounded-sm px-0.5 font-bold leading-none text-inherit">
                  {tag}
                </span>
              </div>
            )}
            {(ap !== undefined || hp !== undefined) && (
              <div className="flex justify-between items-end px-1 pb-1 shrink-0">
                {ap !== undefined && (
                  <span
                    className={cn(
                      "font-black leading-none transition-all duration-300",
                      apBoost > 0
                        ? "text-[13px] text-red-700"
                        : `text-[11px] ${c.stat}`,
                    )}
                  >
                    <NumberFlow value={ap + apBoost} />
                  </span>
                )}
                {hp !== undefined && (
                  <span
                    className={cn(
                      "text-[11px] font-black leading-none transition-colors duration-300",
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

// ── Board state helpers ───────────────────────────────────────────────────────

const d = (o: Partial<DualBoardState> = {}): DualBoardState => ({
  shieldCount: 6,
  ...o,
});

// ── Step type ─────────────────────────────────────────────────────────────────

type DemoStep = {
  p1: DualBoardState;
  p2: DualBoardState;
  accent: DualAccent;
  p2Accent?: DualAccent;
  p1Label: string;
  p2Label: string;
  log: string;
};

type DemoConfig = {
  steps: DemoStep[];
  delays: number[];
  p1Battle?: (step: number) => React.ReactNode;
  p2Battle?: (step: number) => React.ReactNode;
};

// ── Demo definitions ──────────────────────────────────────────────────────────

const DEMOS: Partial<Record<string, DemoConfig>> = {
  BLOCKER: {
    delays: [800, 1900, 3100, 4400],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: "→ 플레이어 어택 선언",
        p2Label: "블로커 준비 중",
        log: "공격 유닛이 상대 플레이어에게 어택",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "→ 블로커로 대상 변경!",
        p2Label: "블로커 유닛 레스트 → 발동!",
        log: "블록 스텝: 블로커 유닛 레스트 → 공격 대상을 블로커로 변경",
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: "배틀 종료",
        p2Label: "블로커가 대미지 수신 · 실드 무사!",
        log: "블로커가 배틀 대미지를 대신 받음 → 실드 에어리어 피해 없음",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="공격 유닛"
        ap={3}
        hp={3}
        color="red"
        rested={step >= 1}
        highlight={step === 1}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step) => (
      <div className="flex gap-1 items-center justify-center">
        <MiniCard
          name="블로커"
          ap={2}
          hp={step >= 3 ? 0 : 3}
          maxHp={3}
          color="blue"
          tag="블로커"
          dim={step === 0}
          rested={step >= 2}
          highlight={step === 2}
          hit={step === 3}
          destroyed={step >= 3}
          attackDir={1}
        />
      </div>
    ),
  },

  FIRST_STRIKE: {
    delays: [800, 1900, 3100, 4400],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "선제공격 → 먼저 대미지!",
        p2Label: "상대 유닛 대기",
        log: "선제공격: 상대 유닛보다 먼저 배틀 대미지를 준다",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "P2 유닛 파괴!",
        p2Label: "HP 0 → 파괴 → 반격 불가!",
        log: "P2 유닛 파괴 → 반격 단계 없음",
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "HP 그대로! (무손)",
        p2Label: "반격 없음",
        log: "선제공격으로 P1 유닛은 배틀 대미지를 받지 않음",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="선제 유닛"
        ap={3}
        hp={3}
        color="red"
        tag="선제공격"
        rested={step >= 1}
        highlight={step >= 1 && step <= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step) => (
      <MiniCard
        name="P2 유닛"
        ap={2}
        hp={step >= 2 ? 0 : 2}
        maxHp={2}
        color="blue"
        rested={true}
        highlight={step === 2}
        hit={step === 2}
        destroyed={step >= 2}
        attackDir={1}
      />
    ),
  },

  HIGH_MANEUVER: {
    delays: [800, 1900, 3100, 4300],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: "고기동 → 어택!",
        p2Label: "블로커 유닛 대기",
        log: "고기동 유닛이 상대 플레이어에게 어택 선언",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "블로커 무시!",
        p2Label: "블로커 효과 받지 않음",
        log: "고기동: 상대 유닛의 블로커 효과를 받지 않는다",
      },
      {
        p1: d(),
        p2: d({ shieldCount: 5 }),
        accent: null,
        p2Accent: "shield",
        p1Label: "플레이어 직접 대미지!",
        p2Label: "실드 1장 파괴!",
        log: "블로커가 있어도 실드 에어리어에 직접 대미지",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="고기동 유닛"
        ap={3}
        hp={3}
        color="red"
        tag="고기동"
        rested={step >= 1}
        highlight={step >= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step) => (
      <MiniCard
        name="블로커"
        ap={2}
        hp={3}
        color="blue"
        tag="블로커"
        dim={step === 0}
        highlight={step === 1}
      />
    ),
  },

  BREACH: {
    delays: [800, 1900, 3100, 4400],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "돌파 2 → 어택!",
        p2Label: "상대 유닛",
        log: "돌파 유닛이 상대 유닛에게 어택 선언",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "배틀 대미지로 파괴!",
        p2Label: "유닛 파괴!",
        log: "배틀 대미지로 상대 유닛 파괴",
      },
      {
        p1: d(),
        p2: d({ shieldCount: 5 }),
        accent: null,
        p2Accent: "shield",
        p1Label: "돌파 2 발동!",
        p2Label: "선두 실드 1장 파괴!",
        log: "돌파 2: 선두 실드에 2 대미지 → 실드는 대미지량 무관하게 파괴 → 1장만 파괴",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="돌파 유닛"
        ap={3}
        hp={3}
        color="red"
        tag="돌파 2"
        rested={step >= 1}
        highlight={step >= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step) => (
      <MiniCard
        name="P2 유닛"
        ap={2}
        hp={step >= 2 ? 0 : 2}
        maxHp={2}
        color="blue"
        rested={step >= 1}
        highlight={step === 2}
        hit={step === 2}
        destroyed={step >= 2}
        attackDir={1}
      />
    ),
  },

  SUPPORT: {
    delays: [800, 1900, 3100, 4400],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "원호 유닛 레스트 →",
        p2Label: "상대 유닛 대기",
        log: "원호 유닛을 레스트시켜 다른 유닛을 1기 고른다",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "공격 유닛 AP +2!",
        p2Label: "강화 어택 대기",
        log: "이 턴 동안 선택한 유닛을 AP +2 (2 → 4)",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "강화된 어택!",
        p2Label: "HP 3 → 파괴!",
        log: "AP 4로 HP 3 상대 유닛 파괴 — 원호 없이는 AP 2라 불가능했을 상황",
      },
    ],
    p1Battle: (step) => (
      <div className="flex gap-1 items-center justify-center">
        <MiniCard
          name="원호 유닛"
          ap={1}
          hp={2}
          color="slate"
          tag="원호 2"
          dim={step === 0}
          rested={step >= 2}
          highlight={step === 1}
        />
        <MiniCard
          name="공격 유닛"
          ap={2}
          hp={3}
          color="red"
          apBoost={step >= 2 ? 2 : 0}
          highlight={step >= 2}
          rested={step >= 3}
          attacking={step === 3}
        />
      </div>
    ),
    p2Battle: (step) => (
      <MiniCard
        name="P2 유닛"
        ap={2}
        hp={step >= 3 ? 0 : 3}
        maxHp={3}
        color="blue"
        dim={step === 0}
        rested={true}
        highlight={step === 3}
        hit={step === 3}
        destroyed={step >= 3}
        attackDir={1}
      />
    ),
  },

  SUPPRESSION: {
    delays: [800, 1900, 3200],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: "제압 → 어택!",
        p2Label: "실드 에어리어",
        log: "제압 유닛이 상대 플레이어에게 어택 선언",
      },
      {
        p1: d(),
        p2: d({ shieldCount: 4 }),
        accent: null,
        p2Accent: "shield",
        p1Label: "실드 2장 동시 파괴!",
        p2Label: "선두 2장 동시 파괴!",
        log: "제압: 공격으로 실드에 주는 대미지를 선두부터 2개에 동시에 부여",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="제압 유닛"
        ap={2}
        hp={3}
        color="purple"
        tag="제압"
        rested={step >= 1}
        highlight={step >= 1}
        attacking={step === 1}
      />
    ),
    p2Battle: () => null,
  },

  REPAIR: {
    delays: [800, 1900, 3200],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: "나 (HP 피해 상태)",
        p2Label: "상대",
        log: "",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "턴 종료 → 리페어 2 발동",
        p2Label: "상대",
        log: "리페어 X: 자신의 턴 종료 시 X만큼 HP를 회복한다",
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: "HP +2 회복 완료!",
        p2Label: "상대",
        log: "유닛 HP 회복",
      },
    ],
    p1Battle: (step) => (
      <MiniCard
        name="리페어 유닛"
        ap={2}
        hp={step >= 2 ? 3 : 1}
        maxHp={3}
        color="green"
        tag="리페어 2"
        highlight={step >= 1}
      />
    ),
    p2Battle: () => null,
  },
};

// ── Step animation hook ───────────────────────────────────────────────────────
// 화면 중앙(rootMargin -35%)에 진입하면 재생 시작, 벗어나면 리셋.

function useStepAnim(
  delays: number[],
  ref: React.RefObject<HTMLElement | null>,
  onEnter: () => void,
): [number, () => void] {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onEnter();
          setAnimKey((k) => k + 1);
        } else {
          setStep(0);
        }
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (animKey === 0) return;
    setStep(0);
    const timers = delays.map((delay, i) =>
      setTimeout(() => setStep(i + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const replay = () => setAnimKey((k) => k + 1);
  return [step, replay];
}

// ── DemoPlayer ────────────────────────────────────────────────────────────────

function DemoPlayer({
  config,
  onPlayingChange,
}: {
  config: DemoConfig;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, replay] = useStepAnim(config.delays, ref, () =>
    onPlayingChange?.(true),
  );
  const { steps } = config;
  const cur = steps[Math.min(step, steps.length - 1)];
  const done = step >= steps.length;
  const logClass = "bg-gray-900 text-white";

  useEffect(() => {
    if (step === 0) onPlayingChange?.(false);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        @keyframes card-appear {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0px);  opacity: 1; }
        }
        @keyframes card-hit {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-5px) rotate(-4deg); }
          45%  { transform: translateX(5px) rotate(3deg); }
          70%  { transform: translateX(-3px) rotate(-2deg); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div ref={ref} className="flex flex-col gap-2">
        <DualPlayfield
          p1={cur.p1}
          p2={cur.p2}
          accent={cur.accent}
          p2Accent={cur.p2Accent}
          p1Label={cur.p1Label}
          p2Label={cur.p2Label}
          p1Battle={config.p1Battle?.(step)}
          p2Battle={config.p2Battle?.(step)}
        />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all duration-300 min-h-[22px]",
              cur.log ? logClass : "opacity-0",
            )}
          >
            {cur.log || " "}
          </span>
          {done && (
            <button
              type="button"
              onClick={replay}
              className="text-[9px] px-2 py-1 rounded border border-border hover:bg-muted/50 text-muted-foreground shrink-0 transition-colors"
            >
              ↺ 다시 보기
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── AbilityDemo export ────────────────────────────────────────────────────────

export function AbilityDemo({
  keyword,
  onPlayingChange,
}: {
  keyword: string;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const config = DEMOS[keyword];
  if (!config) return null;
  return (
    <div className="border-t border-border px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground font-medium mb-2 uppercase tracking-wide">
        메커니즘
      </p>
      <DemoPlayer config={config} onPlayingChange={onPlayingChange} />
    </div>
  );
}
