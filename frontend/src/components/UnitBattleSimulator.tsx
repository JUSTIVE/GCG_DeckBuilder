import { useReducer, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DualPlayfield, type DualBoardState, type DualAccent } from "@/components/DualPlayfield";
import { MiniCard } from "@/components/MiniCard";
import {
  battleTransition,
  makeIdleState,
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

type RosterEntry = {
  id: number;
  presetIdx: number;
  hp: number;
  rested: boolean;
  blocker?: boolean;
};

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
  damage: 550, // 투사체 비행
  hit: 360, // 히트 애니메이션
  counter: 360, // 반격 히트 애니메이션
  clear: 600, // 파괴/돌파 표시
  end: 600,
};

// ── TargetingArrow ────────────────────────────────────────────────────────────

function TargetingArrow({
  sx,
  sy,
  ex,
  ey,
  show,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  show: boolean;
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
        x1={sx}
        y1={sy}
        x2={exA}
        y2={eyA}
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
  sx,
  sy,
  ex,
  ey,
  animKey,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  animKey: number;
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
  const [fsmState, dispatch] = useReducer(
    battleTransition,
    null,
    (): BattleFSM => makeIdleState(myUnit.hp, UNIT_PRESETS[INIT_ENEMY_PRESET].hp),
  );

  // ADT 구조 분해: 각 variant에서 필요한 데이터만 접근
  const { phase, board } = fsmState;
  const battle = fsmState.phase !== "idle" ? fsmState.battle : null;
  const isRunning = fsmState.phase !== "idle";
  const turnBanner = fsmState.phase === "idle" ? fsmState.turnBanner : null;
  const battleDone = fsmState.phase === "idle" ? fsmState.battleDone : false;

  // ── DOM refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const myBattleRef = useRef<HTMLDivElement>(null);
  const enemyBattleRef = useRef<HTMLDivElement>(null);
  const battleZoneRef = useRef<HTMLDivElement>(null);
  // idle 전이 후에도 마지막 snap에 접근하기 위한 ref (battleDone 처리용)
  const snapRef = useRef(battle?.snap ?? null);
  if (battle) snapRef.current = battle.snap;
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
        if (fsmState.phase !== "attack") return;
        const isEnemy = fsmState.battle.snap.attackDir === "enemy";
        const blockerCoords = isEnemy
          ? measureCoords(enemyBattleRef, myBattleRef.current)
          : measureCoords(myBattleRef, enemyBattleRef.current);
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
        if (fsmState.phase !== "action") return;
        const snap = fsmState.battle.snap;
        const cr = containerRef.current;
        let projCoords: Coords;
        if (snap.attackDir === "enemy") {
          const p1ShieldEl = cr?.querySelector('[data-target="p1-shield"]');
          projCoords = measureCoords(enemyBattleRef, p1ShieldEl ?? null);
        } else {
          const shieldEl = cr?.querySelector('[data-target="p2-shield"]');
          projCoords = snap.wasBlocker
            ? measureCoords(myBattleRef, enemyBattleRef.current)
            : measureCoords(myBattleRef, shieldEl ?? null);
        }
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
    if (!turnBanner) return;

    // 상대 턴: 1500ms 후 첫 유닛 어택 (언레스트는 버튼 클릭 시 이미 처리됨)
    if (turnBanner === "opponent") {
      const t = setTimeout(() => {
        const attacker = enemyRoster.find((e) => !e.rested);
        if (attacker && !board.myDefeated) {
          handleEnemyRun(attacker);
        } else {
          dispatch({ type: "TURN_BANNER_TICK" });
        }
      }, 1500);
      return () => clearTimeout(t);
    }

    // 내 턴: 1200ms 후 내 유닛만 언레스트 (상대 유닛은 상대 턴 시작 시 언레스트)
    if (turnBanner === "mine") {
      const t = setTimeout(() => {
        dispatch({ type: "TURN_BANNER_TICK" });
        setMyRoster((prev) => prev.map((e) => ({ ...e, rested: false })));
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [turnBanner]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 배틀 종료 후 로스터 정리 ──
  useEffect(() => {
    if (!battleDone) return;
    const finalMyHp = board.myHp;
    const finalEnemyHp = board.enemyHp;
    const prevSnap = snapRef.current;
    if (!prevSnap) return;

    // 상대 어택 종료: 공격한 적 유닛 레스트 처리, turnBanner는 FSM이 "mine"으로 설정
    if (prevSnap.attackDir === "enemy") {
      setEnemyRoster((prev) => prev.map((e, i) => (i === 0 ? { ...e, rested: true } : e)));
      dispatch({ type: "CLEANUP_DONE", myHp: finalMyHp, enemyHp: finalEnemyHp });
      return;
    }

    // 내 어택 종료
    let newMyHp = finalMyHp;
    let newEnemyHp = finalEnemyHp;

    if (finalMyHp <= 0) {
      setMyRoster((prev) => {
        const next = prev.slice(1);
        if (next.length > 0) newMyHp = UNIT_PRESETS[next[0].presetIdx].hp;
        return next;
      });
    } else {
      setMyRoster((prev) => prev.map((e, i) => (i === 0 ? { ...e, rested: true } : e)));
    }

    if (prevSnap.wasBlocker && finalEnemyHp <= 0) {
      setEnemyRoster((prev) => {
        const next = prev.slice(1);
        if (next.length > 0) newEnemyHp = UNIT_PRESETS[next[0].presetIdx].hp;
        return next;
      });
    }

    dispatch({ type: "CLEANUP_DONE", myHp: newMyHp, enemyHp: newEnemyHp });
  }, [battleDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 어택 버튼 핸들러 ──
  function handleRun() {
    if (isRunning || myRoster.length === 0 || board.myHp <= 0) return;

    // 블로커 랜덤 선택 (《고기동》이면 블로커 무효)
    const allBlockers = hasHighMobility ? [] : enemyRoster.filter((e) => e.blocker);
    let chosenBlockerLabel = "";
    const wasBlocker = allBlockers.length > 0;
    let activeEnemyEntry: RosterEntry | undefined = wasBlocker ? allBlockers[0] : undefined;

    if (allBlockers.length > 1) {
      const chosen = allBlockers[Math.floor(Math.random() * allBlockers.length)];
      chosenBlockerLabel = UNIT_PRESETS[chosen.presetIdx].label;
      // 선택된 블로커를 로스터 앞으로 이동
      setEnemyRoster((prev) => [chosen, ...prev.filter((e) => e.id !== chosen.id)]);
      activeEnemyEntry = chosen;
    }

    const myPreset = UNIT_PRESETS[myRoster[0].presetIdx];
    const myMaxHp = board.myHp;
    const myAp = myPreset.ap;
    const enemyMaxHp = wasBlocker ? UNIT_PRESETS[activeEnemyEntry!.presetIdx].hp : board.enemyHp;
    const enemyAp = wasBlocker ? UNIT_PRESETS[activeEnemyEntry!.presetIdx].ap : 0;

    // 공격 유닛을 미리 레스트 처리 — end→idle 전이 시 roster.rested가 false인 프레임 방지
    setMyRoster((prev) => prev.map((e, i) => (i === 0 ? { ...e, rested: true } : e)));

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
        initShields: board.enemyShields,
        initBaseHp: board.enemyBaseHp,
        initHasBase: board.enemyHasBase,
        chosenBlockerLabel,
        attackDir: "mine",
      },
    });
  }

  // ── 리셋 핸들러 ──
  function handleReset() {
    setMyRoster([
      { id: 0, presetIdx: INIT_MY_PRESET, hp: UNIT_PRESETS[INIT_MY_PRESET].hp, rested: false },
    ]);
    setEnemyRoster([
      {
        id: 1,
        presetIdx: INIT_ENEMY_PRESET,
        hp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp,
        rested: false,
      },
    ]);
    idRef.current = 2;
    dispatch({
      type: "RESET",
      myHp: UNIT_PRESETS[INIT_MY_PRESET].hp,
      enemyHp: UNIT_PRESETS[INIT_ENEMY_PRESET].hp,
    });
  }

  // ── 상대 어택 핸들러 (상대 턴에 자동 호출) ──
  function handleEnemyRun(attacker: RosterEntry) {
    if (isRunning) return;
    const preset = UNIT_PRESETS[attacker.presetIdx];
    const cr = containerRef.current;
    const p1ShieldEl = cr?.querySelector('[data-target="p1-shield"]') ?? null;
    const shieldCoords = measureCoords(enemyBattleRef, p1ShieldEl);
    dispatch({
      type: "RUN",
      snap: {
        myAp: preset.ap,
        enemyAp: 0,
        myMaxHp: preset.hp,
        enemyMaxHp: board.myHp,
        afterMyHp: preset.hp,
        afterEnemyHp: board.myHp,
        wasBlocker: false,
        hasFirstStrike: false,
        hasHighMobility: false,
        breakthroughN: 0,
        hasBurst: false,
        shieldCoords,
        burstFrom: { x: 0, y: 0 },
        initShields: board.myShields,
        initBaseHp: board.myBaseHp,
        initHasBase: board.myHasBase,
        chosenBlockerLabel: "",
        attackDir: "enemy",
      },
    });
  }

  // ── 파생값 ──
  const displayPhase = toDisplayPhase(phase);
  const phaseIdx = PHASE_STEPS.findIndex((s) => s.key === displayPhase);
  const allMyRested = myRoster.length > 0 && myRoster.every((e) => e.rested);
  const isNextTurnRunning = turnBanner !== null;

  function cardScale(n: number) {
    if (n === 0) return 1;
    const available = battleZoneW - 4;
    const fit = available / (n * 64 + (n - 1) * 2);
    return Math.min(1, fit);
  }

  const attackDir = battle?.snap.attackDir ?? "mine";

  const p1Board: DualBoardState = {
    shieldCount: board.myShields,
    hasBase: board.myHasBase,
    baseHp: board.myHasBase ? board.myBaseHp : undefined,
  };
  const p2Board: DualBoardState = {
    shieldCount: board.enemyShields,
    hasBase: board.enemyHasBase,
    baseHp: board.enemyHasBase ? board.enemyBaseHp : undefined,
  };

  // ── 필드 하이라이트 (파생 상태) ──
  const snap = battle?.snap ?? null;
  const isBattleActive = phase !== "idle" && phase !== "action" && phase !== "end";

  // p2 타격 대상: snap이 있으면 타격 대상을 전 페이즈에 걸쳐 일관 적용
  const p2Target: DualAccent = (() => {
    if (!snap) return null;
    if (snap.wasBlocker) return "battle"; // 블로커 유닛 전투
    if (snap.initHasBase) return "base"; // 베이스 직접 타격
    if (snap.initShields > 0) return "shield"; // 실드 직접 타격
    return null;
  })();

  // p1 (내 유닛 배틀존): 전투 진행 중에만 "battle"
  const accent: DualAccent = isBattleActive && !battle?.breakthroughFired ? "battle" : null;

  // p2: 돌파 발동 후엔 돌파 대상, 그 전엔 타격 대상
  const p2BreakthroughAccent: DualAccent = (() => {
    if (!isBattleActive) return null;
    if (battle?.breakthroughFired) {
      return battle.breakthroughTarget === "base" ? "base" : "shield";
    }
    return p2Target;
  })();

  // ── 버스트 키프레임 ──
  const { x: fx, y: fy } = battle?.burstFrom ?? { x: 54, y: 8 };
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
        @keyframes defeat-pop {
          0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(2deg); opacity: 1; }
          80%  { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
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
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-1 px-1 py-0.5 rounded",
                        idx === 0 ? "bg-blue-50 border border-blue-200" : "bg-muted/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex-1 truncate",
                          idx === 0 ? "font-semibold text-blue-700" : "text-muted-foreground",
                        )}
                      >
                        {idx === 0 ? "▶ " : ""}
                        {UNIT_PRESETS[entry.presetIdx].label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMyRoster((prev) => prev.filter((e) => e.id !== entry.id))}
                        disabled={isRunning}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-40 leading-none"
                      >
                        ×
                      </button>
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
                  disabled={isRunning}
                  className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
                >
                  {UNIT_PRESETS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setMyRoster((prev) => [
                      ...prev,
                      {
                        id: idRef.current++,
                        presetIdx: addMyPreset,
                        hp: UNIT_PRESETS[addMyPreset].hp,
                        rested: false,
                      },
                    ])
                  }
                  disabled={isRunning || myRoster.length >= 6}
                  className="px-2 py-0.5 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 font-bold"
                >
                  +
                </button>
              </div>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasFirstStrike}
                  onChange={(e) => setHasFirstStrike(e.target.checked)}
                  disabled={isRunning}
                  className="accent-blue-500"
                />
                <span className="text-muted-foreground">《선제공격》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasHighMobility}
                  onChange={(e) => setHasHighMobility(e.target.checked)}
                  disabled={isRunning}
                  className="accent-blue-500"
                />
                <span className="text-muted-foreground">《고기동》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <span className="text-muted-foreground">《돌파》:</span>
                <select
                  value={breakthroughN}
                  onChange={(e) => setBreakthroughN(Number(e.target.value))}
                  disabled={isRunning}
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
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-1 px-1 py-0.5 rounded",
                        idx === 0 ? "bg-red-50 border border-red-200" : "bg-muted/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex-1 truncate",
                          idx === 0 ? "font-semibold text-red-700" : "text-muted-foreground",
                        )}
                      >
                        {idx === 0 ? "▶ " : ""}
                        {UNIT_PRESETS[entry.presetIdx].label}
                      </span>
                      {entry.blocker && (
                        <span className="text-[8px] bg-red-200 text-red-800 rounded px-0.5 leading-tight shrink-0">
                          블로커
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setEnemyRoster((prev) => prev.filter((e) => e.id !== entry.id))
                        }
                        disabled={isRunning}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-40 leading-none"
                      >
                        ×
                      </button>
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
                  disabled={isRunning}
                  className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
                >
                  {UNIT_PRESETS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setEnemyRoster((prev) => [
                      ...prev,
                      {
                        id: idRef.current++,
                        presetIdx: addEnemyPreset,
                        hp: UNIT_PRESETS[addEnemyPreset].hp,
                        rested: false,
                        blocker: addWithBlocker,
                      },
                    ])
                  }
                  disabled={isRunning || enemyRoster.length >= 6}
                  className="px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 font-bold"
                >
                  +
                </button>
              </div>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addWithBlocker}
                  onChange={(e) => setAddWithBlocker(e.target.checked)}
                  className="accent-red-500"
                />
                <span className="text-muted-foreground">추가 시 《블로커》</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasBurst}
                  onChange={(e) => setHasBurst(e.target.checked)}
                  disabled={isRunning}
                  className="accent-red-500"
                />
                <span className="text-muted-foreground">실드에 《버스트》</span>
              </label>
            </div>
          </div>

          {/* ── DualPlayfield ── */}
          <div className="relative" ref={containerRef}>
            {board.enemyDefeated && (
              <>
                <div
                  className="absolute inset-0 top-0 bottom-1/2 z-20 flex items-center justify-center pointer-events-none"
                  style={{ animation: "defeat-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
                >
                  <span className="text-2xl font-black text-rose-500 drop-shadow-lg select-none">
                    ☠ 패배
                  </span>
                </div>
                <div
                  className="absolute inset-0 top-1/2 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                  style={{
                    animation: "defeat-pop 0.45s 0.12s cubic-bezier(0.34,1.56,0.64,1) both",
                  }}
                >
                  <span className="text-2xl font-black text-emerald-500 drop-shadow-lg select-none">
                    ★ 승리
                  </span>
                </div>
              </>
            )}
            {board.myDefeated && (
              <>
                <div
                  className="absolute inset-0 top-0 bottom-1/2 z-20 flex items-center justify-center pointer-events-none"
                  style={{ animation: "defeat-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
                >
                  <span className="text-2xl font-black text-emerald-500 drop-shadow-lg select-none">
                    ★ 승리
                  </span>
                </div>
                <div
                  className="absolute inset-0 top-1/2 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                  style={{
                    animation: "defeat-pop 0.45s 0.12s cubic-bezier(0.34,1.56,0.64,1) both",
                  }}
                >
                  <span className="text-2xl font-black text-rose-500 drop-shadow-lg select-none">
                    ☠ 패배
                  </span>
                </div>
              </>
            )}
            <div
              className={cn(
                "transition-all duration-500",
                (board.enemyDefeated || board.myDefeated) && "opacity-30",
              )}
            >
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
                    <div
                      ref={battleZoneRef}
                      className="w-full h-full flex items-center justify-start gap-0.5 px-0.5 overflow-hidden"
                    >
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
                                hp={isActive ? board.myHp : p.hp}
                                maxHp={p.hp}
                                color="blue"
                                rested={
                                  isActive && battle !== null ? battle.myRested : entry.rested
                                }
                                attacking={
                                  isActive
                                    ? (battle?.myAttacking ?? false) && attackDir === "mine"
                                    : false
                                }
                                attackDir={-1}
                                hit={isActive ? (battle?.myHit ?? false) : false}
                                destroyed={isActive ? (battle?.myDestroyed ?? false) : false}
                                tag={
                                  isActive
                                    ? [
                                        hasFirstStrike ? "선제" : "",
                                        hasHighMobility ? "고기동" : "",
                                        breakthroughN > 0 ? `돌파${breakthroughN}` : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ") || undefined
                                    : undefined
                                }
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
                                hp={isActive ? board.enemyHp : p.hp}
                                maxHp={p.hp}
                                color="red"
                                rested={
                                  isActive && battle !== null
                                    ? attackDir === "enemy"
                                      ? battle.myRested
                                      : battle.snap.wasBlocker
                                        ? battle.blockerRested
                                        : entry.rested
                                    : entry.rested
                                }
                                attacking={
                                  isActive
                                    ? (battle?.myAttacking ?? false) && attackDir === "enemy"
                                    : false
                                }
                                attackDir={1}
                                hit={isActive ? (battle?.enemyHit ?? false) : false}
                                destroyed={isActive ? (battle?.enemyDestroyed ?? false) : false}
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
            </div>

            <TargetingArrow
              sx={battle?.targetCoords.sx ?? 0}
              sy={battle?.targetCoords.sy ?? 0}
              ex={battle?.targetCoords.ex ?? 0}
              ey={battle?.targetCoords.ey ?? 0}
              show={battle?.showTarget ?? false}
            />

            <AttackProjectile
              sx={battle?.projCoords.sx ?? 0}
              sy={battle?.projCoords.sy ?? 0}
              ex={battle?.projCoords.ex ?? 0}
              ey={battle?.projCoords.ey ?? 0}
              animKey={battle?.projKey ?? 0}
            />

            <BurstOverlay animKey={battle?.burstKey ?? 0} />

            {turnBanner && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div
                  className={cn(
                    "px-6 py-2 rounded-xl font-black text-base shadow-lg border-2",
                    turnBanner === "opponent"
                      ? "bg-red-500/90 text-white border-red-700"
                      : "bg-blue-500/90 text-white border-blue-700",
                  )}
                  style={{ animation: "card-appear 200ms cubic-bezier(0.22,1,0.36,1) both" }}
                >
                  {turnBanner === "opponent" ? "상대 턴" : "내 턴"}
                </div>
              </div>
            )}
          </div>

          {/* ── Breakthrough badge ── */}
          {battle?.breakthroughFired && (
            <div
              className="text-center text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-300 rounded-lg px-2 py-1.5 shadow-sm"
              style={{ animation: "breakthrough-badge 380ms cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              《돌파 {battle.snap.breakthroughN}》 발동 — 실드 {board.enemyShields}장
              {board.enemyHasBase ? ` · 베이스 HP ${board.enemyBaseHp}` : ""} 남음
            </div>
          )}

          {/* ── Controls & log ── */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              {allMyRested ? (
                <button
                  type="button"
                  onClick={() => {
                    setEnemyRoster((prev) => prev.map((e) => ({ ...e, rested: false })));
                    dispatch({ type: "NEXT_TURN" });
                  }}
                  disabled={isNextTurnRunning || isRunning}
                  className="flex-1 text-xs py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-sm"
                >
                  다음 턴 →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={
                    isRunning ||
                    board.myHp <= 0 ||
                    myRoster.length === 0 ||
                    board.enemyDefeated ||
                    board.myDefeated
                  }
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
            {board.log.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 flex flex-col gap-1 max-h-28 overflow-y-auto">
                {board.log.map((entry, i) => (
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
