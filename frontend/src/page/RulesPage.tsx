import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";
import {
  triggerClass,
  abilityClass,
  TRIGGER_FALLBACK,
  ABILITY_FALLBACK,
} from "@/components/CardDescription";

// ── badge helpers ─────────────────────────────────────────────────────────────

const TRIGGER_LIGHT = "bg-gray-100 text-gray-700";
const ABILITY_LIGHT = "border-gray-300 bg-gray-50 text-gray-700";

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

function ABadge({ name }: { name: string }) {
  const cls = abilityClass(name);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold",
        cls === ABILITY_FALLBACK ? ABILITY_LIGHT : cls,
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

// ── mini playfield — matches actual play sheet layout ─────────────────────────
// Layout (from image):
//   LEFT column : 실드 에어리어 (베이스 존 top, 실드 존 below)  [⑥③]
//   CENTER top  : 배틀 에어리어                                  [⑤]
//   RIGHT top   : 덱 에어리어                                    [①]
//   BOTTOM left : 리소스 덱 에어리어                             [②]
//   BOTTOM center: 리소스 에어리어                               [④]
//   BOTTOM right : 트래시                                        [⑦]

type ZoneId =
  | "base"
  | "shield"
  | "battle"
  | "deck"
  | "resourceDeck"
  | "resource"
  | "trash"
  | "hand";

// Correct layout (from play sheet image):
//   FAR LEFT (spans both rows): 실드 에어리어 — 베이스 존(⑥) top, 실드 존(③) below
//   TOP RIGHT of shield:        ⑤ 배틀 에어리어 (large) | ① 덱
//   BOTTOM RIGHT of shield:     ② 리소스 덱 | ④ 리소스 에어리어 | ⑦ 트래시

function MiniPlayfield({ highlights }: { highlights: ZoneId[] }) {
  const hi = (id: ZoneId) => highlights.includes(id);
  const zone = (id: ZoneId, label: string, cls?: string) => (
    <div
      className={cn(
        "flex items-center justify-center text-center rounded border transition-all duration-300 text-[10px] font-medium leading-tight p-0.5",
        hi(id)
          ? "bg-primary/15 border-primary text-primary font-bold scale-[1.02]"
          : "bg-background border-border text-muted-foreground",
        cls,
      )}
    >
      {label}
    </div>
  );

  return (
    <div className="flex gap-0.5 text-[10px] select-none">
      {/* FAR LEFT: 실드 에어리어 (spans full height) */}
      <div
        className={cn(
          "flex flex-col gap-0.5 rounded border p-0.5 transition-all duration-300 shrink-0",
          hi("base") || hi("shield")
            ? "border-primary/50 bg-primary/5"
            : "border-border",
        )}
        style={{ width: 44 }}
      >
        <div className="text-[9px] text-center text-muted-foreground leading-none">
          실드 에어리어
        </div>
        {zone("base", "⑥\n베이스존", "h-[32px] flex-none")}
        {zone("shield", "③\n실드존", "flex-1")}
      </div>

      {/* RIGHT side: two rows */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {/* Top row: 배틀 에어리어 + 덱 */}
        <div className="flex gap-0.5" style={{ height: 54 }}>
          {zone("battle", "⑤ 배틀 에어리어", "flex-1")}
          {zone("deck", "①덱", "w-[32px] flex-none")}
        </div>
        {/* Bottom row: 리소스덱 + 리소스 에어리어 + 트래시 */}
        <div className="flex gap-0.5" style={{ height: 34 }}>
          {zone("resourceDeck", "②리소스덱", "w-[44px] flex-none")}
          {zone("resource", "④ 리소스 에어리어", "flex-1")}
          {zone("trash", "⑦트래시", "w-[34px] flex-none")}
        </div>
      </div>
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

const PHASES: Phase[] = [
  {
    label: "스타트 페이즈",
    color: "bg-blue-50 border-blue-200",
    headColor: "text-blue-700",
    dotColor: "bg-blue-500",
    highlights: ["battle", "resource", "base", "shield"],
    steps: [
      {
        name: "액티브 스텝",
        desc: "자신 필드(배틀 에어리어·리소스 에어리어·베이스 존)의 레스트 카드 전부를 동시에 액티브로.",
      },
      { name: "스타트 스텝", desc: "「턴 개시 시」 효과 발동." },
    ],
  },
  {
    label: "드로우 페이즈",
    color: "bg-green-50 border-green-200",
    headColor: "text-green-700",
    dotColor: "bg-green-500",
    highlights: ["deck", "hand"],
    steps: [
      {
        name: "드로우",
        desc: "덱 위에서 1장 드로우. 덱이 0장이 되면 그 시점에 패배.",
      },
    ],
  },
  {
    label: "리소스 페이즈",
    color: "bg-yellow-50 border-yellow-200",
    headColor: "text-yellow-700",
    dotColor: "bg-yellow-500",
    highlights: ["resourceDeck", "resource"],
    steps: [
      {
        name: "리소스 추가",
        desc: "리소스 덱 위에서 1장을 리소스 에어리어에 앞면 액티브 상태로 배치.",
      },
    ],
  },
  {
    label: "메인 페이즈",
    color: "bg-orange-50 border-orange-200",
    headColor: "text-orange-700",
    dotColor: "bg-orange-500",
    highlights: ["battle", "resource", "hand"],
    steps: [
      {
        name: "패 플레이",
        desc: "코스트를 지불해 유닛 배치 / 베이스 배치 / 파일럿 세트 / 【메인】 커맨드 발동.",
      },
      {
        name: "【기동･메인】 발동",
        desc: "유닛 어택 중이 아닐 때 기동메인 효과 발동.",
      },
      {
        name: "유닛 어택",
        desc: "액티브 유닛으로 상대 플레이어 또는 레스트 상태 상대 유닛을 어택.",
      },
    ],
    note: "위 3가지를 원하는 순서로 몇 번이고 반복. 「메인 페이즈 종료」를 선언하면 엔드 페이즈로.",
  },
  {
    label: "엔드 페이즈",
    color: "bg-purple-50 border-purple-200",
    headColor: "text-purple-700",
    dotColor: "bg-purple-500",
    highlights: ["hand", "trash"],
    steps: [
      {
        name: "액션 스텝",
        desc: "비 턴 플레이어부터 교대로 【액션】/【기동･액션】 발동 가능. 양측 연속 패스로 종료.",
      },
      { name: "엔드 스텝", desc: "「턴 종료 시」 효과 발동." },
      {
        name: "핸드 스텝",
        desc: "패가 10장 초과 시 10장이 되도록 카드를 선택해 버림.",
      },
      {
        name: "클린업 스텝",
        desc: "「이 턴 중」 효과 소멸. 발생한 효과 해결 후 상대에게 턴 이동.",
      },
    ],
  },
];

const BATTLE_STEPS = [
  {
    name: "어택 스텝",
    desc: "액티브 유닛 1기를 레스트시키고, 상대 플레이어 또는 레스트 상태 상대 유닛을 어택 대상으로 선언. 【어택 시】 효과 발동.",
  },
  {
    name: "블록 스텝",
    desc: "비 턴 플레이어는 《블로커》 보유 유닛을 레스트시켜 어택 대상을 변경 가능. 1회의 어택에 1번만.",
  },
  {
    name: "액션 스텝",
    desc: "양측 교대로 【액션】/【기동･액션】 발동 가능. 양측 연속 패스로 종료.",
  },
  {
    name: "대미지 스텝",
    desc: "어택 성립. 유닛끼리 어택 시 서로 AP만큼 배틀 대미지 교환. 플레이어 어택 시 실드 에어리어에 순서대로 대미지.",
  },
  {
    name: "배틀 종료 스텝",
    desc: "「이 배틀 중」 효과 전부 소멸. 메인 페이즈로 복귀.",
  },
];

// ── interactive: turn phase walkthrough ──────────────────────────────────────

function TurnPhaseWalkthrough() {
  const [active, setActive] = useState(0);
  const phase = PHASES[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Phase pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PHASES.map((p, i) => (
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
      <div
        className={cn(
          "rounded-lg border-2 p-3 transition-all duration-300",
          phase.color,
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <p className={cn("text-sm font-bold", phase.headColor)}>
            {phase.label}
          </p>
          <span className={cn("text-xs font-medium opacity-60", phase.headColor)}>
            {active + 1} / {PHASES.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {phase.steps.map((step, i) => (
            <div
              key={step.name}
              className="flex gap-2 text-xs bg-white/60 rounded-md p-2"
            >
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
                <p className="text-xs opacity-75 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        {phase.note && (
          <p className="text-xs mt-2 opacity-60 border-t border-current/20 pt-2">
            {phase.note}
          </p>
        )}
      </div>

      {/* Mini playfield — full width below phase detail */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground font-medium">관련 영역</p>
        <MiniPlayfield highlights={phase.highlights} />
        {phase.highlights.includes("hand") && (
          <div className="text-xs text-center rounded border border-primary/50 bg-primary/10 text-primary font-bold px-2 py-1 transition-all">
            패 (손패) — 플레이 시트 밖, 자신만 열람
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
          이전
        </button>
        <div className="flex-1 flex justify-center gap-1.5">
          {PHASES.map((_, i) => (
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
          onClick={() => setActive((v) => Math.min(PHASES.length - 1, v + 1))}
          disabled={active === PHASES.length - 1}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          다음
          <ChevronRightIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ── interactive: battle steps walkthrough ────────────────────────────────────

function BattleStepsWalkthrough() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {BATTLE_STEPS.map((step, i) => {
        const isActive = active === i;
        return (
          <button
            key={step.name}
            type="button"
            onClick={() => setActive(isActive ? null : i)}
            className={cn(
              "flex gap-3 text-xs text-left rounded-md px-2 -mx-2 transition-all duration-200",
              isActive ? "bg-primary/8" : "hover:bg-muted/30",
            )}
          >
            <div className="shrink-0 flex flex-col items-center">
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 mt-2.5",
                  isActive
                    ? "bg-primary text-primary-foreground scale-110"
                    : "bg-muted",
                )}
              >
                {i + 1}
              </span>
              {i < BATTLE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-3 my-0.5 transition-colors duration-200",
                    isActive ? "bg-primary/30" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 py-2.5">
              <p
                className={cn(
                  "font-semibold transition-colors duration-200",
                  isActive ? "text-primary" : "",
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

// ── interactive: shield damage simulator ─────────────────────────────────────
// Layout matches actual play sheet:
//   실드 에어리어 is on the LEFT (베이스 존 top, 실드 존 below with vertical shields)
//   Attacker comes from the RIGHT (배틀 에어리어)
//   Damage flows: 베이스 존 → 실드 존 (top shield first) → player

function ShieldSimulator() {
  const INIT_SHIELDS = 6;
  const INIT_BASE_HP = 3;
  const [shields, setShields] = useState(INIT_SHIELDS);
  const [baseHp, setBaseHp] = useState(INIT_BASE_HP);
  const [hasBase, setHasBase] = useState(true);
  const [defeated, setDefeated] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [hasBurst, setHasBurst] = useState(false);
  // which zone flashed last
  const [flash, setFlash] = useState<"base" | "shield" | "player" | null>(null);

  function addLog(msg: string) {
    setLog((l) => [msg, ...l.slice(0, 7)]);
  }

  function triggerFlash(zone: "base" | "shield" | "player") {
    setFlash(zone);
    setTimeout(() => setFlash(null), 600);
  }

  function attack() {
    if (defeated) return;
    if (hasBase) {
      const newHp = baseHp - 1;
      triggerFlash("base");
      if (newHp <= 0) {
        setBaseHp(0);
        setHasBase(false);
        addLog("베이스 HP 0 → 파괴!");
      } else {
        setBaseHp(newHp);
        addLog(`베이스에 대미지 (남은 HP: ${newHp}/3)`);
      }
      return;
    }
    if (shields > 0) {
      triggerFlash("shield");
      const newShields = shields - 1;
      setShields(newShields);
      const burst = hasBurst ? " → 【버스트】 발동!" : " → 트래시";
      addLog(`실드 1장 파괴${burst} (남은: ${newShields}장)`);
    } else {
      triggerFlash("player");
      setDefeated(true);
      addLog("배틀 대미지 직격 → 패배!");
    }
  }

  function reset() {
    setShields(INIT_SHIELDS);
    setBaseHp(INIT_BASE_HP);
    setHasBase(true);
    setDefeated(false);
    setLog([]);
    setFlash(null);
  }

  return (
    <div className="rounded-md border p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold">플레이어 어택 시뮬레이터</p>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasBurst}
            onChange={(e) => setHasBurst(e.target.checked)}
            className="w-3 h-3 accent-primary"
          />
          실드에 【버스트】 있음
        </label>
      </div>

      {/* Main visual — left: 실드 에어리어, center: arrow, right: 배틀 에어리어 */}
      <div className="flex gap-2 items-stretch min-h-[160px]">

        {/* ① LEFT: 실드 에어리어 (베이스 존 + 실드 존) */}
        <div className="flex flex-col gap-1 shrink-0" style={{ width: 72 }}>
          <p className="text-[10px] font-semibold text-center text-muted-foreground leading-none">
            실드 에어리어
          </p>

          {/* 베이스 존 */}
          <div className="border rounded p-1 flex flex-col gap-0.5">
            <p className="text-[9px] text-center text-muted-foreground leading-none">
              ⑥ 베이스 존
            </p>
            <div
              className={cn(
                "rounded border-2 flex flex-col items-center justify-center transition-all duration-300 py-1",
                hasBase
                  ? flash === "base"
                    ? "border-red-500 bg-red-200 scale-105"
                    : "border-gray-400 bg-gray-100"
                  : "border-dashed border-gray-200 bg-transparent opacity-30",
              )}
              style={{ minHeight: 40 }}
            >
              {hasBase ? (
                <>
                  <p className="text-[10px] font-bold text-gray-700 leading-none">
                    EX 베이스
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    HP {baseHp}/{INIT_BASE_HP}
                  </p>
                  {/* HP bar */}
                  <div className="w-full px-1 mt-0.5">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500 rounded-full transition-all duration-300"
                        style={{ width: `${(baseHp / INIT_BASE_HP) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-gray-400">없음</p>
              )}
            </div>
          </div>

          {/* 실드 존 */}
          <div className="border rounded p-1 flex flex-col gap-0.5 flex-1">
            <p className="text-[9px] text-center text-muted-foreground leading-none">
              ③ 실드 존
            </p>
            <div className="flex flex-col gap-0.5 flex-1 justify-around">
              {Array.from({ length: INIT_SHIELDS }, (_, i) => {
                const filled = i < shields;
                // top shield = index 0 = first to be destroyed
                const isTop = filled && i === shields - 1;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded border flex items-center justify-center transition-all duration-300",
                      filled
                        ? flash === "shield" && isTop
                          ? "border-red-500 bg-red-200 scale-105"
                          : "border-blue-300 bg-blue-100 text-blue-700"
                        : "border-dashed border-gray-100 bg-transparent",
                    )}
                    style={{ height: 18 }}
                  >
                    {filled ? (
                      <span className="text-[9px] font-bold leading-none">
                        {hasBurst && isTop ? "실드 B" : "실드"}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ② CENTER: player + attack arrow */}
        <div className="flex flex-col items-center justify-between py-1 flex-1 min-w-0">
          {/* Player status */}
          <div
            className={cn(
              "px-2 py-1 rounded border-2 text-[11px] font-bold transition-all duration-300 w-full text-center",
              defeated
                ? "border-red-400 bg-red-100 text-red-700 animate-pulse"
                : flash === "player"
                  ? "border-red-500 bg-red-200 text-red-700 scale-105"
                  : "border-green-300 bg-green-50 text-green-700",
            )}
          >
            {defeated ? "패배!" : "플레이어"}
          </div>

          {/* Attack direction arrow */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <span className="text-sm">←</span>
              <span>어택</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              {!hasBase && shields === 0
                ? "방어 없음!"
                : hasBase
                  ? "베이스가 흡수"
                  : `실드 ${shields}장 남음`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-1.5 w-full">
            <button
              type="button"
              onClick={attack}
              disabled={defeated}
              className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
            >
              어택!
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs px-2 py-1.5 rounded border border-border hover:bg-muted/30 transition-all"
            >
              리셋
            </button>
          </div>
        </div>

        {/* ③ RIGHT: 배틀 에어리어 (attacker) */}
        <div
          className="shrink-0 flex flex-col gap-1"
          style={{ width: 64 }}
        >
          <p className="text-[10px] font-semibold text-center text-muted-foreground leading-none">
            배틀 에어리어
          </p>
          <div className="border rounded p-1 flex-1 flex flex-col items-center justify-center gap-1">
            <p className="text-[9px] text-center text-muted-foreground leading-none">
              ⑤
            </p>
            {/* Attacker unit card */}
            <div
              className={cn(
                "rounded border-2 border-primary/60 bg-primary/10 flex flex-col items-center justify-center gap-0.5 transition-all duration-200",
                !defeated && "hover:bg-primary/20",
              )}
              style={{ width: 44, height: 58 }}
            >
              <p className="text-[10px] font-bold text-primary leading-none">
                공격
              </p>
              <p className="text-[10px] font-bold text-primary leading-none">
                유닛
              </p>
              <div className="flex gap-0.5 mt-0.5">
                <span className="text-[9px] bg-primary/20 rounded px-0.5 text-primary">
                  AP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
          {log.map((entry, i) => (
            <p
              key={i}
              className={cn(
                "text-xs px-2 py-0.5 rounded transition-all",
                i === 0
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground",
              )}
            >
              {entry}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── zone section (interactive playfield highlight) ───────────────────────────

const ZONES = [
  {
    name: "덱 에어리어",
    num: "①",
    type: "비공개" as const,
    desc: "게임 덱을 두는 곳. 위에서 1장씩 드로우.",
    ids: ["deck"] as ZoneId[],
  },
  {
    name: "리소스 덱 에어리어",
    num: "②",
    type: "비공개" as const,
    desc: "리소스 덱을 두는 곳.",
    ids: ["resourceDeck"] as ZoneId[],
  },
  {
    name: "실드 에어리어",
    num: "③⑥",
    type: "혼합" as const,
    desc: "베이스 존(공개, ⑥) + 실드 존(비공개, ③).",
    ids: ["base", "shield"] as ZoneId[],
  },
  {
    name: "리소스 에어리어",
    num: "④",
    type: "공개" as const,
    desc: "리소스를 두는 곳. 최대 15장.",
    ids: ["resource"] as ZoneId[],
  },
  {
    name: "배틀 에어리어",
    num: "⑤",
    type: "공개" as const,
    desc: "유닛·파일럿을 두는 곳. 유닛 최대 6기.",
    ids: ["battle"] as ZoneId[],
  },
  {
    name: "패 (손패)",
    num: "—",
    type: "비공개" as const,
    desc: "드로우한 카드. 상한 10장. 자신만 열람 가능.",
    ids: ["hand"] as ZoneId[],
  },
  {
    name: "트래시",
    num: "⑦",
    type: "공개" as const,
    desc: "파괴·사용된 카드. 순서 변경 가능.",
    ids: ["trash"] as ZoneId[],
  },
  {
    name: "제외 에어리어",
    num: "—",
    type: "공개" as const,
    desc: "제외된 카드. 파괴와는 다른 처리.",
    ids: [] as ZoneId[],
  },
];

function ZoneSection() {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedZone = ZONES.find((z) => z.name === selected);
  const highlights: ZoneId[] = selectedZone?.ids ?? [];

  return (
    <Section title="게임 영역 (존)">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {ZONES.map((z) => {
          const isSelected = selected === z.name;
          return (
            <button
              key={z.name}
              type="button"
              onClick={() => setSelected(isSelected ? null : z.name)}
              className={cn(
                "rounded border p-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/8 shadow-sm"
                  : "border-border hover:bg-muted/40 hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={cn(
                    "font-semibold transition-colors",
                    isSelected && "text-primary",
                  )}
                >
                  {z.name}
                </span>
                {z.num !== "—" && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {z.num}
                  </span>
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
                  {z.type}
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
              ? `「${selected}」는 플레이 시트 밖에 위치합니다.`
              : selected === "패 (손패)"
                ? `「패」는 플레이 시트 밖 (손에 들고 있는 카드)입니다.`
                : `「${selected}」의 위치`
            : "영역 카드를 클릭하면 플레이 시트에서 위치를 확인할 수 있습니다."}
        </p>
        <MiniPlayfield highlights={highlights} />
        {selected === "패 (손패)" && (
          <div className="text-[11px] text-center rounded border border-primary/50 bg-primary/10 text-primary font-bold px-2 py-1">
            패 (손패) — 플레이 시트 밖, 자신만 열람
          </div>
        )}
      </div>

      <Note>
        카드가 영역 간 이동 시, 특별한 지시 없이는 새로운 카드로 취급 (이전 효과 소멸).
        리소스 에어리어·배틀 에어리어·실드 에어리어를 합쳐 「필드」라고 부르기도 함.
      </Note>
    </Section>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4 w-full">
      <div>
        <h1 className="text-lg font-bold">게임 규칙</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          건담 카드 게임 종합 규칙 Ver. 1.4.1 요약
        </p>
      </div>

      {/* ── 게임 목표 ── */}
      <Section title="게임 목표와 승패" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-1.5">승리 조건</p>
            <ul className="text-xs text-green-800 flex flex-col gap-1">
              <li>· 상대 실드 에어리어가 0장인 상태에서 유닛으로 배틀 대미지를 줌</li>
              <li>· 상대 덱을 0장으로 만듦</li>
            </ul>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">패배 조건</p>
            <ul className="text-xs text-red-800 flex flex-col gap-1">
              <li>· 실드 에어리어 0장 상태에서 배틀 대미지를 받음</li>
              <li>· 덱이 0장이 됨 (드로우 시점 포함)</li>
              <li>· 투료 선언 → 즉시 패배</li>
            </ul>
          </div>
        </div>
        <Note>
          카드 텍스트가 종합 규칙과 모순될 경우 카드 텍스트가 우선합니다.
          금지 효과는 항상 허용 효과보다 우선합니다.
        </Note>
      </Section>

      {/* ── 덱 구성 ── */}
      <Section title="덱 구성 규칙">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">메인 덱 — 50장</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              <li>· 유닛 / 파일럿 / 커맨드 / 베이스 카드로 구성</li>
              <li>· 1색 또는 2색으로만 구성</li>
              <li>· 같은 카드 No. 최대 4장</li>
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">리소스 덱 — 10장</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              <li>· 리소스 카드로만 구성</li>
              <li>· 같은 카드 No. 제한 없음</li>
            </ul>
          </div>
        </div>
        <div className="rounded-md border p-3 flex flex-col gap-2 text-xs">
          <p className="font-semibold">카드 플레이 조건</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Lv.(레벨)</span>
              <p>자신의 리소스 총 수 ≥ 카드 Lv. 이면 플레이 가능. 액티브/레스트 불문.</p>
            </div>
            <div>
              <span className="font-medium text-foreground">코스트</span>
              <p>액티브 리소스를 필요한 수만큼 레스트시켜 지불.</p>
            </div>
          </div>
        </div>
        <Note>
          리소스 에어리어 최대 15장 (EX 리소스는 최대 5장 포함).
          패 상한은 10장 (엔드 페이즈 핸드 스텝에 초과분 버림).
        </Note>
      </Section>

      {/* ── 카드 타입 ── */}
      <Section title="카드 타입 (5종)">
        <div className="flex flex-col gap-2">
          {(
            [
              {
                name: "유닛",
                color: "bg-blue-50 border-blue-200",
                head: "text-blue-700",
                desc: "플레이 시 배틀 에어리어에 배치. 상한 6기.",
                attrs: ["AP (공격력)", "HP (내구력)", "링크 조건"],
                notes: [
                  "배치 직후 그 턴에는 어택 불가 (링크 유닛 예외).",
                  "링크 조건 만족 파일럿 세트 = 링크 유닛 → 배치 턴 즉시 어택 가능.",
                  "HP 0 → 파괴 → 트래시.",
                  "배틀 에어리어의 유닛 색은 세트된 파일럿 색 영향 없음.",
                ],
              },
              {
                name: "파일럿",
                color: "bg-pink-50 border-pink-200",
                head: "text-pink-700",
                desc: "플레이 시 배틀 에어리어 유닛 아래에 세트. 유닛 1기에 1명.",
                attrs: ["AP 수정치 (+N)", "HP 수정치 (+N)"],
                notes: [
                  "카드 명 위 텍스트 → 파일럿 자신의 효과 (주로 【버스트】).",
                  "카드 명 아래 텍스트 → 세트된 유닛이 얻는 효과.",
                  "파일럿의 특징은 유닛에 추가되지 않음.",
                  "임의 교체/제거 불가. 유닛 이동 시 파일럿도 함께 이동.",
                ],
              },
              {
                name: "커맨드",
                color: "bg-teal-50 border-teal-200",
                head: "text-teal-700",
                desc: "플레이 시 커맨드 효과를 발동. 발동 후 트래시 (효과로 이동 지정 없을 경우).",
                attrs: ["【메인】 또는 【액션】 타이밍"],
                notes: [
                  "효과 발동 중에는 어느 영역에도 없는 것으로 취급.",
                  "【파일럿】 보유 시: 효과 발동 대신 파일럿으로 유닛에 세트 가능.",
                  "【버스트】 보유 가능.",
                  "커맨드 효과 대상 선택 불가 시 플레이 불가.",
                ],
              },
              {
                name: "베이스",
                color: "bg-gray-50 border-gray-200",
                head: "text-gray-700",
                desc: "플레이 시 실드 에어리어 베이스 존에 배치. 상한 1장.",
                attrs: ["AP (공격력)", "HP (내구력)"],
                notes: [
                  "베이스가 있는 동안 실드 에어리어에 가해지는 대미지는 베이스가 우선 흡수.",
                  "HP 0 → 파괴 → 트래시.",
                ],
              },
              {
                name: "리소스",
                color: "bg-yellow-50 border-yellow-200",
                head: "text-yellow-700",
                desc: "리소스 덱에서 리소스 에어리어에 직접 배치. 코스트 지불에 사용.",
                attrs: [],
                notes: [
                  "액티브 리소스를 레스트시켜 코스트 지불.",
                  "Lv. 판정은 액티브/레스트 불문 총 수 기준.",
                ],
              },
            ] as const
          ).map((ct) => (
            <div key={ct.name} className={cn("rounded-md border p-3", ct.color)}>
              <p className={cn("text-xs font-bold mb-1", ct.head)}>{ct.name}</p>
              <p className="text-xs mb-2">{ct.desc}</p>
              {ct.attrs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {ct.attrs.map((a) => (
                    <span
                      key={a}
                      className="text-xs bg-white/70 border rounded px-1.5 py-0.5"
                    >
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
          ))}
        </div>
        <Note>
          <span className="font-medium">EX 베이스:</span> AP 0 / HP 3 베이스 토큰. 게임 시작 시 베이스 존에 자동 배치.
          {"\n"}
          <span className="font-medium">EX 리소스:</span> 코스트 지불 1회용 리소스 토큰. 후공 플레이어에게 1장 제공. 사용 후 제거.
        </Note>
      </Section>

      {/* ── 게임 준비 ── */}
      <Section title="게임 준비 순서">
        <ol className="flex flex-col gap-2">
          {[
            "덱(50장)과 리소스 덱(10장)을 준비하고 충분히 셔플.",
            "가위바위보 등으로 선공·후공 결정.",
            "각 플레이어 덱에서 5장 드로우해 첫 패로.",
            "선공 플레이어부터 순서대로 1회 멀리건 가능 (패 전체를 덱 아래에 돌려놓고 5장 다시 드로우 후 덱 셔플). 선택 사항.",
            "각 플레이어 덱 위에서 6장을 뒷면으로 실드 존에 배치.",
            "각 플레이어 베이스 존에 EX 베이스 토큰 1장 배치.",
            "후공 플레이어만 리소스 에어리어에 EX 리소스 토큰 1장 배치.",
            "선공 플레이어 턴으로 게임 시작.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <Note>
          실드는 앞에서부터 바깥쪽으로 쌓음 (앞이 아래). 실드 존 카드는 뒷면 비공개이며 각각 HP 1로 취급.
          멀리건은 선공 플레이어 선언 후 후공 플레이어가 진행.
        </Note>
      </Section>

      {/* ── 턴 진행 ── */}
      <Section title="턴 진행 흐름">
        <TurnPhaseWalkthrough />
        <Note>
          각 페이즈/스텝에서 유발된 효과가 있으면 전부 해결 후 다음으로 진행.
          어택 중에는 패 플레이·기동메인 발동 불가.
        </Note>
      </Section>

      {/* ── 어택과 배틀 ── */}
      <Section title="어택과 배틀">
        <div className="flex flex-col gap-3">
          <Note>
            <span className="font-medium">어택 가능 조건:</span> 액티브 상태의 자신 유닛. 배치 직후 그 턴은 어택 불가 (링크 유닛 제외).
            상대 플레이어 또는 레스트 상태의 상대 유닛을 대상 선언.
          </Note>

          <p className="text-xs text-muted-foreground">
            스텝을 클릭하면 상세 내용을 확인할 수 있습니다.
          </p>
          <BattleStepsWalkthrough />

          <ShieldSimulator />

          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">유닛 어택 시</p>
            <p className="text-xs text-muted-foreground">
              어택 유닛·어택 대상 유닛이 서로 AP만큼 배틀 대미지를 동시에 교환.
              HP 0이 된 유닛은 트래시에. 《선제공격》 보유 시 먼저 대미지를 주고,
              그 대미지로 상대가 파괴되면 반격 대미지를 받지 않음.
              양측 동시 파괴도 가능.
            </p>
          </div>

          <Note>
            어택 스텝/블록 스텝 종료 시 유닛이 영역 이동했다면 다음 스텝을 건너뛰고 배틀 종료 스텝으로.
            《블로커》는 1회의 어택에 1번만 발동 가능. 원래 어택 대상 유닛은 《블로커》 발동 불가.
          </Note>
        </div>
      </Section>

      {/* ── 게임 영역 ── */}
      <ZoneSection />

      {/* ── 키워드 효과 ── */}
      <Section title="키워드 효과 (어빌리티)">
        <div className="flex flex-col gap-4">
          {[
            {
              badge: <ABadge name="리페어" />,
              timing: "자신의 턴 종료 시",
              desc: "《리페어 N》: 자신의 턴 종료 시 N 회복. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="돌파" />,
              timing: "자신의 턴 중, 배틀 대미지로 상대 유닛 파괴 시",
              desc: "《돌파 N》: 배틀 대미지로 상대 유닛 파괴 시 상대 실드 에어리어에 N 대미지. (베이스 우선, 없으면 실드 1장.) 상대 실드/베이스가 0장이면 발동하지 않음. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="원호" />,
              timing: "【기동･메인】 이 유닛을 레스트",
              desc: "《원호 N》: 【기동･메인】 이 유닛을 레스트 : 다른 아군 유닛 1기를 골라 이 턴 중 AP +N. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="블로커" />,
              timing: "블록 스텝",
              desc: "《블로커》: 블록 스텝에 이 유닛을 레스트시켜 어택 대상을 이 유닛으로 변경. 1회 어택에 1번. 원래 어택 대상 유닛은 《블로커》 발동 불가. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="선제공격" />,
              timing: "대미지 스텝",
              desc: "《선제공격》: 배틀 시 상대보다 먼저 배틀 대미지 부여. 이 대미지로 상대 유닛/베이스가 파괴되면 반격 대미지를 받지 않음. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="고기동" />,
              timing: "어택하는 동안 상시",
              desc: "《고기동》: 이 유닛이 어택하는 동안, 상대 유닛은 《블로커》를 발동할 수 없다. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="제압" />,
              timing: "플레이어 어택 시",
              desc: "《제압》: 실드에 배틀 대미지를 줄 때 위에서 2개 실드에 동시 대미지. 실드 1개뿐이면 1개만. 동시 파괴된 두 실드 모두에 【버스트】가 있으면 소유자가 처리 순서 결정. 한 유닛이 다수 보유 불가.",
            },
          ].map((kw, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {kw.badge}
                <span className="text-xs text-muted-foreground">
                  {kw.timing}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {kw.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 키워드 (트리거) ── */}
      <Section title="키워드 (트리거)">
        <div className="flex flex-col gap-3">
          {[
            {
              badge: <TBadge name="기동･메인" />,
              desc: "자신의 메인 페이즈(유닛 어택 중 제외)에 조건을 만족해 발동하는 기동 효과.",
            },
            {
              badge: <TBadge name="기동･액션" />,
              desc: "액션 스텝에 조건을 만족해 발동하는 기동 효과.",
            },
            {
              badge: <TBadge name="메인" />,
              desc: "커맨드 카드 전용. 자신의 메인 페이즈(어택 중 제외)에 플레이해 커맨드 효과 발동.",
            },
            {
              badge: <TBadge name="액션" />,
              desc: "커맨드 카드 전용. 액션 스텝에 플레이해 커맨드 효과 발동. 【파일럿】 보유 커맨드 카드는 액션 타이밍에 파일럿으로 세트 불가.",
            },
            {
              badge: <TBadge name="버스트" />,
              desc: "실드가 파괴되어 앞면이 되었을 때, 코스트 없이 효과 발동 가능. 발동 여부는 선택. 트래시에 놓이기 전에 발동. 【버스트】 효과는 다른 유발 효과보다 최우선으로 처리.",
            },
            {
              badge: <TBadge name="배치 시" />,
              desc: "카드가 배치되었을 때 발동.",
            },
            {
              badge: <TBadge name="어택 시" />,
              desc: "유닛이 어택 스텝에 어택을 선언했을 때 발동.",
            },
            {
              badge: <TBadge name="파괴 시" />,
              desc: "유닛/베이스가 배틀 또는 효과로 파괴되어 트래시에 놓였을 때 발동. 트래시에서 발동. 카드 상태는 파괴 직전 필드 상태를 참조.",
            },
            {
              badge: <TBadge name="세트 시" />,
              desc: "유닛에 파일럿이 세트되었을 때 발동. 「【세트 시•조건】」 형식으로 조건 지정 가능.",
            },
            {
              badge: <TBadge name="세트 중" />,
              desc: "파일럿이 세트되어 있는 동안 효과를 가짐. 「【세트 중•조건】」 형식으로 조건(특징 등) 지정 가능.",
            },
            {
              badge: <TBadge name="링크 시" />,
              desc: "링크 조건을 만족하는 파일럿이 세트되었을 때 발동.",
            },
            {
              badge: <TBadge name="링크 중" />,
              desc: "링크 조건을 만족하는 파일럿이 세트되어 있는 동안 효과를 가짐.",
            },
            {
              badge: <TBadge name="턴 1회" />,
              desc: "그 턴 중 1번만 발동 가능. 같은 효과를 가진 카드가 여러 장 있어도 각각 1번씩 발동 가능.",
            },
          ].map((kw, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div>{kw.badge}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {kw.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 효과 종류 ── */}
      <Section title="효과의 종류와 해결">
        <div className="flex flex-col gap-2 text-xs">
          {[
            {
              name: "상시 효과",
              desc: "항상 발동 중. 유발 대기 없이 해당 영역에 나온 즉시 적용. 모순되는 상시 효과가 여럿이면 금지 효과 우선.",
            },
            {
              name: "유발 효과",
              desc: "특정 사건 발생 시 자동으로 유발. 동시 유발 시 턴 플레이어 효과를 먼저 해결. 새로운 효과가 유발되면 새것을 먼저 해결. 【버스트】 효과는 최우선 처리.",
            },
            {
              name: "기동 효과",
              desc: "플레이어가 임의로 발동. 「조건 : 효과」 형식. 모든 조건 만족 시 효과 발동.",
            },
            {
              name: "커맨드 효과",
              desc: "커맨드 카드를 지정 타이밍에 플레이해 발동. 대상 선택 불가 시 플레이 불가.",
            },
            {
              name: "치환 효과",
              desc: "「(A)하는 대신 (B)한다」 형식. 사건 A를 사건 B로 대체.",
            },
          ].map((e) => (
            <div key={e.name} className="rounded border p-2">
              <p className="font-semibold mb-0.5">{e.name}</p>
              <p className="text-muted-foreground leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
        <Note>
          「한다」→ 가능한 한 처리.　「해도 좋다」→ 발동 여부 선택 가능.{"\n"}
          「그렇게 했다면」→ 앞 문장 미해결 시 뒷 문장 해결 불가.　「그 후」→ 앞 문장 결과 무관하게 뒷 문장 해결 가능.
        </Note>
      </Section>

      {/* ── 주요 용어 ── */}
      <Section title="주요 용어 정리">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            {
              term: "액티브 / 레스트",
              def: "카드를 세로로 놓은 상태 / 가로로 놓은 상태. 필드·리소스 에어리어·베이스 존 카드에 적용.",
            },
            {
              term: "배치",
              def: "유닛이나 베이스를 필드에 놓는 것.",
            },
            {
              term: "세트",
              def: "파일럿 카드(또는 【파일럿】 커맨드)가 유닛 아래에 겹쳐지는 것.",
            },
            {
              term: "파괴",
              def: "HP ≥ 대미지 or 효과로 필드에서 트래시로 이동. 실드 파괴 시 앞면으로 해 【버스트】 확인 후 트래시.",
            },
            {
              term: "제외",
              def: "어느 영역에서 제외 에어리어로 이동. 파괴와 다름.",
            },
            {
              term: "버리다",
              def: "패에서 트래시로 이동.",
            },
            {
              term: "드로우",
              def: "덱 맨 위의 카드를 비공개로 자신의 패에 더하는 것.",
            },
            {
              term: "플레이",
              def: "패의 카드를 공개하고 코스트를 지불해 사용하는 것.",
            },
            {
              term: "회복",
              def: "유닛/베이스의 대미지 카운터를 지정 수만큼 제거. HP 이상으로 회복되지는 않음.",
            },
            {
              term: "배틀 대미지 / 효과 대미지",
              def: "배틀 결과로 발생하는 대미지 / 카드 효과로 발생하는 대미지.",
            },
            {
              term: "턴 플레이어",
              def: "현재 진행 중인 턴의 플레이어.",
            },
            {
              term: "/ (슬래시)",
              def: "특징 등에서 사용 시 「또는」의 의미. 예: 〔지온〕/〔네오지온〕 = 둘 중 하나.",
            },
          ].map((e) => (
            <div key={e.term} className="rounded border p-2">
              <p className="font-semibold mb-0.5">{e.term}</p>
              <p className="text-muted-foreground leading-relaxed">{e.def}</p>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-xs text-muted-foreground text-center">
        건담 카드 게임 종합 규칙 Ver. 1.4.1 (2026년 1월 16일 원문 기준)
      </p>
    </div>
  );
}
