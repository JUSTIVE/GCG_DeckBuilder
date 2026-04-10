import { useReducer, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DualPlayfield, type DualBoardState, type DualAccent } from "@/components/DualPlayfield";
import { MiniCard } from "@/components/MiniCard";
import {
  battleTransition,
  makeInitialCtx,
  type BattleFSM,
  type BattlePhase,
  type Coords,
} from "@/lib/battleFSM";

// ── Presets & types ───────────────────────────────────────────────────────────

const UNIT_PRESETS: Array<{ ap: number; hp: number; label: string }> = [
  { ap: 1, hp: 3, label: "AP1/HP3" },
  { ap: 2, hp: 3, label: "AP2/HP3" },
  { ap: 3, hp: 4, label: "AP3/HP4" },
  { ap: 4, hp: 5, label: "AP4/HP5" },
  { ap: 5, hp: 3, label: "AP5/HP3" },
];

type RosterEntry = { id: number; presetIdx: number; hp: number; rested: boolean; blocker?: boolean };

// PHASE_STEPS: UI 진행 표시용 (내부 sub-phase는 damage에 포함)
const PHASE_STEPS: Array<{ key: BattlePhase; label: string }> = [
  { key: "attack", label: "어택 스텝" },
  { key: "block", label: "블록 스텝" },
  { key: "action", label: "액션 스텝" },
  { key: "damage", label: "대미지 스텝" },
  { key: "end", label: "배틀 종료 스텝" },
];

// damage sub-phases를 "damage"로 매핑
function toDisplayPhase(phase: BattlePhase): BattlePhase {
  if (phase === "hit" || phase === "counter" || phase === "clear") return "damage";
  return phase;
}

// ── 페이즈별 타이머 지속 시간 (ms) ───────────────────────────────────────────
const PHASE_DURATION: Partial<Record<BattlePhase, number>> = {
  attack: 800,
  block: 800,
  action: 800,
  damage: 550,  // 투사체 비행
  hit: 360,     // 히트 애니메이션
  counter: 360, // 반격 히트 애니메이션
  clear: 600,   // 파괴/돌파 표시
  end: 600,
};

// ── TargetingArrow ────────────────────────────────────────────────────────────

function TargetingArrow({
  sx, sy, ex, ey, show,
}: {
  sx: number; sy: number; ex: number; ey: number; show: boolean;
}) {
  if (!show) return null;
  const dx = ex - sx;
  const dy = ey - sy;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 4) return null;
  const pull = 12;
  const exA = ex - (dx / length) * pull;
  const eyA = ey - (dy / length) * pull;
  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: "100%", height: "100%", zIndex: 20 }}
    >
      <defs>
        <marker id="tgt-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="rgb(249,115,22)" />
        </marker>
      </defs>
      <line
        x1={sx} y1={sy} x2={exA} y2={eyA}
        stroke="rgb(249,115,22)"
        strokeWidth="2.5"
        strokeDasharray="8 4"
        markerEnd="url(#tgt-head)"
        style={{ animation: "dash-march 0.4s linear infinite" }}
      />
    </svg>
  );
}

// ── AttackProjectile ──────────────────────────────────────────────────────────

function AttackProjectile({
  sx, sy, ex, ey, animKey,
}: {
  sx: number; sy: number; ex: number; ey: number; animKey: number;
}) {
  if (animKey === 0) return null;

  const midX = sx + (ex - sx) * 0.5;
  const midY = sy + (ey - sy) * 0.4 - 24;

  const kf = `
    @keyframes proj-fly-${animKey} {
      0%   { transform: translate(${sx}px, ${sy}px) scale(1)    rotate(0deg);   opacity: 1; }
      40%  { transform: translate(${midX}px, ${midY}px) scale(1.3) rotate(-15deg); opacity: 1; }
      78%  { transform: translate(${ex + (ex - sx) * 0.04}px, ${ey + (ey - sy) * 0.04}px) scale(1.1) rotate(5deg);  opacity: 0.9; }
      100% { transform: translate(${ex}px, ${ey}px) scale(0.4) rotate(10deg);  opacity: 0; }
    }`;

  return (
    <>
      <style>{kf}</style>
      <div
        key={animKey}
        className="absolute pointer-events-none rounded border-2 border-orange-500 bg-orange-400/80 shadow"
        style={{
          left: -12,
          top: -8,
          width: 24,
          height: 16,
          zIndex: 30,
          animation: `proj-fly-${animKey} 560ms cubic-bezier(0.25,0.1,0.25,1) forwards`,
        }}
      />
    </>
  );
}

// ── BurstOverlay ──────────────────────────────────────────────────────────────

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

// ── UnitBattleSimulator ───────────────────────────────────────────────────────

const INIT_MY_PRESET = 2;
const INIT_ENEMY_PRESET = 1;

export function UnitBattleSimulator() {
  // ── 로스터 & 옵션 (FSM 외부) ──
  const idRef = useRef(2);
  const [myRoster, setMyRoster] = useState<RosterEntry[]>([
    { id: 0, presetIdx: INIT_MY_PRESET, hp: UNIT_PRESETS[INIT_MY_PRESET].hp, rested: false },
  ]);
  const [enemyRoster, setEnemyRoster] = useState<RosterEntry[]>([
    { id: 1, presetIdx: INIT_ENEMY_PRESET, hp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp, rested: false },
  ]);
  const [addMyPreset, setAddMyPreset] = useState(INIT_MY_PRESET);
  const [addEnemyPreset, setAddEnemyPreset] = useState(INIT_ENEMY_PRESET);
  const [addWithBlocker, setAddWithBlocker] = useState(false);
  const [hasFirstStrike, setHasFirstStrike] = useState(false);
  const [hasHighMobility, setHasHighMobility] = useState(false);
  const [breakthroughN, setBreakthroughN] = useState(0);
  const [hasBurst, setHasBurst] = useState(false);

  // ── FSM ──
  const myUnit = UNIT_PRESETS[myRoster[0]?.presetIdx ?? 0];
  const [fsmState, dispatch] = useReducer(battleTransition, null, (): BattleFSM => ({
    phase: "idle",
    ctx: makeInitialCtx(myUnit.hp, UNIT_PRESETS[INIT_ENEMY_PRESET].hp),
  }));

  const { phase, ctx } = fsmState;

  // ── DOM refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const myBattleRef = useRef<HTMLDivElement>(null);
  const enemyBattleRef = useRef<HTMLDivElement>(null);
  const battleZoneRef = useRef<HTMLDivElement>(null);
  const [battleZoneW, setBattleZoneW] = useState(120);

  // ── ResizeObserver ──
  useEffect(() => {
    const el = battleZoneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBattleZoneW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── 옵션 변경 시 전체 리셋 ──
  useEffect(() => {
    dispatch({
      type: "RESET",
      myHp: myUnit.hp,
      enemyHp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFirstStrike, hasHighMobility, breakthroughN, hasBurst]);

  // ── DOM 측정 헬퍼 ──
  function measureCoords(
    fromRef: { current: HTMLDivElement | null },
    toEl: Element | null,
  ): Coords {
    const cr = containerRef.current;
    const fr = fromRef.current;
    if (!cr || !fr || !toEl) return { sx: 0, sy: 0, ex: 0, ey: 0 };
    const crRect = cr.getBoundingClientRect();
    const frRect = fr.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    return {
      sx: (frRect.left + frRect.right) / 2 - crRect.left,
      sy: (frRect.top + frRect.bottom) / 2 - crRect.top,
      ex: (toRect.left + toRect.right) / 2 - crRect.left,
      ey: (toRect.top + toRect.bottom) / 2 - crRect.top,
    };
  }

  function measureBurstFrom(): { x: number; y: number } {
    const cr = containerRef.current;
    const shieldEl = cr?.querySelector('[data-target="p2-shield"]');
    if (!shieldEl || !cr) return { x: 54, y: 8 };
    const sr = shieldEl.getBoundingClientRect();
    const wr = cr.getBoundingClientRect();
    return {
      x: Math.round((sr.left + sr.right) / 2 - (wr.left + wr.right) / 2),
      y: Math.round((sr.top + sr.bottom) / 2 - (wr.top + wr.bottom) / 2),
    };
  }

  // ── 페이즈 타이머 (FSM 핵심) ──
  useEffect(() => {
    // attack → block: DOM 재측정 후 BLOCK_TICK
    if (phase === "attack") {
      const t = setTimeout(() => {
        const cr = containerRef.current;
        const blockerCoords = measureCoords(
          myBattleRef,
          enemyBattleRef.current,
        );
        // 화살표는 블로커 있으면 블로커 유닛으로, 없으면 그대로
        void cr; // suppress unused warning
        dispatch({ type: "BLOCK_TICK", blockerCoords });
      }, PHASE_DURATION.attack!);
      return () => clearTimeout(t);
    }

    // block → action
    if (phase === "block") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.block!);
      return () => clearTimeout(t);
    }

    // action → damage: DOM 측정 후 DAMAGE_TICK
    if (phase === "action") {
      const t = setTimeout(() => {
        const snap = fsmState.ctx.snap;
        if (!snap) return;
        const cr = containerRef.current;
        const shieldEl = cr?.querySelector('[data-target="p2-shield"]');
        const projCoords = snap.wasBlocker
          ? measureCoords(myBattleRef, enemyBattleRef.current)
          : measureCoords(myBattleRef, shieldEl ?? null);
        dispatch({ type: "DAMAGE_TICK", projCoords });
      }, PHASE_DURATION.action!);
      return () => clearTimeout(t);
    }

    // damage → hit
    if (phase === "damage") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.damage!);
      return () => clearTimeout(t);
    }

    // hit → counter or clear
    if (phase === "hit") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.hit!);
      return () => clearTimeout(t);
    }

    // counter → clear
    if (phase === "counter") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.counter!);
      return () => clearTimeout(t);
    }

    // clear → end
    if (phase === "clear") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.clear!);
      return () => clearTimeout(t);
    }

    // end → idle (battleDone 플래그 설정)
    if (phase === "end") {
      const t = setTimeout(() => dispatch({ type: "TICK" }), PHASE_DURATION.end!);
      return () => clearTimeout(t);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 턴 배너 타이머 ──
  useEffect(() => {
    const { turnBanner } = ctx;
    if (!turnBanner) return;
    const delay = turnBanner === "opponent" ? 1500 : 1200;
    const t = setTimeout(() => {
      dispatch({ type: "TURN_BANNER_TICK" });
      // "내 턴" 배너가 끝나면 로스터 rested 플래그도 함께 초기화
      if (turnBanner === "mine") {
        setMyRoster((prev) => prev.map((e) => ({ ...e, rested: false })));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [ctx.turnBanner]);

  // ── 배틀 종료 후 로스터 정리 ──
  useEffect(() => {
    if (phase !== "idle" || !ctx.battleDone) return;
    const snap = ctx.snap;
    if (!snap) return;

    const finalMyHp = ctx.myHp;
    const finalEnemyHp = ctx.enemyHp;
    let newMyHp = finalMyHp;
    let newEnemyHp = finalEnemyHp;

    if (finalMyHp <= 0) {
      setMyRoster((prev) => {
        const next = prev.slice(1);
        if (next.length > 0) {
          newMyHp = UNIT_PRESETS[next[0].presetIdx].hp;
        }
        return next;
      });
    } else {
      setMyRoster((prev) => prev.map((e, i) => (i === 0 ? { ...e, rested: true } : e)));
    }

    if (snap.wasBlocker && finalEnemyHp <= 0) {
      setEnemyRoster((prev) => {
        const next = prev.slice(1);
        if (next.length > 0) {
          newEnemyHp = UNIT_PRESETS[next[0].presetIdx].hp;
        }
        return next;
      });
    }

    dispatch({ type: "CLEANUP_DONE", myHp: newMyHp, enemyHp: newEnemyHp });
  }, [phase, ctx.battleDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 어택 버튼 핸들러 ──
  function handleRun() {
    if (ctx.isRunning || myRoster.length === 0 || ctx.myHp <= 0) return;

    // 블로커 랜덤 선택
    const allBlockers = enemyRoster.filter((e) => e.blocker);
    let chosenBlockerLabel = "";
    let wasBlocker = allBlockers.length > 0;
    let activeEnemyEntry = enemyRoster[0]; // 기본: 첫 번째 상대 유닛

    if (allBlockers.length > 1) {
      const chosen = allBlockers[Math.floor(Math.random() * allBlockers.length)];
      chosenBlockerLabel = UNIT_PRESETS[chosen.presetIdx].label;
      // 선택된 블로커를 로스터 앞으로 이동
      setEnemyRoster((prev) => [chosen, ...prev.filter((e) => e.id !== chosen.id)]);
      activeEnemyEntry = chosen;
    } else if (allBlockers.length === 1) {
      activeEnemyEntry = allBlockers[0];
    }

    const myPreset = UNIT_PRESETS[myRoster[0].presetIdx];
    const enemyPreset = UNIT_PRESETS[activeEnemyEntry.presetIdx];
    const myMaxHp = ctx.myHp;
    const enemyMaxHp = wasBlocker ? enemyPreset.hp : ctx.enemyHp;
    const myAp = myPreset.ap;
    const enemyAp = wasBlocker ? enemyPreset.ap : 0;

    // 실드/베이스 DOM 좌표 측정
    const cr = containerRef.current;
    const shieldEl = cr?.querySelector('[data-target="p2-shield"]') ?? null;
    const shieldCoords = measureCoords(myBattleRef, shieldEl);
    const burstFrom = measureBurstFrom();

    dispatch({
      type: "RUN",
      snap: {
        myAp,
        enemyAp,
        myMaxHp,
        enemyMaxHp,
        afterMyHp: Math.max(0, myMaxHp - enemyAp),
        afterEnemyHp: Math.max(0, enemyMaxHp - myAp),
        wasBlocker,
        hasFirstStrike,
        hasHighMobility,
        breakthroughN,
        hasBurst,
        shieldCoords,
        burstFrom,
        initShields: ctx.enemyShields,
        initBaseHp: ctx.enemyBaseHp,
        initHasBase: ctx.enemyHasBase,
        chosenBlockerLabel,
      },
    });
  }

  // ── 리셋 핸들러 ──
  function handleReset() {
    setMyRoster([{ id: 0, presetIdx: INIT_MY_PRESET, hp: UNIT_PRESETS[INIT_MY_PRESET].hp, rested: false }]);
    setEnemyRoster([{ id: 1, presetIdx: INIT_ENEMY_PRESET, hp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp, rested: false }]);
    idRef.current = 2;
    dispatch({ type: "RESET", myHp: UNIT_PRESETS[INIT_MY_PRESET].hp, enemyHp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp });
  }

  // ── 파생값 ──
  const displayPhase = toDisplayPhase(phase);
  const phaseIdx = PHASE_STEPS.findIndex((s) => s.key === displayPhase);
  const allMyRested = myRoster.length > 0 && myRoster.every((e) => e.rested);
  const isNextTurnRunning = ctx.turnBanner !== null;

  function cardScale(n: number) {
    if (n === 0) return 1;
    const available = battleZoneW - 4;
    const fit = available / (n * 64 + (n - 1) * 2);
    return Math.min(1, fit);
  }

  const p1Board: DualBoardState = { shieldCount: 6, hasBase: true };
  const p2Board: DualBoardState = {
    shieldCount: ctx.enemyShields,
    hasBase: ctx.enemyHasBase,
    baseHp: ctx.enemyHasBase ? ctx.enemyBaseHp : undefined,
  };

  // ── 필드 하이라이트 (파생 상태) ──
  // phase + snap으로부터 계산. FSM에 별도 상태 불필요.
  const snap = ctx.snap;
  const isBattleActive = phase !== "idle" && phase !== "action" && phase !== "end";

  // p2 타격 대상: snap이 있으면 타격 대상을 전 페이즈에 걸쳐 일관 적용
  const p2Target: DualAccent = (() => {
    if (!snap) return null;
    if (snap.wasBlocker) return "battle";               // 블로커 유닛 전투
    if (snap.initHasBase) return "base";                // 베이스 직접 타격
    if (snap.initShields > 0) return "shield";          // 실드 직접 타격
    return null;
  })();

  // p1 (내 유닛 배틀존): 전투 진행 중에만 "battle"
  const accent: DualAccent =
    (isBattleActive && !ctx.breakthroughFired) ? "battle" : null;

  // p2: 돌파 발동 후엔 돌파 대상, 그 전엔 타격 대상
  const p2BreakthroughAccent: DualAccent = (() => {
    if (!isBattleActive) return null;
    if (ctx.breakthroughFired) {
      return ctx.breakthroughTarget === "base" ? "base" : "shield";
    }
    return p2Target;
  })();

  // ── 버스트 키프레임 ──
  const { x: fx, y: fy } = ctx.burstFrom;
  const arcX = Math.round(fx * 0.45);
  const arcY = Math.round(fy - 30);
  const burstCardKeyframe = `
    @keyframes burst-card-fly {
      0%   { transform: translate(${fx}px, ${fy}px) rotate(-14deg) scale(0.8);  opacity: 1; }
      30%  { transform: translate(${arcX}px, ${arcY}px) rotate(-5deg)  scale(0.92); opacity: 1; }
      58%  { transform: translate(4px, -6px)  rotate(3deg)   scale(1.05); opacity: 1; }
      72%  { transform: translate(0, 0)       rotate(-1deg)  scale(1.15); opacity: 1; }
      86%  { transform: translate(0, 0)       scale(1.35);               opacity: 0.6; }
      100% { transform: translate(0, 0)       scale(0);                  opacity: 0; }
    }`;

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
        @keyframes dash-march {
          to { stroke-dashoffset: -24; }
        }
        @keyframes breakthrough-badge {
          0%   { transform: scale(0.5) translateY(4px); opacity: 0; }
          55%  { transform: scale(1.1) translateY(-1px); opacity: 1; }
          75%  { transform: scale(0.97); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        ${burstCardKeyframe}
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
        {/* ── Header ── */}
        <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
          <span className="text-xs font-bold">어택 시뮬레이터</span>
        </div>

        {/* ── Phase progress ── */}
        <div className="flex items-center px-3 pt-2 pb-1 border-b gap-0 overflow-hidden">
          {PHASE_STEPS.map((s, i) => {
            const done = phaseIdx > i;
            const active = phaseIdx === i;
            return (
              <div key={s.key} className="flex items-center min-w-0">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px min-w-[6px] max-w-[20px] flex-1 transition-colors duration-300",
                      done || active ? "bg-orange-400" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "shrink-0 text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap transition-all duration-300",
                    active
                      ? "bg-orange-500 text-white font-bold shadow-sm"
                      : done
                        ? "bg-orange-100 text-orange-600"
                        : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-3 flex flex-col gap-3">
          {/* ── Config ── */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {/* 내 유닛 */}
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-blue-600">내 유닛 (어택)</span>
              {myRoster.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {myRoster.map((entry, idx) => (
                    <div key={entry.id} className={cn("flex items-center gap-1 px-1 py-0.5 rounded", idx === 0 ? "bg-blue-50 border border-blue-200" : "bg-muted/30")}>
                      <span className={cn("flex-1 truncate", idx === 0 ? "font-semibold text-blue-700" : "text-muted-foreground")}>
                        {idx === 0 ? "▶ " : ""}{UNIT_PRESETS[entry.presetIdx].label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMyRoster((prev) => prev.filter((e) => e.id !== entry.id))}
                        disabled={ctx.isRunning}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-40 leading-none"
                      >×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">유닛 없음</div>
              )}
              <div className="flex gap-1">
                <select
                  value={addMyPreset}
                  onChange={(e) => setAddMyPreset(Number(e.target.value))}
                  disabled={ctx.isRunning}
                  className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
                >
                  {UNIT_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMyRoster((prev) => [...prev, { id: idRef.current++, presetIdx: addMyPreset, hp: UNIT_PRESETS[addMyPreset].hp, rested: false }])}
                  disabled={ctx.isRunning || myRoster.length >= 6}
                  className="px-2 py-0.5 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 font-bold"
                >+</button>
              </div>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={hasFirstStrike} onChange={(e) => setHasFirstStrike(e.target.checked)} disabled={ctx.isRunning} className="accent-blue-500" />
                <span className="text-muted-foreground">《선제공격》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={hasHighMobility} onChange={(e) => setHasHighMobility(e.target.checked)} disabled={ctx.isRunning} className="accent-blue-500" />
                <span className="text-muted-foreground">《고기동》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <span className="text-muted-foreground">《돌파》:</span>
                <select
                  value={breakthroughN}
                  onChange={(e) => setBreakthroughN(Number(e.target.value))}
                  disabled={ctx.isRunning}
                  className="border rounded px-1 text-[10px] bg-background disabled:opacity-50"
                >
                  <option value={0}>없음</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>

            {/* 상대 유닛 */}
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-red-600">상대 유닛</span>
              {enemyRoster.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {enemyRoster.map((entry, idx) => (
                    <div key={entry.id} className={cn("flex items-center gap-1 px-1 py-0.5 rounded", idx === 0 ? "bg-red-50 border border-red-200" : "bg-muted/30")}>
                      <span className={cn("flex-1 truncate", idx === 0 ? "font-semibold text-red-700" : "text-muted-foreground")}>
                        {idx === 0 ? "▶ " : ""}{UNIT_PRESETS[entry.presetIdx].label}
                      </span>
                      {entry.blocker && <span className="text-[8px] bg-red-200 text-red-800 rounded px-0.5 leading-tight shrink-0">블로커</span>}
                      <button
                        type="button"
                        onClick={() => setEnemyRoster((prev) => prev.filter((e) => e.id !== entry.id))}
                        disabled={ctx.isRunning}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-40 leading-none"
                      >×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">유닛 없음</div>
              )}
              <div className="flex gap-1">
                <select
                  value={addEnemyPreset}
                  onChange={(e) => setAddEnemyPreset(Number(e.target.value))}
                  disabled={ctx.isRunning}
                  className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
                >
                  {UNIT_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setEnemyRoster((prev) => [...prev, { id: idRef.current++, presetIdx: addEnemyPreset, hp: UNIT_PRESETS[addEnemyPreset].hp, rested: false, blocker: addWithBlocker }])}
                  disabled={ctx.isRunning || enemyRoster.length >= 6}
                  className="px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 font-bold"
                >+</button>
              </div>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={addWithBlocker} onChange={(e) => setAddWithBlocker(e.target.checked)} className="accent-red-500" />
                <span className="text-muted-foreground">추가 시 《블로커》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={hasBurst} onChange={(e) => setHasBurst(e.target.checked)} disabled={ctx.isRunning} className="accent-red-500" />
                <span className="text-muted-foreground">실드에 《버스트》</span>
              </label>
            </div>
          </div>

          {/* ── DualPlayfield ── */}
          <div className="relative" ref={containerRef}>
            <DualPlayfield
              p1={p1Board}
              p2={p2Board}
              p1Label="나 (어택)"
              p2Label="상대"
              accent={accent}
              p2Accent={p2BreakthroughAccent}
              p1Battle={(() => {
                const n = myRoster.length;
                const s = cardScale(n);
                const w = Math.round(64 * s);
                const h = Math.round(89 * s);
                return (
                  <div ref={battleZoneRef} className="w-full h-full flex items-center justify-start gap-0.5 px-0.5 overflow-hidden">
                    {myRoster.map((entry, idx) => {
                      const p = UNIT_PRESETS[entry.presetIdx];
                      const isActive = idx === 0;
                      return (
                        <div
                          key={entry.id}
                          ref={isActive ? myBattleRef : undefined}
                          className="shrink-0 overflow-visible"
                          style={{ width: w, height: h }}
                        >
                          <div style={{ transform: `scale(${s})`, transformOrigin: "top left" }}>
                            <MiniCard
                              name={isActive ? "나" : p.label}
                              ap={p.ap}
                              hp={isActive ? ctx.myHp : p.hp}
                              maxHp={p.hp}
                              color="blue"
                              rested={isActive ? ctx.myRested : entry.rested}
                              attacking={isActive ? ctx.myAttacking : false}
                              attackDir={-1}
                              hit={isActive ? ctx.myHit : false}
                              destroyed={isActive ? ctx.myDestroyed : false}
                              tag={isActive ? ([hasFirstStrike ? "선제" : "", hasHighMobility ? "고기동" : "", breakthroughN > 0 ? `돌파${breakthroughN}` : ""].filter(Boolean).join(" ") || undefined) : undefined}
                              highlight={isActive && displayPhase === "damage"}
                              dim={!isActive}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              p2Battle={(() => {
                const n = enemyRoster.length;
                const s = cardScale(n);
                const w = Math.round(64 * s);
                const h = Math.round(89 * s);
                return (
                  <div className="w-full h-full flex items-center justify-end gap-0.5 px-0.5 overflow-hidden">
                    {[...enemyRoster].reverse().map((entry, revIdx) => {
                      const idx = enemyRoster.length - 1 - revIdx;
                      const p = UNIT_PRESETS[entry.presetIdx];
                      const isActive = idx === 0;
                      return (
                        <div
                          key={entry.id}
                          ref={isActive ? enemyBattleRef : undefined}
                          className="shrink-0 overflow-visible"
                          style={{ width: w, height: h }}
                        >
                          <div style={{ transform: `scale(${s})`, transformOrigin: "top left" }}>
                            <MiniCard
                              name={isActive ? "상대" : p.label}
                              ap={p.ap}
                              hp={isActive ? ctx.enemyHp : p.hp}
                              maxHp={p.hp}
                              color="red"
                              rested={isActive ? ctx.blockerRested : false}
                              attackDir={1}
                              hit={isActive ? ctx.enemyHit : false}
                              destroyed={isActive ? ctx.enemyDestroyed : false}
                              tag={entry.blocker ? "블로커" : undefined}
                              dim={!isActive}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            />

            <TargetingArrow
              sx={ctx.targetCoords.sx}
              sy={ctx.targetCoords.sy}
              ex={ctx.targetCoords.ex}
              ey={ctx.targetCoords.ey}
              show={ctx.showTarget}
            />

            <AttackProjectile
              sx={ctx.projCoords.sx}
              sy={ctx.projCoords.sy}
              ex={ctx.projCoords.ex}
              ey={ctx.projCoords.ey}
              animKey={ctx.projKey}
            />

            <BurstOverlay animKey={ctx.burstKey} />

            {ctx.turnBanner && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div
                  className={cn(
                    "px-6 py-2 rounded-xl font-black text-base shadow-lg border-2",
                    ctx.turnBanner === "opponent"
                      ? "bg-red-500/90 text-white border-red-700"
                      : "bg-blue-500/90 text-white border-blue-700",
                  )}
                  style={{ animation: "card-appear 200ms cubic-bezier(0.22,1,0.36,1) both" }}
                >
                  {ctx.turnBanner === "opponent" ? "상대 턴" : "내 턴"}
                </div>
              </div>
            )}
          </div>

          {/* ── Breakthrough badge ── */}
          {ctx.breakthroughFired && (
            <div
              className="text-center text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-300 rounded-lg px-2 py-1.5 shadow-sm"
              style={{ animation: "breakthrough-badge 380ms cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              《돌파 {ctx.snap?.breakthroughN ?? breakthroughN}》 발동 — 실드 {ctx.enemyShields}장{ctx.enemyHasBase ? ` · 베이스 HP ${ctx.enemyBaseHp}` : ""} 남음
            </div>
          )}

          {/* ── Controls & log ── */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              {allMyRested ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "NEXT_TURN" })}
                  disabled={isNextTurnRunning}
                  className="flex-1 text-xs py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-sm"
                >
                  다음 턴 →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={ctx.isRunning || ctx.myHp <= 0 || myRoster.length === 0}
                  className="flex-1 text-xs py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-sm"
                >
                  어택!
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/40 active:scale-95 transition-all text-muted-foreground"
              >
                ↺
              </button>
            </div>
            {ctx.log.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 flex flex-col gap-1 max-h-28 overflow-y-auto">
                {ctx.log.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 text-[11px]",
                      i === 0 ? "text-foreground font-semibold" : "text-muted-foreground",
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
      </div>
    </>
  );
}
