import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DualPlayfield, type DualBoardState, type DualAccent } from "@/components/DualPlayfield";
import { MiniCard } from "@/components/MiniCard";

// ── Presets & types ───────────────────────────────────────────────────────────

const UNIT_PRESETS: Array<{ ap: number; hp: number; label: string }> = [
  { ap: 1, hp: 3, label: "AP1/HP3" },
  { ap: 2, hp: 3, label: "AP2/HP3" },
  { ap: 3, hp: 4, label: "AP3/HP4" },
  { ap: 4, hp: 5, label: "AP4/HP5" },
  { ap: 5, hp: 3, label: "AP5/HP3" },
];

type BattlePhase = "idle" | "attack" | "block" | "action" | "damage" | "end";

const PHASE_STEPS: Array<{ key: BattlePhase; label: string }> = [
  { key: "attack", label: "어택 스텝" },
  { key: "block", label: "블록 스텝" },
  { key: "action", label: "액션 스텝" },
  { key: "damage", label: "대미지 스텝" },
  { key: "end", label: "배틀 종료 스텝" },
];

// ── TargetingArrow ────────────────────────────────────────────────────────────
// 어택 스텝: 아군 유닛 → 타겟(실드 에어리어 or 블로커)을 향한 SVG 점선 화살표.

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
// Flies from p1 battle center → p2 battle center as a CSS-animated overlay.

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
// Absolute overlay inside the container: shield card arcs from the shield
// area → center, then explodes with particles + "버스트 효과 발동!" text.

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

// ── UnitBattleSimulator ───────────────────────────────────────────────────────

const INIT_SHIELD = 6;
const INIT_BASE_HP = 3; // EX 베이스 HP

export function UnitBattleSimulator() {
  // ── Unit Battle state ──
  const [myIdx, setMyIdx] = useState(2); // AP3/HP4
  const [enemyIdx, setEnemyIdx] = useState(1); // AP2/HP3
  const [hasBlocker, setHasBlocker] = useState(false);
  const [hasFirstStrike, setHasFirstStrike] = useState(false);
  const [breakthroughN, setBreakthroughN] = useState(0);
  const [hasBurst, setHasBurst] = useState(false);

  const myUnit = UNIT_PRESETS[myIdx];
  const enemyUnit = UNIT_PRESETS[enemyIdx];

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [myHp, setMyHp] = useState(myUnit.hp);
  const [enemyHp, setEnemyHp] = useState(enemyUnit.hp);
  const [myRested, setMyRested] = useState(false);
  const [blockerRested, setBlockerRested] = useState(false);
  const [myAttacking, setMyAttacking] = useState(false);
  const [myHit, setMyHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [myDestroyed, setMyDestroyed] = useState(false);
  const [enemyDestroyed, setEnemyDestroyed] = useState(false);
  const [enemyShields, setEnemyShields] = useState(INIT_SHIELD);
  const [enemyBaseHp, setEnemyBaseHp] = useState(INIT_BASE_HP);
  const [enemyHasBase, setEnemyHasBase] = useState(true);
  const [breakthroughFired, setBreakthroughFired] = useState(false);
  const [breakthroughTarget, setBreakthroughTarget] = useState<"base" | "shield" | null>(null);
  const [unitLog, setUnitLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Targeting arrow
  const [targetCoords, setTargetCoords] = useState({ sx: 0, sy: 0, ex: 0, ey: 0 });
  const [showTarget, setShowTarget] = useState(false);

  // Projectile
  const [projKey, setProjKey] = useState(0);
  const [projCoords, setProjCoords] = useState({ sx: 0, sy: 0, ex: 0, ey: 0 });

  // Burst animation
  const [burstKey, setBurstKey] = useState(0);
  const [burstFrom, setBurstFrom] = useState({ x: 54, y: 8 });

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const myBattleRef = useRef<HTMLDivElement>(null);
  const enemyBattleRef = useRef<HTMLDivElement>(null);

  // ── Functions ──

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function doReset(myMaxHp: number, enemyMaxHp: number) {
    clearTimers();
    setPhase("idle");
    setMyHp(myMaxHp);
    setEnemyHp(enemyMaxHp);
    setMyRested(false);
    setBlockerRested(false);
    setMyAttacking(false);
    setMyHit(false);
    setEnemyHit(false);
    setMyDestroyed(false);
    setEnemyDestroyed(false);
    setEnemyShields(INIT_SHIELD);
    setEnemyBaseHp(INIT_BASE_HP);
    setEnemyHasBase(true);
    setBreakthroughFired(false);
    setBreakthroughTarget(null);
    setTargetCoords({ sx: 0, sy: 0, ex: 0, ey: 0 });
    setShowTarget(false);
    setUnitLog([]);
    setIsRunning(false);
    setIsDone(false);
    setProjKey(0);
  }

  useEffect(() => {
    doReset(UNIT_PRESETS[myIdx].hp, UNIT_PRESETS[enemyIdx].hp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myIdx, enemyIdx, hasBlocker, hasFirstStrike, breakthroughN, hasBurst]);

  function addUnitLog(msg: string) {
    setUnitLog((l) => [msg, ...l.slice(0, 7)]);
  }

  function fireProjectile() {
    const cr = containerRef.current;
    const mr = myBattleRef.current;
    const er = enemyBattleRef.current;
    if (!cr || !mr || !er) return;
    const crRect = cr.getBoundingClientRect();
    const mrRect = mr.getBoundingClientRect();
    const erRect = er.getBoundingClientRect();
    setProjCoords({
      sx: (mrRect.left + mrRect.right) / 2 - crRect.left,
      sy: (mrRect.top + mrRect.bottom) / 2 - crRect.top,
      ex: (erRect.left + erRect.right) / 2 - crRect.left,
      ey: (erRect.top + erRect.bottom) / 2 - crRect.top,
    });
    setProjKey((k) => k + 1);
  }

  // 돌파 처리: N 대미지를 실드 에어리어의 맨 앞 카드 1장에 적용
  //   - 베이스 존재 시: 베이스 HP -= N (파괴돼도 실드로 오버플로우 없음)
  //   - 베이스 없을 시: 실드 맨 위 1장 파괴 (N 무관)
  //   - 실드/베이스 모두 0이면 발동하지 않음
  function applyBreakthrough(
    n: number,
    shields: number,
    baseHp: number,
    hasBase: boolean,
  ) {
    if (n <= 0 || (shields === 0 && !hasBase)) return;

    if (hasBase) {
      const newBaseHp = baseHp - n;
      if (newBaseHp <= 0) {
        setEnemyBaseHp(0);
        setEnemyHasBase(false);
        addUnitLog(`《돌파 ${n}》: 베이스에 ${n} 대미지 → 베이스 파괴!`);
      } else {
        setEnemyBaseHp(newBaseHp);
        addUnitLog(`《돌파 ${n}》: 베이스에 ${n} 대미지. (HP ${baseHp} → ${newBaseHp})`);
      }
      setBreakthroughTarget("base");
    } else {
      // 베이스 없음 → 실드 맨 위 1장만 파괴 (N 무관)
      setEnemyShields(shields - 1);
      addUnitLog(`《돌파 ${n}》: 실드 1장 파괴! (남은: ${shields - 1}장)`);
      setBreakthroughTarget("shield");

      // Burst animation when shield is destroyed via breakthrough
      if (hasBurst) {
        const cr = containerRef.current;
        const shieldEl = cr?.querySelector('[data-target="p2-shield"]');
        if (shieldEl && cr) {
          const sr = shieldEl.getBoundingClientRect();
          const wr = cr.getBoundingClientRect();
          setBurstFrom({
            x: Math.round((sr.left + sr.right) / 2 - (wr.left + wr.right) / 2),
            y: Math.round((sr.top + sr.bottom) / 2 - (wr.top + wr.bottom) / 2),
          });
        }
        setBurstKey((k) => k + 1);
      }
    }
    setBreakthroughFired(true);
  }

  function runBattle() {
    if (isRunning || isDone) return;
    setIsRunning(true);

    const timers: ReturnType<typeof setTimeout>[] = [];
    timersRef.current = timers;
    const at = (fn: () => void, ms: number) =>
      timers.push(setTimeout(fn, ms));

    // 타겟팅 화살표 좌표 측정
    const cr = containerRef.current;
    const crRect = cr?.getBoundingClientRect();
    const mrRect = myBattleRef.current?.getBoundingClientRect();
    let shieldCoords = { sx: 0, sy: 0, ex: 0, ey: 0 };
    let blockerCoords = { sx: 0, sy: 0, ex: 0, ey: 0 };
    if (crRect && mrRect) {
      const sx = (mrRect.left + mrRect.right) / 2 - crRect.left;
      const sy = (mrRect.top + mrRect.bottom) / 2 - crRect.top;
      const shieldEl = cr?.querySelector('[data-target="p2-shield"]');
      if (shieldEl) {
        const sr = shieldEl.getBoundingClientRect();
        shieldCoords = { sx, sy, ex: (sr.left + sr.right) / 2 - crRect.left, ey: (sr.top + sr.bottom) / 2 - crRect.top };
      }
      const erRect = enemyBattleRef.current?.getBoundingClientRect();
      if (erRect) {
        blockerCoords = { sx, sy, ex: (erRect.left + erRect.right) / 2 - crRect.left, ey: (erRect.top + erRect.bottom) / 2 - crRect.top };
      }
    }

    const myAp = myUnit.ap;
    const myMaxHp = myUnit.hp;
    const enemyAp = enemyUnit.ap;
    const enemyMaxHp = enemyUnit.hp;
    const afterMyHp = Math.max(0, myMaxHp - enemyAp);
    const afterEnemyHp = Math.max(0, enemyMaxHp - myAp);
    // 배틀 시작 시점의 상대 실드 에어리어 상태를 클로저로 캡처
    const initShields = enemyShields;
    const initBaseHp = enemyBaseHp;
    const initHasBase = enemyHasBase;

    // ① 어택 스텝
    at(() => {
      setPhase("attack");
      setMyRested(true);
      setTargetCoords(shieldCoords);
      setShowTarget(true);
      addUnitLog("어택 스텝: 어택 유닛을 레스트하고 어택 선언.");
    }, 100);

    // ② 블록 스텝
    at(() => {
      setPhase("block");
      if (hasBlocker) {
        setBlockerRested(true);
        setTargetCoords(blockerCoords); // 화살표를 블로커 유닛으로 리다이렉트
        addUnitLog("블록 스텝: 《블로커》 발동! 이 유닛으로 어택 대상 변경.");
      } else {
        addUnitLog("블록 스텝: 블로커 없음. 어택 계속.");
      }
    }, 900);

    // ③ 액션 스텝
    at(() => {
      setPhase("action");
      setShowTarget(false);
      addUnitLog("액션 스텝: 양측 교대로 【액션】 발동 가능. 양측 패스로 종료.");
    }, 1700);

    // ④ 대미지 스텝: 투사체 발사
    at(() => {
      setPhase("damage");
      setMyAttacking(true);
      addUnitLog("대미지 스텝: 배틀 대미지 교환.");
      fireProjectile();
    }, 2500);

    // 대미지 적용 후 myAttacking 해제
    at(() => setMyAttacking(false), 3050);

    if (hasFirstStrike) {
      // 선제공격: 내 유닛 먼저 대미지
      at(() => {
        setEnemyHit(true);
        setEnemyHp(afterEnemyHp);
        addUnitLog(`《선제공격》: 상대 유닛에 ${myAp} 대미지! HP ${enemyMaxHp} → ${afterEnemyHp}`);
      }, 3100);
      at(() => setEnemyHit(false), 3440);

      if (afterEnemyHp <= 0) {
        at(() => {
          setEnemyDestroyed(true);
          addUnitLog("상대 유닛 파괴! 반격 대미지 없음.");
          applyBreakthrough(breakthroughN, initShields, initBaseHp, initHasBase);
        }, 3540);
        at(() => {
          setPhase("end");
          addUnitLog("배틀 종료 스텝: 배틀 중 효과 소멸.");
        }, 4100);
      } else {
        // 반격
        at(() => {
          setMyHit(true);
          setMyHp(afterMyHp);
          addUnitLog(`반격: 내 유닛에 ${enemyAp} 대미지! HP ${myMaxHp} → ${afterMyHp}`);
        }, 3600);
        at(() => {
          setMyHit(false);
          if (afterMyHp <= 0) { setMyDestroyed(true); addUnitLog("내 유닛 파괴!"); }
        }, 3950);
        at(() => {
          setPhase("end");
          addUnitLog("배틀 종료 스텝: 배틀 중 효과 소멸.");
        }, 4500);
      }
    } else {
      // 동시 대미지 교환
      at(() => {
        setMyHit(afterMyHp < myMaxHp);
        setEnemyHit(afterEnemyHp < enemyMaxHp);
        setMyHp(afterMyHp);
        setEnemyHp(afterEnemyHp);
        addUnitLog(
          `배틀 대미지 교환: 내 유닛 −${Math.min(enemyAp, myMaxHp)} HP, 상대 유닛 −${Math.min(myAp, enemyMaxHp)} HP.`,
        );
      }, 3100);
      at(() => {
        setMyHit(false);
        setEnemyHit(false);
        if (afterMyHp <= 0) { setMyDestroyed(true); addUnitLog("내 유닛 파괴!"); }
        if (afterEnemyHp <= 0) {
          setEnemyDestroyed(true);
          addUnitLog("상대 유닛 파괴!");
          applyBreakthrough(breakthroughN, initShields, initBaseHp, initHasBase);
        }
      }, 3460);
      at(() => {
        setPhase("end");
        addUnitLog("배틀 종료 스텝: 배틀 중 효과 소멸.");
      }, 4100);
    }

    at(() => {
      setIsRunning(false);
      setIsDone(true);
    }, 4700);
  }

  // ── Derived values ──

  const p1Board: DualBoardState = { shieldCount: 6, hasBase: true };
  const p2Board: DualBoardState = { shieldCount: enemyShields, hasBase: enemyHasBase, baseHp: enemyHasBase ? enemyBaseHp : undefined };

  const battleAccent =
    phase === "attack" || phase === "block" || phase === "damage" ? "battle" : null;
  const accent = breakthroughFired ? null : battleAccent;
  const p2BreakthroughAccent: DualAccent = breakthroughFired
    ? breakthroughTarget === "base"
      ? "base"
      : "shield"
    : battleAccent;

  const phaseIdx = PHASE_STEPS.findIndex((s) => s.key === phase);

  // ── Dynamic keyframes for burst animation ──

  const { x: fx, y: fy } = burstFrom;
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
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-blue-600">내 유닛 (어택)</span>
              <select
                value={myIdx}
                onChange={(e) => setMyIdx(Number(e.target.value))}
                disabled={isRunning}
                className="border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
              >
                {UNIT_PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.label}</option>
                ))}
              </select>
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
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-red-600">상대 유닛</span>
              <select
                value={enemyIdx}
                onChange={(e) => setEnemyIdx(Number(e.target.value))}
                disabled={isRunning}
                className="border rounded px-1 py-0.5 text-[10px] bg-background disabled:opacity-50"
              >
                {UNIT_PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasBlocker}
                  onChange={(e) => setHasBlocker(e.target.checked)}
                  disabled={isRunning}
                  className="accent-red-500"
                />
                <span className="text-muted-foreground">《블로커》</span>
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
            <DualPlayfield
              p1={p1Board}
              p2={p2Board}
              p1Label="나 (어택)"
              p2Label="상대"
              accent={accent}
              p2Accent={p2BreakthroughAccent}
              p1Battle={
                <div
                  ref={myBattleRef}
                  className="w-full h-full flex items-center justify-center overflow-visible"
                >
                  <MiniCard
                    name="나"
                    ap={myUnit.ap}
                    hp={myHp}
                    maxHp={myUnit.hp}
                    color="blue"
                    rested={myRested}
                    attacking={myAttacking}
                    attackDir={-1}
                    hit={myHit}
                    destroyed={myDestroyed}
                    tag={[hasFirstStrike ? "선제" : "", breakthroughN > 0 ? `돌파${breakthroughN}` : ""].filter(Boolean).join(" ") || undefined}
                    highlight={phase === "damage"}
                  />
                </div>
              }
              p2Battle={
                <div
                  ref={enemyBattleRef}
                  className="w-full h-full flex items-center justify-center overflow-visible"
                >
                  <MiniCard
                    name="상대"
                    ap={enemyUnit.ap}
                    hp={enemyHp}
                    maxHp={enemyUnit.hp}
                    color="red"
                    rested={blockerRested}
                    attackDir={1}
                    hit={enemyHit}
                    destroyed={enemyDestroyed}
                    tag={hasBlocker ? "블로커" : undefined}
                  />
                </div>
              }
            />

            {/* Targeting arrow overlay */}
            <TargetingArrow
              sx={targetCoords.sx}
              sy={targetCoords.sy}
              ex={targetCoords.ex}
              ey={targetCoords.ey}
              show={showTarget}
            />

            {/* Attack projectile overlay */}
            <AttackProjectile
              sx={projCoords.sx}
              sy={projCoords.sy}
              ex={projCoords.ex}
              ey={projCoords.ey}
              animKey={projKey}
            />

            {/* Burst overlay */}
            <BurstOverlay animKey={burstKey} />
          </div>

          {/* ── Breakthrough badge ── */}
          {breakthroughFired && (
            <div
              className="text-center text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-300 rounded-lg px-2 py-1.5 shadow-sm"
              style={{ animation: "breakthrough-badge 380ms cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              《돌파 {breakthroughN}》 발동 — 실드 {enemyShields}장{enemyHasBase ? ` · 베이스 HP ${enemyBaseHp}` : ""} 남음
            </div>
          )}

          {/* ── Controls & log ── */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={runBattle}
                disabled={isRunning || isDone}
                className="flex-1 text-xs py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold shadow-sm"
              >
                어택!
              </button>
              <button
                type="button"
                onClick={() => doReset(myUnit.hp, enemyUnit.hp)}
                className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/40 active:scale-95 transition-all text-muted-foreground"
              >
                ↺
              </button>
            </div>
            {unitLog.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 flex flex-col gap-1 max-h-28 overflow-y-auto">
                {unitLog.map((entry, i) => (
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
      </div>
    </>
  );
}
