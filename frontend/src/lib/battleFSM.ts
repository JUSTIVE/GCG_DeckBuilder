// ── Battle FSM ────────────────────────────────────────────────────────────────
// 순수 함수/타입으로 정의된 유한상태기계. DOM·React에 의존하지 않음.
//
// 페이즈 전이:
//   idle → attack → block → action → damage → hit → [counter]? → clear → end → idle
//
// counter 페이즈는 《선제공격》으로 상대 유닛이 생존했을 때만 진입.

export type BattlePhase =
  | "idle"
  | "attack"    // 어택 선언
  | "block"     // 블록 판정
  | "action"    // 액션 스텝 (양측 패스 대기)
  | "damage"    // 투사체 비행 중 (myAttacking=true)
  | "hit"       // 대미지 적용 + 히트 애니메이션
  | "counter"   // 선제공격 생존 시 반격 애니메이션
  | "clear"     // 히트 클리어 + 파괴/돌파 처리
  | "end";      // 배틀 종료 스텝

export interface Coords {
  sx: number; sy: number; ex: number; ey: number;
}

// RUN 이벤트 시 스냅샷으로 캡처되는 배틀 파라미터.
// DOM 측정값 포함 (클릭 시점 or DAMAGE_TICK 시점에 측정).
export interface BattleSnap {
  myAp: number;
  enemyAp: number;
  myMaxHp: number;
  enemyMaxHp: number;
  afterMyHp: number;
  afterEnemyHp: number;
  wasBlocker: boolean;
  hasFirstStrike: boolean;
  hasHighMobility: boolean;
  breakthroughN: number;
  hasBurst: boolean;
  shieldCoords: Coords;          // 어택 스텝 화살표 → 실드
  burstFrom: { x: number; y: number }; // 버스트 애니 시작 좌표
  initShields: number;
  initBaseHp: number;
  initHasBase: boolean;
  chosenBlockerLabel: string;    // 랜덤 블로커 선택 시 라벨
}

export interface BattleCtx {
  // 보드 수치
  myHp: number;
  enemyHp: number;
  enemyShields: number;
  enemyBaseHp: number;
  enemyHasBase: boolean;

  // 유닛 상태 플래그
  myRested: boolean;
  blockerRested: boolean;
  myAttacking: boolean;
  myHit: boolean;
  enemyHit: boolean;
  myDestroyed: boolean;
  enemyDestroyed: boolean;

  // 타겟팅/투사체 애니메이션
  showTarget: boolean;
  targetCoords: Coords;
  projKey: number;
  projCoords: Coords;

  // 버스트 애니메이션
  burstKey: number;
  burstFrom: { x: number; y: number };

  // 돌파 배지
  breakthroughFired: boolean;
  breakthroughTarget: "base" | "shield" | null;

  // 턴 배너
  turnBanner: "opponent" | "mine" | null;

  // 배틀 로그 (최신순, 최대 8줄)
  log: string[];

  // 제어 플래그
  isRunning: boolean;
  battleDone: boolean;   // 로스터 정리 트리거용 (컴포넌트의 useEffect가 소비)

  // 현재 배틀 파라미터 스냅샷
  snap: BattleSnap | null;
}

export type BattleEvent =
  | { type: "RUN"; snap: BattleSnap }
  | { type: "TICK" }                                    // 일반 페이즈 진행
  | { type: "BLOCK_TICK"; blockerCoords: Coords }       // 블록 스텝 (DOM 재측정 후)
  | { type: "DAMAGE_TICK"; projCoords: Coords }         // 대미지 스텝 시작 (DOM 측정 후)
  | { type: "RESET"; myHp: number; enemyHp: number }   // 전체 초기화
  | { type: "NEXT_TURN" }                               // 다음 턴 버튼
  | { type: "TURN_BANNER_TICK" }                        // 배너 타이머 만료
  | { type: "CLEANUP_DONE"; myHp: number; enemyHp: number }; // 로스터 정리 완료

export interface BattleFSM {
  phase: BattlePhase;
  ctx: BattleCtx;
}

// ── 초기 컨텍스트 ──────────────────────────────────────────────────────────────

const NULL_COORDS: Coords = { sx: 0, sy: 0, ex: 0, ey: 0 };

export function makeInitialCtx(myHp: number, enemyHp: number): BattleCtx {
  return {
    myHp,
    enemyHp,
    enemyShields: 6,
    enemyBaseHp: 3,
    enemyHasBase: true,
    myRested: false,
    blockerRested: false,
    myAttacking: false,
    myHit: false,
    enemyHit: false,
    myDestroyed: false,
    enemyDestroyed: false,
    showTarget: false,
    targetCoords: NULL_COORDS,
    projKey: 0,
    projCoords: NULL_COORDS,
    burstKey: 0,
    burstFrom: { x: 54, y: 8 },
    breakthroughFired: false,
    breakthroughTarget: null,
    turnBanner: null,
    log: [],
    isRunning: false,
    battleDone: false,
    snap: null,
  };
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function pushLog(ctx: BattleCtx, msg: string): BattleCtx {
  return { ...ctx, log: [msg, ...ctx.log.slice(0, 7)] };
}

// 돌파 처리: 순수 컨텍스트 변환
function applyBreakthrough(ctx: BattleCtx, snap: BattleSnap): BattleCtx {
  const { breakthroughN, initShields, initBaseHp, initHasBase, hasBurst, burstFrom } = snap;
  if (breakthroughN <= 0 || (initShields === 0 && !initHasBase)) return ctx;

  let next = ctx;
  if (initHasBase) {
    const newBaseHp = initBaseHp - breakthroughN;
    if (newBaseHp <= 0) {
      next = pushLog(
        { ...next, enemyBaseHp: 0, enemyHasBase: false, breakthroughFired: true, breakthroughTarget: "base" },
        `《돌파 ${breakthroughN}》: 베이스에 ${breakthroughN} 대미지 → 베이스 파괴!`,
      );
    } else {
      next = pushLog(
        { ...next, enemyBaseHp: newBaseHp, breakthroughFired: true, breakthroughTarget: "base" },
        `《돌파 ${breakthroughN}》: 베이스에 ${breakthroughN} 대미지. (HP ${initBaseHp} → ${newBaseHp})`,
      );
    }
  } else if (initShields > 0) {
    const newShields = initShields - 1;
    next = {
      ...next,
      enemyShields: newShields,
      breakthroughFired: true,
      breakthroughTarget: "shield",
      ...(hasBurst ? { burstKey: ctx.burstKey + 1, burstFrom } : {}),
    };
    next = pushLog(next, `《돌파 ${breakthroughN}》: 실드 1장 파괴! (남은: ${newShields}장)`);
  }
  return next;
}

// ── Transition 함수 ────────────────────────────────────────────────────────────

export function battleTransition(state: BattleFSM, event: BattleEvent): BattleFSM {
  const { phase, ctx } = state;

  // ── RESET ──
  if (event.type === "RESET") {
    return { phase: "idle", ctx: makeInitialCtx(event.myHp, event.enemyHp) };
  }

  // ── CLEANUP_DONE ──
  if (event.type === "CLEANUP_DONE") {
    return {
      phase: "idle",
      ctx: { ...ctx, battleDone: false, myHp: event.myHp, enemyHp: event.enemyHp },
    };
  }

  // ── NEXT_TURN ──
  if (event.type === "NEXT_TURN") {
    if (phase !== "idle" || ctx.isRunning || ctx.turnBanner !== null) return state;
    return { phase: "idle", ctx: { ...ctx, turnBanner: "opponent" } };
  }

  // ── TURN_BANNER_TICK ──
  if (event.type === "TURN_BANNER_TICK") {
    if (ctx.turnBanner === "opponent") {
      return { phase: "idle", ctx: { ...ctx, turnBanner: "mine" } };
    }
    if (ctx.turnBanner === "mine") {
      return {
        phase: "idle",
        ctx: {
          ...ctx,
          turnBanner: null,
          myRested: false,
          blockerRested: false,
          battleDone: false,
          log: ["─── 새 턴 ───", ...ctx.log.slice(0, 7)],
        },
      };
    }
    return state;
  }

  // ── RUN ──
  if (event.type === "RUN") {
    if (phase !== "idle" || ctx.isRunning) return state;
    const { snap } = event;
    const logMsg = snap.hasHighMobility
      ? "어택 스텝: 《고기동》 — 레스트 없이 어택 선언."
      : "어택 스텝: 어택 유닛을 레스트하고 어택 선언.";
    return {
      phase: "attack",
      ctx: {
        ...ctx,
        isRunning: true,
        battleDone: false,
        snap,
        myRested: !snap.hasHighMobility,
        showTarget: true,
        targetCoords: snap.shieldCoords,
        myAttacking: false,
        myHit: false,
        enemyHit: false,
        myDestroyed: false,
        enemyDestroyed: false,
        breakthroughFired: false,
        breakthroughTarget: null,
        log: [logMsg, ...ctx.log.slice(0, 7)],
      },
    };
  }

  // ── BLOCK_TICK ── attack → block
  if (event.type === "BLOCK_TICK") {
    if (phase !== "attack" || !ctx.snap) return state;
    const { snap } = ctx;
    if (snap.wasBlocker) {
      const randomMsg = snap.chosenBlockerLabel
        ? ` [랜덤 선택: ${snap.chosenBlockerLabel}]`
        : "";
      return {
        phase: "block",
        ctx: pushLog(
          { ...ctx, blockerRested: true, targetCoords: event.blockerCoords },
          `블록 스텝: 《블로커》 발동!${randomMsg} 이 유닛으로 어택 대상 변경.`,
        ),
      };
    }
    return {
      phase: "block",
      ctx: pushLog(ctx, "블록 스텝: 블로커 없음. 어택 계속."),
    };
  }

  // ── DAMAGE_TICK ── action → damage
  if (event.type === "DAMAGE_TICK") {
    if (phase !== "action" || !ctx.snap) return state;
    const logMsg = ctx.snap.wasBlocker
      ? "대미지 스텝: 배틀 대미지 교환."
      : "대미지 스텝: 실드 에어리어에 어택 히트.";
    return {
      phase: "damage",
      ctx: pushLog(
        { ...ctx, myAttacking: true, projKey: ctx.projKey + 1, projCoords: event.projCoords },
        logMsg,
      ),
    };
  }

  // ── TICK ── 나머지 페이즈 진행
  if (event.type === "TICK") {
    if (!ctx.snap) return state;
    const { snap } = ctx;

    switch (phase) {
      // block → action
      case "block":
        return {
          phase: "action",
          ctx: pushLog({ ...ctx, showTarget: false },
            "액션 스텝: 양측 교대로 【액션】 발동 가능. 양측 패스로 종료."),
        };

      // damage → hit: 투사체 착탄, 대미지 적용
      case "damage": {
        let next: BattleCtx = { ...ctx, myAttacking: false };

        if (!snap.wasBlocker) {
          // 블로커 없음 → 실드/베이스 직접 피격
          if (snap.initHasBase) {
            const newBaseHp = snap.initBaseHp - snap.myAp;
            if (newBaseHp <= 0) {
              next = pushLog(
                { ...next, enemyBaseHp: 0, enemyHasBase: false },
                `베이스에 ${snap.myAp} 대미지! HP 0 → 베이스 파괴!`,
              );
            } else {
              next = pushLog(
                { ...next, enemyBaseHp: newBaseHp },
                `베이스에 ${snap.myAp} 대미지! (HP ${snap.initBaseHp} → ${newBaseHp})`,
              );
            }
          } else if (snap.initShields > 0) {
            const newShields = snap.initShields - 1;
            if (snap.hasBurst) {
              next = pushLog(
                { ...next, enemyShields: newShields, burstKey: ctx.burstKey + 1, burstFrom: snap.burstFrom },
                `실드 1장 파괴 → 【버스트】 발동! (남은: ${newShields}장)`,
              );
            } else {
              next = pushLog(
                { ...next, enemyShields: newShields },
                `실드 1장 파괴 → 트래시. (남은: ${newShields}장)`,
              );
            }
          } else {
            next = pushLog(next, "실드·베이스 없음 → 직격! 상대 패배.");
          }
          return { phase: "hit", ctx: next };
        }

        // 블로커 있음
        if (snap.hasFirstStrike) {
          next = pushLog(
            { ...next, enemyHit: true, enemyHp: snap.afterEnemyHp },
            `《선제공격》: 상대 유닛에 ${snap.myAp} 대미지! HP ${snap.enemyMaxHp} → ${snap.afterEnemyHp}`,
          );
        } else {
          next = pushLog(
            {
              ...next,
              myHit: snap.afterMyHp < snap.myMaxHp,
              enemyHit: snap.afterEnemyHp < snap.enemyMaxHp,
              myHp: snap.afterMyHp,
              enemyHp: snap.afterEnemyHp,
            },
            `배틀 대미지 교환: 내 유닛 −${Math.min(snap.enemyAp, snap.myMaxHp)} HP, 상대 유닛 −${Math.min(snap.myAp, snap.enemyMaxHp)} HP.`,
          );
        }
        return { phase: "hit", ctx: next };
      }

      // hit → counter or clear
      case "hit": {
        if (!snap.wasBlocker) {
          // 블로커 없음: 히트 없으므로 바로 clear
          return { phase: "clear", ctx };
        }

        let next: BattleCtx = { ...ctx, enemyHit: false, myHit: false };

        if (snap.hasFirstStrike) {
          if (snap.afterEnemyHp <= 0) {
            // 상대 파괴 → 돌파 처리 후 clear
            next = pushLog({ ...next, enemyDestroyed: true }, "상대 유닛 파괴! 반격 대미지 없음.");
            next = applyBreakthrough(next, snap);
            return { phase: "clear", ctx: next };
          } else {
            // 상대 생존 → 반격 counter
            next = pushLog(
              { ...next, myHit: snap.afterMyHp < snap.myMaxHp, myHp: snap.afterMyHp },
              `반격: 내 유닛에 ${snap.enemyAp} 대미지! HP ${snap.myMaxHp} → ${snap.afterMyHp}`,
            );
            return { phase: "counter", ctx: next };
          }
        }

        // 동시 대미지 교환
        if (snap.afterMyHp <= 0) {
          next = pushLog({ ...next, myDestroyed: true }, "내 유닛 파괴!");
        }
        if (snap.afterEnemyHp <= 0) {
          next = pushLog({ ...next, enemyDestroyed: true }, "상대 유닛 파괴!");
          next = applyBreakthrough(next, snap);
        }
        return { phase: "clear", ctx: next };
      }

      // counter → clear: 반격 히트 해제
      case "counter": {
        let next: BattleCtx = { ...ctx, myHit: false };
        if (snap.afterMyHp <= 0) {
          next = pushLog({ ...next, myDestroyed: true }, "내 유닛 파괴!");
        }
        return { phase: "clear", ctx: next };
      }

      // clear → end
      case "clear":
        return {
          phase: "end",
          ctx: pushLog(ctx, "배틀 종료 스텝: 배틀 중 효과 소멸."),
        };

      // end → idle: 배틀 완전 종료, 로스터 정리 트리거
      case "end":
        return {
          phase: "idle",
          ctx: { ...ctx, isRunning: false, battleDone: true },
        };

      default:
        return state;
    }
  }

  return state;
}
