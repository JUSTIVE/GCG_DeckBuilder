import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useLocalize } from "@/lib/localize";
import { DualPlayfield, type DualBoardState, type DualAccent } from "@/components/DualPlayfield";
import { MiniCard } from "@/components/MiniCard";

// ── Board state helpers ───────────────────────────────────────────────────────

const d = (o: Partial<DualBoardState> = {}): DualBoardState => ({
  shieldCount: 6,
  ...o,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type L = { ko: string; en: string };
type TFn = (key: string) => string;

type DemoStep = {
  p1: DualBoardState;
  p2: DualBoardState;
  accent: DualAccent;
  p2Accent?: DualAccent;
  p1Label: L;
  p2Label: L;
  log: L;
};

type DemoConfig = {
  steps: DemoStep[];
  delays: number[];
  p1Battle?: (step: number, t: TFn) => React.ReactNode;
  p2Battle?: (step: number, t: TFn) => React.ReactNode;
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
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "→ 플레이어 어택 선언", en: "→ Attack player" },
        p2Label: { ko: "블로커 준비 중", en: "Blocker on standby" },
        log: {
          ko: "공격 유닛이 상대 플레이어에게 어택",
          en: "Attacker declares attack on opponent player",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "→ 블로커로 대상 변경!", en: "→ Target redirected!" },
        p2Label: { ko: "블로커 유닛 레스트 → 발동!", en: "Blocker rests → activates!" },
        log: {
          ko: "블록 스텝: 블로커 유닛 레스트 → 공격 대상을 블로커로 변경",
          en: "Block step: Blocker rests → attack target changed to Blocker",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "배틀 종료", en: "Battle end" },
        p2Label: {
          ko: "블로커가 대미지 수신 · 실드 무사!",
          en: "Blocker takes damage · Shield safe!",
        },
        log: {
          ko: "블로커가 배틀 대미지를 대신 받음 → 실드 에어리어 피해 없음",
          en: "Blocker takes battle damage instead → shield area unharmed",
        },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitAttacker")}
        ap={3}
        hp={step >= 3 ? 1 : 3}
        maxHp={3}
        color="red"
        rested={step >= 3}
        highlight={step === 1}
        attacking={step === 1 || step === 2}
        hit={step === 3}
      />
    ),
    p2Battle: (step, t) => (
      <div className="flex gap-1 items-center justify-center">
        <MiniCard
          name={t("keyword.BLOCKER")}
          ap={2}
          hp={step >= 3 ? 0 : 3}
          maxHp={3}
          color="blue"
          tag={t("keyword.BLOCKER")}
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
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "선제공격 → 먼저 대미지!", en: "First Strike → damage first!" },
        p2Label: { ko: "상대 유닛 대기", en: "Opponent unit waits" },
        log: {
          ko: "선제공격: 상대 유닛보다 먼저 배틀 대미지를 준다",
          en: "First Strike: deals battle damage before the opponent unit",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "P2 유닛 파괴!", en: "P2 unit destroyed!" },
        p2Label: { ko: "HP 0 → 파괴 → 반격 불가!", en: "HP 0 → destroyed → no counter!" },
        log: {
          ko: "P2 유닛 파괴 → 반격 단계 없음",
          en: "P2 unit destroyed → no counterattack step",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: { ko: "HP 그대로! (무손)", en: "HP intact! (no damage)" },
        p2Label: { ko: "반격 없음", en: "No counter" },
        log: {
          ko: "선제공격으로 P1 유닛은 배틀 대미지를 받지 않음",
          en: "With First Strike, P1 unit receives no battle damage",
        },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitFirstStrike")}
        ap={3}
        hp={3}
        color="red"
        tag={t("keyword.FIRST_STRIKE")}
        rested={step >= 3}
        highlight={step >= 1 && step <= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitP2")}
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
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "고기동 → 어택!", en: "High Maneuver → attack!" },
        p2Label: { ko: "블로커 유닛 대기", en: "Blocker on standby" },
        log: {
          ko: "고기동 유닛이 상대 플레이어에게 어택 선언",
          en: "High Maneuver unit declares attack on opponent player",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "블로커 무시!", en: "Blocker ignored!" },
        p2Label: { ko: "블로커 효과 받지 않음", en: "Blocker effect ignored" },
        log: {
          ko: "고기동: 상대 유닛의 블로커 효과를 받지 않는다",
          en: "High Maneuver: opponent's Blocker cannot be activated",
        },
      },
      {
        p1: d(),
        p2: d({ shieldCount: 5 }),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "플레이어 직접 대미지!", en: "Direct player damage!" },
        p2Label: { ko: "실드 1장 파괴!", en: "1 shield destroyed!" },
        log: {
          ko: "블로커가 있어도 실드 에어리어에 직접 대미지",
          en: "Deals direct damage to shield even with a Blocker present",
        },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitHighManeuver")}
        ap={3}
        hp={3}
        color="red"
        tag={t("keyword.HIGH_MANEUVER")}
        rested={step >= 3}
        highlight={step >= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step, t) => (
      <MiniCard
        name={t("keyword.BLOCKER")}
        ap={2}
        hp={3}
        color="blue"
        tag={t("keyword.BLOCKER")}
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
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "돌파 2 → 어택!", en: "Breach 2 → attack!" },
        p2Label: { ko: "상대 유닛", en: "Opponent unit" },
        log: {
          ko: "돌파 유닛이 상대 유닛에게 어택 선언",
          en: "Breach unit declares attack on opponent unit",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "배틀 대미지로 파괴!", en: "Destroyed by battle damage!" },
        p2Label: { ko: "유닛 파괴!", en: "Unit destroyed!" },
        log: {
          ko: "배틀 대미지로 상대 유닛 파괴",
          en: "Opponent unit destroyed by battle damage",
        },
      },
      {
        p1: d(),
        p2: d({ shieldCount: 5 }),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "돌파 2 발동!", en: "Breach 2 activates!" },
        p2Label: { ko: "선두 실드 1장 파괴!", en: "1 lead shield destroyed!" },
        log: {
          ko: "돌파 2: 선두 실드에 2 대미지 → 실드는 대미지량 무관하게 파괴 → 1장만 파괴",
          en: "Breach 2: deals 2 damage to lead shield → shield destroyed regardless of amount → only 1 destroyed",
        },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitBreach")}
        ap={3}
        hp={3}
        color="red"
        tag={`${t("keyword.BREACH")} 2`}
        rested={step >= 3}
        highlight={step >= 2}
        attacking={step === 1 || step === 2}
      />
    ),
    p2Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitP2")}
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

  SUPPORT: {
    delays: [800, 1900, 3100, 4400, 5500],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "원호 유닛 레스트 →", en: "Support unit rests →" },
        p2Label: { ko: "상대 유닛 대기", en: "Opponent unit waits" },
        log: {
          ko: "원호 유닛을 레스트시켜 다른 유닛을 1기 고른다",
          en: "Rest the Support unit to boost another unit",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "공격 유닛 AP +2!", en: "Attacker AP +2!" },
        p2Label: { ko: "강화 어택 대기", en: "Buffed attack incoming" },
        log: {
          ko: "이 턴 동안 선택한 유닛을 AP +2 (2 → 4)",
          en: "Target unit gains AP +2 this turn (2 → 4)",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "강화된 어택!", en: "Buffed attack!" },
        p2Label: { ko: "HP 3 → 파괴!", en: "HP 3 → destroyed!" },
        log: {
          ko: "AP 4로 HP 3 상대 유닛 파괴 — 원호 없이는 AP 2라 불가능했을 상황",
          en: "AP 4 destroys HP 3 unit — impossible without Support (AP was 2)",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: { ko: "공격 유닛 레스트", en: "Attacker rests" },
        p2Label: { ko: "", en: "" },
        log: { ko: "어택 후 공격 유닛 레스트", en: "Attacker rests after attacking" },
      },
    ],
    p1Battle: (step, t) => (
      <div className="flex gap-1 items-center justify-center">
        <MiniCard
          name={t("demo.unitSupportUnit")}
          ap={1}
          hp={2}
          color="slate"
          tag={`${t("keyword.SUPPORT")} 2`}
          dim={step === 0}
          rested={step >= 2}
          highlight={step === 1}
        />
        <MiniCard
          name={t("demo.unitAttacker")}
          ap={2}
          hp={3}
          color="red"
          apBoost={step >= 2 ? 2 : 0}
          highlight={step >= 2 && step <= 3}
          attacking={step === 3}
          rested={step >= 4}
        />
      </div>
    ),
    p2Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitP2")}
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
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대", en: "Opponent" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "제압 → 어택!", en: "Suppression → attack!" },
        p2Label: { ko: "실드 에어리어", en: "Shield area" },
        log: {
          ko: "제압 유닛이 상대 플레이어에게 어택 선언",
          en: "Suppression unit declares attack on opponent player",
        },
      },
      {
        p1: d(),
        p2: d({ shieldCount: 4 }),
        accent: null,
        p2Accent: "shield",
        p1Label: { ko: "실드 2장 동시 파괴!", en: "2 shields destroyed at once!" },
        p2Label: { ko: "선두 2장 동시 파괴!", en: "Lead 2 shields destroyed!" },
        log: {
          ko: "제압: 공격으로 실드에 주는 대미지를 선두부터 2개에 동시에 부여",
          en: "Suppression: attack damage is dealt simultaneously to the first 2 shields",
        },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitSuppression")}
        ap={2}
        hp={3}
        color="purple"
        tag={t("keyword.SUPPRESSION")}
        rested={step >= 2}
        highlight={step >= 1}
        attacking={step === 1}
      />
    ),
    p2Battle: () => null,
  },

  REPAIR: {
    delays: [800, 1900, 3000, 4200],
    steps: [
      {
        p1: d(),
        p2: d(),
        accent: null,
        p1Label: { ko: "나", en: "Me" },
        p2Label: { ko: "상대 (2/2 유닛)", en: "Opp. (2/2 unit)" },
        log: { ko: "", en: "" },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "전투 후 HP -2", en: "After battle HP -2" },
        p2Label: { ko: "상대 유닛 파괴!", en: "Opponent unit destroyed!" },
        log: {
          ko: "배틀 대미지 처리 — 리페어 유닛 HP 3→1, 상대 유닛 파괴",
          en: "Battle damage — Repair unit HP 3→1, opponent unit destroyed",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "턴 종료 → 리페어 2 발동", en: "End of turn → Repair 2 activates" },
        p2Label: { ko: "", en: "" },
        log: {
          ko: "리페어 X: 자신의 턴 종료 시 X만큼 HP를 회복한다",
          en: "Repair X: recover X HP at the end of your turn",
        },
      },
      {
        p1: d(),
        p2: d(),
        accent: "battle",
        p1Label: { ko: "HP +2 회복 완료!", en: "HP +2 fully recovered!" },
        p2Label: { ko: "", en: "" },
        log: { ko: "유닛 HP 1→3 회복", en: "Unit HP 1→3 recovered" },
      },
    ],
    p1Battle: (step, t) => (
      <MiniCard
        name={t("demo.unitRepair")}
        ap={2}
        hp={step >= 3 ? 3 : step >= 1 ? 1 : 3}
        maxHp={3}
        color="green"
        tag={`${t("keyword.REPAIR")} 2`}
        rested={step >= 2}
        attacking={step === 1}
        highlight={step >= 2}
        hit={step === 1}
      />
    ),
    p2Battle: (step, t) =>
      step <= 2 ? (
        <MiniCard
          name={t("demo.unitOpponent")}
          ap={2}
          hp={step >= 1 ? 0 : 2}
          maxHp={2}
          color="red"
          destroyed={step >= 2}
          attackDir={1}
        />
      ) : null,
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
  }, [ref]);
  useEffect(() => {
    if (animKey === 0) return;
    setStep(0);
    const timers = delays.map((delay, i) => setTimeout(() => setStep(i + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, [animKey]);
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
  const { t } = useTranslation("game");
  const localize = useLocalize();
  const [step, replay] = useStepAnim(config.delays, ref, () => onPlayingChange?.(true));
  const { steps } = config;
  const cur = steps[Math.min(step, steps.length - 1)];
  const done = step >= steps.length;
  const logClass = "bg-gray-900 text-white";
  const logText = localize(cur.log);

  useEffect(() => {
    if (step === 0) onPlayingChange?.(false);
  }, [step]);
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
          p1Label={localize(cur.p1Label)}
          p2Label={localize(cur.p2Label)}
          p1Battle={config.p1Battle?.(step, t)}
          p2Battle={config.p2Battle?.(step, t)}
        />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all duration-300 min-h-[22px]",
              logText ? logClass : "opacity-0",
            )}
          >
            {logText || " "}
          </span>
          {done && (
            <button
              type="button"
              onClick={replay}
              className="text-[9px] px-2 py-1 rounded border border-border hover:bg-muted/50 text-muted-foreground shrink-0 transition-colors"
            >
              ↺ {t("demo.replay")}
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
  const { t } = useTranslation("game");
  const config = DEMOS[keyword];
  if (!config) return null;
  return (
    <div className="border-t border-border px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground font-medium mb-2 uppercase tracking-wide">
        {t("demo.mechanism")}
      </p>
      <DemoPlayer config={config} onPlayingChange={onPlayingChange} />
    </div>
  );
}
