import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";
import { graphql } from "relay-runtime";
import { usePreloadedQuery, readInlineData } from "react-relay";
import type { PreloadedQuery } from "react-relay";
import type { RulesPageQuery as RulesPageQueryType } from "@/__generated__/RulesPageQuery.graphql";
import type { CardPreview_card$key } from "@/__generated__/CardPreview_card.graphql";
import type { RulesPage_SetupMiniCard$key } from "@/__generated__/RulesPage_SetupMiniCard.graphql";
import { CardPreview } from "@/components/CardPreview";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { Route } from "@/routes/$locale/rules";
import { type ZoneId } from "@/components/PlayfieldLayout";
import { MiniPlayfield } from "@/components/MiniPlayfield";
import { UnitBattleSimulator } from "@/components/UnitBattleSimulator";
import {
  type SetupBoardState,
  type SetupHandImages,
  type MulliganPhase,
  type DrawPhase,
  type OrderPhase,
  type SetupHighlight,
  HL,
  SetupDualPlayfield,
} from "@/components/SetupDualPlayfield";
import { triggerClass, TRIGGER_FALLBACK } from "@/components/CardDescription";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

// ── badge helpers ─────────────────────────────────────────────────────────────

const TRIGGER_LIGHT = "bg-gray-100 text-gray-700";

function TBadge({ name }: { name: string }) {
  const cls = triggerClass(name);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
        cls === TRIGGER_FALLBACK ? TRIGGER_LIGHT : cls,
      )}
    >
      {name}
    </span>
  );
}

// ── layout helpers ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <span className="font-semibold text-sm flex-1">{title}</span>
        <ChevronRightIcon
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-3 py-3 sm:px-4 sm:py-4 flex flex-col gap-3 sm:gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground leading-relaxed">
      {children}
    </div>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────

type Phase = {
  label: string;
  color: string;
  headColor: string;
  dotColor: string;
  highlights: ZoneId[];
  steps: { name: string; desc: string }[];
  note?: string;
};

function getPhases(t: TFunction<"rules">): Phase[] {
  return [
    {
      label: t("phases.start.label"),
      color: "bg-blue-50 border-blue-200",
      headColor: "text-blue-700",
      dotColor: "bg-blue-500",
      highlights: ["battle", "resource", "base", "shield"],
      steps: [
        {
          name: t("phases.start.steps.active.name"),
          desc: t("phases.start.steps.active.desc"),
        },
        {
          name: t("phases.start.steps.start.name"),
          desc: t("phases.start.steps.start.desc"),
        },
      ],
    },
    {
      label: t("phases.draw.label"),
      color: "bg-green-50 border-green-200",
      headColor: "text-green-700",
      dotColor: "bg-green-500",
      highlights: ["deck", "hand"],
      steps: [
        {
          name: t("phases.draw.steps.draw.name"),
          desc: t("phases.draw.steps.draw.desc"),
        },
      ],
    },
    {
      label: t("phases.resource.label"),
      color: "bg-yellow-50 border-yellow-200",
      headColor: "text-yellow-700",
      dotColor: "bg-yellow-500",
      highlights: ["resourceDeck", "resource"],
      steps: [
        {
          name: t("phases.resource.steps.add.name"),
          desc: t("phases.resource.steps.add.desc"),
        },
      ],
    },
    {
      label: t("phases.main.label"),
      color: "bg-orange-50 border-orange-200",
      headColor: "text-orange-700",
      dotColor: "bg-orange-500",
      highlights: ["battle", "resource", "hand"],
      steps: [
        {
          name: t("phases.main.steps.play.name"),
          desc: t("phases.main.steps.play.desc"),
        },
        {
          name: t("phases.main.steps.activate.name"),
          desc: t("phases.main.steps.activate.desc"),
        },
        {
          name: t("phases.main.steps.attack.name"),
          desc: t("phases.main.steps.attack.desc"),
        },
      ],
      note: t("phases.main.note"),
    },
    {
      label: t("phases.end.label"),
      color: "bg-purple-50 border-purple-200",
      headColor: "text-purple-700",
      dotColor: "bg-purple-500",
      highlights: ["hand", "trash"],
      steps: [
        {
          name: t("phases.end.steps.action.name"),
          desc: t("phases.end.steps.action.desc"),
        },
        {
          name: t("phases.end.steps.end.name"),
          desc: t("phases.end.steps.end.desc"),
        },
        {
          name: t("phases.end.steps.hand.name"),
          desc: t("phases.end.steps.hand.desc"),
        },
        {
          name: t("phases.end.steps.cleanup.name"),
          desc: t("phases.end.steps.cleanup.desc"),
        },
      ],
    },
  ];
}

function getBattleSteps(t: TFunction<"rules">) {
  return [
    {
      name: t("battleSteps.attack.name"),
      desc: t("battleSteps.attack.desc"),
    },
    {
      name: t("battleSteps.block.name"),
      desc: t("battleSteps.block.desc"),
    },
    {
      name: t("battleSteps.action.name"),
      desc: t("battleSteps.action.desc"),
    },
    {
      name: t("battleSteps.damage.name"),
      desc: t("battleSteps.damage.desc"),
    },
    {
      name: t("battleSteps.battleEnd.name"),
      desc: t("battleSteps.battleEnd.desc"),
    },
  ];
}

// ── interactive: game setup walkthrough ──────────────────────────────────────

const EMPTY_BOARD: SetupBoardState = {
  hasDeck: false,
  hasResDeck: false,
  handCount: 0,
  shieldCount: 0,
  hasBase: false,
  hasExRes: false,
};

type SetupStep = {
  title: string;
  desc: string;
  note?: string;
  highlight: SetupHighlight;
  p1: SetupBoardState;
  p2: SetupBoardState;
  p1Label?: string;
  p2Label?: string;
};

function getSetupSteps(t: TFunction<"rules">): SetupStep[] {
  return [
    {
      title: t("setup.steps.deck.title"),
      desc: t("setup.steps.deck.desc"),
      highlight: "deck",
      p1: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true },
      p2: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true },
    },
    {
      title: t("setup.steps.order.title"),
      desc: t("setup.steps.order.desc"),
      highlight: "order",
      p1: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true },
      p2: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true },
      p1Label: t("setup.steps.order.p1Label"),
      p2Label: t("setup.steps.order.p2Label"),
    },
    {
      title: t("setup.steps.firstHand.title"),
      desc: t("setup.steps.firstHand.desc"),
      highlight: "hand",
      p1: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5 },
      p2: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5 },
      p1Label: t("setup.steps.firstHand.p1Label"),
      p2Label: t("setup.steps.firstHand.p2Label"),
    },
    {
      title: t("setup.steps.mulligan.title"),
      desc: t("setup.steps.mulligan.desc"),
      note: t("setup.steps.mulligan.note"),
      highlight: "mulligan",
      p1: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5 },
      p2: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5 },
      p1Label: t("setup.steps.mulligan.p1Label"),
      p2Label: t("setup.steps.mulligan.p2Label"),
    },
    {
      title: t("setup.steps.shield.title"),
      desc: t("setup.steps.shield.desc"),
      note: t("setup.steps.shield.note"),
      highlight: "shield",
      p1: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5, shieldCount: 6 },
      p2: { ...EMPTY_BOARD, hasDeck: true, hasResDeck: true, handCount: 5, shieldCount: 6 },
      p1Label: t("setup.steps.shield.p1Label"),
      p2Label: t("setup.steps.shield.p2Label"),
    },
    {
      title: t("setup.steps.base.title"),
      desc: t("setup.steps.base.desc"),
      highlight: "base",
      p1: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
      },
      p2: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
      },
      p1Label: t("setup.steps.base.p1Label"),
      p2Label: t("setup.steps.base.p2Label"),
    },
    {
      title: t("setup.steps.exres.title"),
      desc: t("setup.steps.exres.desc"),
      note: t("setup.steps.exres.note"),
      highlight: "exres",
      p1: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
        hasExRes: false,
      },
      p2: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
        hasExRes: true,
      },
      p1Label: t("setup.steps.exres.p1Label"),
      p2Label: t("setup.steps.exres.p2Label"),
    },
    {
      title: t("setup.steps.start.title"),
      desc: t("setup.steps.start.desc"),
      highlight: "start",
      p1: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
      },
      p2: {
        ...EMPTY_BOARD,
        hasDeck: true,
        hasResDeck: true,
        handCount: 5,
        shieldCount: 6,
        hasBase: true,
        hasExRes: true,
      },
      p1Label: t("setup.steps.start.p1Label"),
      p2Label: t("setup.steps.start.p2Label"),
    },
  ];
}

// ── setup mini card ───────────────────────────────────────────────────────────

const SetupMiniCardFragment = graphql`
  fragment RulesPage_SetupMiniCard on Card @inline {
    ... on UnitCard {
      imageUrl
    }
    ... on PilotCard {
      imageUrl
    }
    ... on BaseCard {
      imageUrl
    }
    ... on CommandCard {
      imageUrl
    }
  }
`;

function extractSetupCardUrl(ref: RulesPage_SetupMiniCard$key | null | undefined): string | null {
  if (!ref) return null;
  const data = readInlineData(SetupMiniCardFragment, ref);
  return (data as { imageUrl?: string }).imageUrl ?? null;
}

const MULLIGAN_STEP_INDEX = 3;
const HAND_STEP_INDEX = 2;
const ORDER_STEP_INDEX = 1;

function GameSetupWalkthrough({
  p1HandImages,
  p2HandImages,
  newP1HandImages,
  newP2HandImages,
  setupSteps,
  t,
}: {
  p1HandImages?: SetupHandImages;
  p2HandImages?: SetupHandImages;
  newP1HandImages?: SetupHandImages;
  newP2HandImages?: SetupHandImages;
  setupSteps: SetupStep[];
  t: TFunction<"rules">;
}) {
  const [step, setStep] = useState(0);
  const [mulliganPhase, setMulliganPhase] = useState<MulliganPhase>("idle");
  const [drawPhase, setDrawPhase] = useState<DrawPhase>("done");
  const [orderPhase, setOrderPhase] = useState<OrderPhase>("idle");
  const [replayKey, setReplayKey] = useState(0);
  const cur = setupSteps[step];
  const hlColor = HL[cur.highlight];

  useEffect(() => {
    if (step !== MULLIGAN_STEP_INDEX) {
      setMulliganPhase("idle");
      return;
    }
    setMulliganPhase("idle");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    at(() => setMulliganPhase("returning"), 400);
    at(() => setMulliganPhase("shuffling"), 1200);
    at(() => setMulliganPhase("drawing"), 2200);
    at(() => setMulliganPhase("done"), 3200);
    return () => timers.forEach(clearTimeout);
  }, [step, replayKey]);

  useEffect(() => {
    if (step !== HAND_STEP_INDEX) {
      setDrawPhase("done");
      return;
    }
    setDrawPhase("initial");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    at(() => setDrawPhase("drawing"), 80);
    at(() => setDrawPhase("done"), 700);
    return () => timers.forEach(clearTimeout);
  }, [step]);

  useEffect(() => {
    if (step !== ORDER_STEP_INDEX) {
      setOrderPhase("idle");
      return;
    }
    setOrderPhase("idle");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    at(() => setOrderPhase("p1"), 400);
    at(() => setOrderPhase("both"), 950);
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const inMulligan = step === MULLIGAN_STEP_INDEX;
  const showNewImages = mulliganPhase === "drawing" || mulliganPhase === "done";
  const activeP1Images = showNewImages ? newP1HandImages : p1HandImages;
  const activeP2Images = showNewImages ? newP2HandImages : p2HandImages;

  return (
    <>
      <style>{`
        @keyframes deck-shuffle {
          0%   { transform: translateY(0) rotate(0deg); }
          20%  { transform: translateY(-4px) rotate(-5deg); }
          40%  { transform: translateY(-4px) rotate(5deg); }
          60%  { transform: translateY(-2px) rotate(-3deg); }
          80%  { transform: translateY(-1px) rotate(2deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
      `}</style>
      <div className="flex flex-col gap-3">
        {/* Step pills */}
        <div className="flex gap-1 flex-wrap">
          {setupSteps.map((_s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "w-6 h-6 rounded-full text-xs font-bold transition-all duration-200 border",
                i === step
                  ? cn(hlColor.bg, hlColor.text, "border-transparent scale-110 shadow")
                  : i < step
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-background text-muted-foreground border-dashed border-muted-foreground/30",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Step detail */}
        <div className={cn("rounded-lg border-2 p-3 transition-all duration-300", hlColor.border)}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                hlColor.bg,
                hlColor.text,
              )}
            >
              {step + 1}
            </span>
            <p className="text-sm font-bold">{cur.title}</p>
            <span className="text-xs text-muted-foreground ml-auto">
              {step + 1} / {setupSteps.length}
            </span>
          </div>
          <p className="text-xs leading-relaxed">{cur.desc}</p>
          {cur.note && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mt-1.5">
              {cur.note}
            </p>
          )}
        </div>

        {/* Dual playfield — play-sheet proportions, players facing each other */}
        <SetupDualPlayfield
          p1={cur.p1}
          p2={cur.p2}
          hl={cur.highlight}
          p1Label={cur.p1Label ?? t("setup.player1Default")}
          p2Label={cur.p2Label ?? t("setup.player2Default")}
          p1HandImages={activeP1Images}
          p2HandImages={activeP2Images}
          mulliganPhase={inMulligan ? mulliganPhase : undefined}
          drawPhase={step === HAND_STEP_INDEX ? drawPhase : undefined}
          orderPhase={step === ORDER_STEP_INDEX ? orderPhase : undefined}
        />

        {/* Mulligan replay button */}
        {inMulligan && (
          <button
            type="button"
            onClick={() => {
              setMulliganPhase("idle");
              setReplayKey((k) => k + 1);
            }}
            className="self-center text-[10px] px-2.5 py-1 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
          >
            {t("setup.mulliganReplay")}
          </button>
        )}

        {/* Nav */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeftIcon className="size-3" />
            {t("nav.prev")}
          </button>
          <div className="flex-1 flex justify-center gap-1">
            {setupSteps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === step
                    ? "w-3 h-2 bg-foreground"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep((v) => Math.min(setupSteps.length - 1, v + 1))}
            disabled={step === setupSteps.length - 1}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {t("nav.next")}
            <ChevronRightIcon className="size-3" />
          </button>
        </div>
      </div>
    </>
  );
}

// ── interactive: turn phase walkthrough ──────────────────────────────────────

function TurnPhaseWalkthrough({ phases, t }: { phases: Phase[]; t: TFunction<"rules"> }) {
  const [active, setActive] = useState(0);
  const phase = phases[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Phase pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {phases.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium",
              i === active
                ? cn(p.color, p.headColor, "shadow-sm scale-105")
                : "border-border text-muted-foreground hover:bg-muted/30",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Phase detail panel (full width) */}
      <div className={cn("rounded-lg border-2 p-3 transition-all duration-300", phase.color)}>
        <div className="flex items-center justify-between mb-2">
          <p className={cn("text-sm font-bold", phase.headColor)}>{phase.label}</p>
          <span className={cn("text-xs font-medium opacity-60", phase.headColor)}>
            {active + 1} / {phases.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {phase.steps.map((step, i) => (
            <div key={step.name} className="flex gap-2 text-xs bg-white/60 rounded-md p-2">
              <span
                className={cn(
                  "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
                  phase.dotColor,
                )}
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-semibold leading-none">{step.name}</p>
                <p className="text-xs opacity-75 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {phase.note && (
          <p className="text-xs mt-2 opacity-60 border-t border-current/20 pt-2">{phase.note}</p>
        )}
      </div>

      {/* Mini playfield — full width below phase detail */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground font-medium">{t("zones.relatedArea")}</p>
        <MiniPlayfield highlights={phase.highlights} />
        {phase.highlights.includes("hand") && (
          <div className="text-xs text-center rounded border border-orange-400/50 bg-orange-400/10 text-orange-600 font-bold px-2 py-1 transition-all">
            {t("zones.handLabel")}
          </div>
        )}
      </div>

      {/* Prev / dot indicators / Next */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActive((v) => Math.max(0, v - 1))}
          disabled={active === 0}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeftIcon className="size-3" />
          {t("nav.prev")}
        </button>
        <div className="flex-1 flex justify-center gap-1.5">
          {phases.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full transition-all duration-200",
                i === active
                  ? "w-3 h-2 bg-foreground"
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActive((v) => Math.min(phases.length - 1, v + 1))}
          disabled={active === phases.length - 1}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {t("nav.next")}
          <ChevronRightIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ── interactive: battle steps walkthrough ────────────────────────────────────

function BattleStepsWalkthrough({
  battleSteps,
}: {
  battleSteps: { name: string; desc: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {battleSteps.map((step, i) => {
        const isActive = active === i;
        return (
          <button
            key={step.name}
            type="button"
            onClick={() => setActive(isActive ? null : i)}
            className={cn(
              "flex gap-3 text-xs text-left rounded-md px-2 -mx-2 transition-all duration-200",
              isActive ? "bg-orange-500/8" : "hover:bg-muted/30",
            )}
          >
            <div className="shrink-0 flex flex-col items-center">
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 mt-2.5",
                  isActive ? "bg-orange-500 text-white scale-110" : "bg-muted",
                )}
              >
                {i + 1}
              </span>
              {i < battleSteps.length - 1 && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-3 my-0.5 transition-colors duration-200",
                    isActive ? "bg-orange-400/30" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 py-2.5">
              <p
                className={cn(
                  "font-semibold transition-colors duration-200",
                  isActive ? "text-orange-600" : "",
                )}
              >
                {step.name}
              </p>
              <p
                className={cn(
                  "text-muted-foreground leading-relaxed transition-all duration-200 mt-0.5",
                  isActive ? "opacity-100" : "opacity-60 line-clamp-1",
                )}
              >
                {step.desc}
              </p>
            </div>
            <ChevronRightIcon
              className={cn(
                "size-3 text-muted-foreground shrink-0 mt-3 transition-transform duration-200",
                isActive && "rotate-90",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── zone section (interactive playfield highlight) ───────────────────────────

type ZoneEntry = {
  name: string;
  num: string;
  type: "공개" | "비공개" | "혼합";
  desc: string;
  ids: ZoneId[];
};

function getZones(t: TFunction<"rules">): ZoneEntry[] {
  return [
    {
      name: t("zones.items.deck.name"),
      num: t("zones.items.deck.num"),
      type: "비공개",
      desc: t("zones.items.deck.desc"),
      ids: ["deck"] as ZoneId[],
    },
    {
      name: t("zones.items.resourceDeck.name"),
      num: t("zones.items.resourceDeck.num"),
      type: "비공개",
      desc: t("zones.items.resourceDeck.desc"),
      ids: ["resourceDeck"] as ZoneId[],
    },
    {
      name: t("zones.items.shield.name"),
      num: t("zones.items.shield.num"),
      type: "혼합",
      desc: t("zones.items.shield.desc"),
      ids: ["base", "shield"] as ZoneId[],
    },
    {
      name: t("zones.items.resource.name"),
      num: t("zones.items.resource.num"),
      type: "공개",
      desc: t("zones.items.resource.desc"),
      ids: ["resource"] as ZoneId[],
    },
    {
      name: t("zones.items.battle.name"),
      num: t("zones.items.battle.num"),
      type: "공개",
      desc: t("zones.items.battle.desc"),
      ids: ["battle"] as ZoneId[],
    },
    {
      name: t("zones.items.hand.name"),
      num: t("zones.items.hand.num"),
      type: "비공개",
      desc: t("zones.items.hand.desc"),
      ids: ["hand"] as ZoneId[],
    },
    {
      name: t("zones.items.trash.name"),
      num: t("zones.items.trash.num"),
      type: "공개",
      desc: t("zones.items.trash.desc"),
      ids: ["trash"] as ZoneId[],
    },
    {
      name: t("zones.items.exclude.name"),
      num: t("zones.items.exclude.num"),
      type: "공개",
      desc: t("zones.items.exclude.desc"),
      ids: [] as ZoneId[],
    },
  ];
}

function ZoneSection({ t }: { t: TFunction<"rules"> }) {
  const zones = getZones(t);
  const handZoneName = t("zones.items.hand.name");
  const [selected, setSelected] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.name === selected);
  const highlights: ZoneId[] = selectedZone?.ids ?? [];

  return (
    <Section title={t("sections.zones.title")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {zones.map((z) => {
          const isSelected = selected === z.name;
          return (
            <button
              key={z.name}
              type="button"
              onClick={() => setSelected(isSelected ? null : z.name)}
              className={cn(
                "rounded border p-2 text-left transition-all duration-200",
                isSelected
                  ? "border-orange-400 bg-orange-500/8 shadow-sm"
                  : "border-border hover:bg-muted/40 hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={cn("font-semibold transition-colors", isSelected && "text-orange-600")}
                >
                  {z.name}
                </span>
                {z.num !== "—" && (
                  <span className="text-[11px] text-muted-foreground font-mono">{z.num}</span>
                )}
                <span
                  className={cn(
                    "text-[11px] px-1 rounded ml-auto",
                    z.type === "공개"
                      ? "bg-green-100 text-green-700"
                      : z.type === "비공개"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-yellow-100 text-yellow-700",
                  )}
                >
                  {t(`zones.typeLabels.${z.type}`)}
                </span>
              </div>
              <p
                className={cn(
                  "text-muted-foreground leading-relaxed",
                  isSelected && "text-foreground/70",
                )}
              >
                {z.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Interactive mini playfield */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">
          {selected
            ? selectedZone?.ids.length === 0
              ? t("zones.outsideBoard", { name: selected })
              : selected === handZoneName
                ? t("zones.handOutside")
                : t("zones.locationOf", { name: selected })
            : t("zones.clickHint")}
        </p>
        <MiniPlayfield highlights={highlights} />
        {selected === handZoneName && (
          <div className="text-[11px] text-center rounded border border-orange-400/50 bg-orange-400/10 text-orange-600 font-bold px-2 py-1">
            {t("zones.handLabel")}
          </div>
        )}
      </div>

      <Note>{t("zones.note")}</Note>
    </Section>
  );
}

// ── card type item ────────────────────────────────────────────────────────────

type CardTypeEntry = {
  name: string;
  color: string;
  head: string;
  desc: string;
  attrs: readonly string[];
  notes: readonly string[];
  rotate: number;
};

function CardTypeItem({
  ct,
  cardRef,
  cardRefs,
  onOpen,
  viewOtherCardLabel,
}: {
  ct: CardTypeEntry;
  cardRef: CardPreview_card$key | null | undefined;
  cardRefs?: readonly (CardPreview_card$key | null | undefined)[];
  onOpen: (id: string) => void;
  viewOtherCardLabel: string;
}) {
  const pool = cardRefs && cardRefs.length > 0 ? cardRefs : cardRef ? [cardRef] : [];
  const [idx, setIdx] = useState(0);
  const [slide, setSlide] = useState<"idle" | "out" | "in">("idle");
  const [rotation, setRotation] = useState(ct.rotate);

  const handleRefresh = () => {
    if (pool.length <= 1 || slide !== "idle") return;
    setSlide("out");
    setTimeout(() => {
      setIdx((i) => (i + 1) % pool.length);
      setRotation((Math.random() * 18 - 9) | 0);
      setSlide("in");
      setTimeout(() => setSlide("idle"), 460);
    }, 220);
  };

  const currentRef = pool[idx % pool.length];

  return (
    <>
      <style>{`
        @keyframes card-type-slide-out {
          0%   { transform: translateX(0);    opacity: 1; }
          18%  { transform: translateX(-10%); opacity: 1; }
          100% { transform: translateX(210%); opacity: 0; }
        }
        @keyframes card-type-slide-in {
          0%   { transform: translateX(210%); opacity: 0; }
          12%  { opacity: 1; }
          55%  { transform: translateX(-14%); }
          75%  { transform: translateX(6%);   }
          90%  { transform: translateX(-2%);  }
          100% { transform: translateX(0);    }
        }
      `}</style>
      <div className={cn("relative rounded-md border overflow-visible isolate", ct.color)}>
        {/* content — right padding to leave room for the peeking card */}
        <div className="p-3 pr-24">
          <p className={cn("text-xs font-bold mb-1", ct.head)}>{ct.name}</p>
          <p className="text-xs mb-2">{ct.desc}</p>
          {ct.attrs.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {ct.attrs.map((a) => (
                <span key={a} className="text-xs bg-white/70 border rounded px-1.5 py-0.5">
                  {a}
                </span>
              ))}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {ct.notes.map((n, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                · {n}
              </li>
            ))}
          </ul>
        </div>

        {/* peeking card — half-overlapping right edge, slightly tilted */}
        {currentRef && (
          <div
            className="absolute top-1/2 right-0 z-10 drop-shadow-lg"
            style={{
              width: 96,
              transform: `translateX(45%) translateY(-50%) rotate(${rotation}deg)`,
            }}
          >
            <div
              style={{
                animation:
                  slide === "out"
                    ? "card-type-slide-out 220ms ease-in forwards"
                    : slide === "in"
                      ? "card-type-slide-in 460ms ease-out forwards"
                      : "none",
              }}
            >
              <CardPreview cardRef={currentRef} onOpen={onOpen} />
            </div>
          </div>
        )}

        {/* refresh button */}
        {pool.length > 1 && (
          <button
            type="button"
            onClick={handleRefresh}
            title={viewOtherCardLabel}
            className={cn(
              "absolute bottom-3 right-0 z-20 translate-x-[45%]",
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-white/80 border border-border/60 text-muted-foreground",
              "hover:bg-white hover:text-foreground transition-all text-sm",
              slide !== "idle" && "opacity-50 cursor-not-allowed",
            )}
          >
            ↺
          </button>
        )}
      </div>
    </>
  );
}

// ── query ─────────────────────────────────────────────────────────────────────

export const Query = graphql`
  query RulesPageQuery {
    unitSample: randomCard(kind: UNIT) {
      ...CardPreview_card
      ...RulesPage_SetupMiniCard
    }
    pilotSample: randomCard(kind: PILOT) {
      ...CardPreview_card
      ...RulesPage_SetupMiniCard
    }
    commandSample: randomCard(kind: COMMAND) {
      ...CardPreview_card
      ...RulesPage_SetupMiniCard
    }
    baseSample: randomCard(kind: BASE) {
      ...CardPreview_card
      ...RulesPage_SetupMiniCard
    }
    resourceSample: randomCard(kind: RESOURCE) {
      ...CardPreview_card
      ...RulesPage_SetupMiniCard
    }
    unitSamples: randomCards(kind: UNIT, count: 6) {
      ...CardPreview_card
    }
    pilotSamples: randomCards(kind: PILOT, count: 6) {
      ...CardPreview_card
    }
    commandSamples: randomCards(kind: COMMAND, count: 6) {
      ...CardPreview_card
    }
    baseSamples: randomCards(kind: BASE, count: 6) {
      ...CardPreview_card
    }
    resourceSamples: randomCards(kind: RESOURCE, count: 6) {
      ...CardPreview_card
    }
  }
`;

// ── page ──────────────────────────────────────────────────────────────────────

export function RulesPage() {
  const { t } = useTranslation("rules");
  const queryRef = Route.useLoaderData() as PreloadedQuery<RulesPageQueryType>;
  const data = usePreloadedQuery<RulesPageQueryType>(Query, queryRef);
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);

  const phases = getPhases(t);
  const battleSteps = getBattleSteps(t);
  const setupSteps = getSetupSteps(t);

  const p1HandImages: SetupHandImages = [
    extractSetupCardUrl(data.unitSample),
    extractSetupCardUrl(data.pilotSample),
    extractSetupCardUrl(data.commandSample),
    extractSetupCardUrl(data.unitSample),
    extractSetupCardUrl(data.pilotSample),
  ];
  const p2HandImages: SetupHandImages = [
    extractSetupCardUrl(data.commandSample),
    extractSetupCardUrl(data.unitSample),
    extractSetupCardUrl(data.pilotSample),
    extractSetupCardUrl(data.baseSample),
    extractSetupCardUrl(data.commandSample),
  ];
  // New hands after mulligan (different card order to visually distinguish)
  const newP1HandImages: SetupHandImages = [
    extractSetupCardUrl(data.pilotSample),
    extractSetupCardUrl(data.commandSample),
    extractSetupCardUrl(data.baseSample),
    extractSetupCardUrl(data.commandSample),
    extractSetupCardUrl(data.unitSample),
  ];
  const newP2HandImages: SetupHandImages = [
    extractSetupCardUrl(data.unitSample),
    extractSetupCardUrl(data.baseSample),
    extractSetupCardUrl(data.pilotSample),
    extractSetupCardUrl(data.commandSample),
    extractSetupCardUrl(data.unitSample),
  ];

  const viewOtherCardLabel = t("sections.cardTypes.viewOtherCard");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4 w-full">
      {overlayCardId && (
        <CardByIdOverlay cardId={overlayCardId} onClose={() => setOverlayCardId(null)} />
      )}
      <div>
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      {/* ── objective ── */}
      <Section title={t("sections.objective.title")} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-1.5">
              {t("sections.objective.win.label")}
            </p>
            <ul className="text-xs text-green-800 flex flex-col gap-1">
              {(t("sections.objective.win.conditions", { returnObjects: true }) as string[]).map(
                (c, i) => (
                  <li key={i}>· {c}</li>
                ),
              )}
            </ul>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">
              {t("sections.objective.lose.label")}
            </p>
            <ul className="text-xs text-red-800 flex flex-col gap-1">
              {(t("sections.objective.lose.conditions", { returnObjects: true }) as string[]).map(
                (c, i) => (
                  <li key={i}>· {c}</li>
                ),
              )}
            </ul>
          </div>
        </div>
        <Note>{t("sections.objective.note")}</Note>
      </Section>

      {/* ── deck rules ── */}
      <Section title={t("sections.deckRules.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative rounded-md border p-3 overflow-hidden">
            <span className="absolute right-2 bottom-[-0.22em] text-[7rem] font-black text-foreground/5 leading-none select-none pointer-events-none">
              50
            </span>
            <p className="text-xs font-semibold mb-2">{t("sections.deckRules.mainDeck.label")}</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              {(t("sections.deckRules.mainDeck.rules", { returnObjects: true }) as string[]).map(
                (r, i) => (
                  <li key={i}>· {r}</li>
                ),
              )}
            </ul>
          </div>
          <div className="relative rounded-md border p-3 overflow-hidden">
            <span className="absolute right-2 bottom-[-0.22em] text-[7rem] font-black text-foreground/5 leading-none select-none pointer-events-none">
              10
            </span>
            <p className="text-xs font-semibold mb-2">
              {t("sections.deckRules.resourceDeck.label")}
            </p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              {(
                t("sections.deckRules.resourceDeck.rules", { returnObjects: true }) as string[]
              ).map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-md border p-3 flex flex-col gap-2 text-xs">
          <p className="font-semibold">{t("sections.deckRules.playConditions.label")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">
                {t("sections.deckRules.playConditions.level.name")}
              </span>
              <p>{t("sections.deckRules.playConditions.level.desc")}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">
                {t("sections.deckRules.playConditions.cost.name")}
              </span>
              <p>{t("sections.deckRules.playConditions.cost.desc")}</p>
            </div>
          </div>
        </div>
        <Note>{t("sections.deckRules.note")}</Note>
      </Section>

      {/* ── card types ── */}
      <Section title={t("sections.cardTypes.title")}>
        <div className="flex flex-col gap-2">
          {(
            [
              {
                name: t("sections.cardTypes.items.unit.name"),
                color: "bg-blue-50 border-blue-200",
                head: "text-blue-700",
                desc: t("sections.cardTypes.items.unit.desc"),
                attrs: t("sections.cardTypes.items.unit.attrs", {
                  returnObjects: true,
                }) as string[],
                notes: t("sections.cardTypes.items.unit.notes", {
                  returnObjects: true,
                }) as string[],
                rotate: 6,
                cardRef: data.unitSample,
                cardRefs: data.unitSamples,
              },
              {
                name: t("sections.cardTypes.items.pilot.name"),
                color: "bg-pink-50 border-pink-200",
                head: "text-pink-700",
                desc: t("sections.cardTypes.items.pilot.desc"),
                attrs: t("sections.cardTypes.items.pilot.attrs", {
                  returnObjects: true,
                }) as string[],
                notes: t("sections.cardTypes.items.pilot.notes", {
                  returnObjects: true,
                }) as string[],
                rotate: -5,
                cardRef: data.pilotSample,
                cardRefs: data.pilotSamples,
              },
              {
                name: t("sections.cardTypes.items.command.name"),
                color: "bg-teal-50 border-teal-200",
                head: "text-teal-700",
                desc: t("sections.cardTypes.items.command.desc"),
                attrs: t("sections.cardTypes.items.command.attrs", {
                  returnObjects: true,
                }) as string[],
                notes: t("sections.cardTypes.items.command.notes", {
                  returnObjects: true,
                }) as string[],
                rotate: 8,
                cardRef: data.commandSample,
                cardRefs: data.commandSamples,
              },
              {
                name: t("sections.cardTypes.items.base.name"),
                color: "bg-gray-50 border-gray-200",
                head: "text-gray-700",
                desc: t("sections.cardTypes.items.base.desc"),
                attrs: t("sections.cardTypes.items.base.attrs", {
                  returnObjects: true,
                }) as string[],
                notes: t("sections.cardTypes.items.base.notes", {
                  returnObjects: true,
                }) as string[],
                rotate: -7,
                cardRef: data.baseSample,
                cardRefs: data.baseSamples,
              },
              {
                name: t("sections.cardTypes.items.resource.name"),
                color: "bg-yellow-50 border-yellow-200",
                head: "text-yellow-700",
                desc: t("sections.cardTypes.items.resource.desc"),
                attrs: t("sections.cardTypes.items.resource.attrs", {
                  returnObjects: true,
                }) as string[],
                notes: t("sections.cardTypes.items.resource.notes", {
                  returnObjects: true,
                }) as string[],
                rotate: 5,
                cardRef: data.resourceSample,
                cardRefs: data.resourceSamples,
              },
            ] as const
          ).map((ct) => (
            <CardTypeItem
              key={ct.name}
              ct={ct}
              cardRef={ct.cardRef}
              cardRefs={ct.cardRefs}
              onOpen={setOverlayCardId}
              viewOtherCardLabel={viewOtherCardLabel}
            />
          ))}
        </div>
        <Note>
          <span className="font-medium">EX {t("sections.cardTypes.items.base.name")}:</span>{" "}
          {t("sections.cardTypes.note").split("\n")[0]}
          {"\n"}
          <span className="font-medium">
            EX {t("sections.cardTypes.items.resource.name")}:
          </span>{" "}
          {t("sections.cardTypes.note").split("\n")[1]}
        </Note>
      </Section>

      {/* ── game setup ── */}
      <Section title={t("sections.gameSetup.title")}>
        <GameSetupWalkthrough
          p1HandImages={p1HandImages}
          p2HandImages={p2HandImages}
          newP1HandImages={newP1HandImages}
          newP2HandImages={newP2HandImages}
          setupSteps={setupSteps}
          t={t}
        />
      </Section>

      {/* ── turn flow ── */}
      <Section title={t("sections.turnFlow.title")}>
        <TurnPhaseWalkthrough phases={phases} t={t} />
        <Note>{t("sections.turnFlow.note")}</Note>
      </Section>

      {/* ── battle ── */}
      <Section title={t("sections.battle.title")}>
        <div className="flex flex-col gap-3">
          <Note>
            <span className="font-medium">
              {t("sections.battle.attackConditionNote").split("\n")[0]}
            </span>
            {"\n"}
            {t("sections.battle.attackConditionNote").split("\n")[1]}
          </Note>

          <p className="text-xs text-muted-foreground">{t("sections.battle.clickHint")}</p>
          <BattleStepsWalkthrough battleSteps={battleSteps} />

          <UnitBattleSimulator />

          <Note>{t("sections.battle.note")}</Note>
        </div>
      </Section>

      {/* ── zones ── */}
      <ZoneSection t={t} />

      {/* ── triggers ── */}
      <Section title={t("sections.triggers.title")}>
        <div className="flex flex-col gap-3">
          {(
            [
              "activateMain",
              "activateAction",
              "main",
              "action",
              "burst",
              "onPlace",
              "onAttack",
              "onDestroy",
              "onSet",
              "whileSet",
              "onLink",
              "whileLink",
              "oncePer",
            ] as const
          ).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <div>
                <TBadge name={t(`sections.triggers.items.${key}.badge`)} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(`sections.triggers.items.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── effects ── */}
      <Section title={t("sections.effects.title")}>
        <div className="flex flex-col gap-2 text-xs">
          {(["continuous", "triggered", "activated", "command", "replacement"] as const).map(
            (key) => (
              <div key={key} className="rounded border p-2">
                <p className="font-semibold mb-0.5">{t(`sections.effects.items.${key}.name`)}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`sections.effects.items.${key}.desc`)}
                </p>
              </div>
            ),
          )}
        </div>
        <Note>{t("sections.effects.note")}</Note>
      </Section>

      {/* ── glossary ── */}
      <Section title={t("sections.glossary.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {(
            [
              "activeRest",
              "place",
              "set",
              "destroy",
              "exclude",
              "discard",
              "draw",
              "play",
              "recover",
              "battleDamage",
              "turnPlayer",
              "slash",
            ] as const
          ).map((key) => (
            <div key={key} className="rounded border p-2">
              <p className="font-semibold mb-0.5">{t(`sections.glossary.items.${key}.term`)}</p>
              <p className="text-muted-foreground leading-relaxed">
                {t(`sections.glossary.items.${key}.def`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-xs text-muted-foreground text-center">{t("footer")}</p>
    </div>
  );
}
