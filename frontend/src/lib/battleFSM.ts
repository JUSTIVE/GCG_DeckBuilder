// ── Battle FSM ────────────────────────────────────────────────────────────────
// ADT(Algebraic Data Type) 스타일로 정의된 유한상태기계.
// DOM·React에 의존하지 않는 순수 함수/타입.
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
  | "damage"    // 투사체 비행 중
  | "hit"       // 대미지 적용 + 히트 애니메이션
  | "counter"   // 선제공격 생존 시 반격 애니메이션
  | "clear"     // 히트 클리어 + 파괴/돌파 처리
  | "end";      // 배틀 종료 스텝

export interface Coords {
  sx: number; sy: number; ex: number; ey: number;
}

// ── BattleSnap ────────────────────────────────────────────────────────────────
// RUN 이벤트 시 캡처되는 배틀 파라미터 스냅샷.

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
  shieldCoords: Coords;
  burstFrom: { x: number; y: number };
  initShields: number;
  initBaseHp: number;
  initHasBase: boolean;
  chosenBlockerLabel: string;
}

// ── BoardCtx ──────────────────────────────────────────────────────────────────
// 배틀 간 지속되는 보드 수치. idle/active 모두에서 보유.

export interface BoardCtx {
  myHp: number;
  enemyHp: number;
  enemyShields: number;
  enemyBaseHp: number;
  enemyHasBase: boolean;
  log: string[];
}

// ── ActiveCtx ─────────────────────────────────────────────────────────────────
// 전투 중에만 존재하는 컨텍스트. idle 상태에서는 접근 불가.

export interface ActiveCtx {
  snap: BattleSnap;

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
}

// ── BattleFSM (ADT) ───────────────────────────────────────────────────────────
// 각 variant가 필요한 데이터만 보유.
// idle: 배너/battleDone 플래그 포함, battle 없음.
// 그 외: battle 컨텍스트 포함, 배너 없음.

export type BattleFSM =
  | { phase: "idle";    board: BoardCtx; turnBanner: "opponent" | "mine" | null; battleDone: boolean }
  | { phase: "attack";  board: BoardCtx; battle: ActiveCtx }
  | { phase: "block";   board: BoardCtx; battle: ActiveCtx }
  | { phase: "action";  board: BoardCtx; battle: ActiveCtx }
  | { phase: "damage";  board: BoardCtx; battle: ActiveCtx }
  | { phase: "hit";     board: BoardCtx; battle: ActiveCtx }
  | { phase: "counter"; board: BoardCtx; battle: ActiveCtx }
  | { phase: "clear";   board: BoardCtx; battle: ActiveCtx }
  | { phase: "end";     board: BoardCtx; battle: ActiveCtx };

// 활성 전투 상태만 추출하는 편의 타입
export type ActiveBattleFSM = Extract<BattleFSM, { battle: ActiveCtx }>;

// ── 이벤트 (ADT) ──────────────────────────────────────────────────────────────

export type BattleEvent =
  | { type: "RUN";          snap: BattleSnap }
  | { type: "TICK" }
  | { type: "BLOCK_TICK";   blockerCoords: Coords }
  | { type: "DAMAGE_TICK";  projCoords: Coords }
  | { type: "RESET";        myHp: number; enemyHp: number }
  | { type: "NEXT_TURN" }
  | { type: "TURN_BANNER_TICK" }
  | { type: "CLEANUP_DONE"; myHp: number; enemyHp: number };

// ── 초기화 ────────────────────────────────────────────────────────────────────

const NULL_COORDS: Coords = { sx: 0, sy: 0, ex: 0, ey: 0 };

export function makeInitialBoard(myHp: number, enemyHp: number): BoardCtx {
  return {
    myHp,
    enemyHp,
    enemyShields: 6,
    enemyBaseHp: 3,
    enemyHasBase: true,
    log: [],
  };
}

export function makeIdleState(myHp: number, enemyHp: number): BattleFSM {
  return {
    phase: "idle",
    board: makeInitialBoard(myHp, enemyHp),
    turnBanner: null,
    battleDone: false,
  };
}

function makeInitialActiveCtx(snap: BattleSnap): ActiveCtx {
  return {
    snap,
    myRested: !snap.hasHighMobility,
    blockerRested: false,
    myAttacking: false,
    myHit: false,
    enemyHit: false,
    myDestroyed: false,
    enemyDestroyed: false,
    showTarget: true,
    targetCoords: snap.shieldCoords,
    projKey: 0,
    projCoords: NULL_COORDS,
    burstKey: 0,
    burstFrom: snap.burstFrom,
    breakthroughFired: false,
    breakthroughTarget: null,
  };
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function pushLog(board: BoardCtx, msg: string): BoardCtx {
  return { ...board, log: [msg, ...board.log.slice(0, 7)] };
}

// 돌파 처리: board/battle 양쪽을 순수하게 변환
function applyBreakthrough(
  board: BoardCtx,
  battle: ActiveCtx,
  snap: BattleSnap,
): { board: BoardCtx; battle: ActiveCtx } {
  const { breakthroughN, initShields, initBaseHp, initHasBase, hasBurst, burstFrom } = snap;
  if (breakthroughN <= 0 || (initShields === 0 && !initHasBase)) {
    return { board, battle };
  }

  if (initHasBase) {
    const newBaseHp = initBaseHp - breakthroughN;
    if (newBaseHp <= 0) {
      return {
        board: pushLog(
          { ...board, enemyBaseHp: 0, enemyHasBase: false },
          `《돌파 ${breakthroughN}》: 베이스에 ${breakthroughN} 대미지 → 베이스 파괴!`,
        ),
        battle: { ...battle, breakthroughFired: true, breakthroughTarget: "base" },
      };
    }
    return {
      board: pushLog(
        { ...board, enemyBaseHp: newBaseHp },
        `《돌파 ${breakthroughN}》: 베이스에 ${breakthroughN} 대미지. (HP ${initBaseHp} → ${newBaseHp})`,
      ),
      battle: { ...battle, breakthroughFired: true, breakthroughTarget: "base" },
    };
  }

  // 베이스 없음 → 실드 파괴
  const newShields = initShields - 1;
  return {
    board: pushLog(
      { ...board, enemyShields: newShields },
      `《돌파 ${breakthroughN}》: 실드 1장 파괴! (남은: ${newShields}장)`,
    ),
    battle: {
      ...battle,
      breakthroughFired: true,
      breakthroughTarget: "shield",
      ...(hasBurst ? { burstKey: battle.burstKey + 1, burstFrom } : {}),
    },
  };
}

// ── Transition 함수 ────────────────────────────────────────────────────────────

export function battleTransition(state: BattleFSM, event: BattleEvent): BattleFSM {
  switch (event.type) {

    // ── RESET ──────────────────────────────────────────────────────────────────
    case "RESET":
      return makeIdleState(event.myHp, event.enemyHp);

    // ── CLEANUP_DONE ───────────────────────────────────────────────────────────
    case "CLEANUP_DONE": {
      if (state.phase !== "idle") return state;
      return {
        ...state,
        board: { ...state.board, myHp: event.myHp, enemyHp: event.enemyHp },
        battleDone: false,
      };
    }

    // ── NEXT_TURN ──────────────────────────────────────────────────────────────
    case "NEXT_TURN": {
      if (state.phase !== "idle" || state.turnBanner !== null) return state;
      return { ...state, turnBanner: "opponent" };
    }

    // ── TURN_BANNER_TICK ───────────────────────────────────────────────────────
    case "TURN_BANNER_TICK": {
      if (state.phase !== "idle") return state;
      if (state.turnBanner === "opponent") {
        return { ...state, turnBanner: "mine" };
      }
      if (state.turnBanner === "mine") {
        return {
          ...state,
          turnBanner: null,
          board: pushLog(state.board, "─── 새 턴 ───"),
        };
      }
      return state;
    }

    // ── RUN ────────────────────────────────────────────────────────────────────
    case "RUN": {
      if (state.phase !== "idle") return state;
      const { snap } = event;
      const logMsg = snap.hasHighMobility
        ? "어택 스텝: 《고기동》 — 레스트 없이 어택 선언."
        : "어택 스텝: 어택 유닛을 레스트하고 어택 선언.";
      return {
        phase: "attack",
        board: pushLog(state.board, logMsg),
        battle: makeInitialActiveCtx(snap),
      };
    }

    // ── BLOCK_TICK ─────────────────────────────────────────────────────────────
    case "BLOCK_TICK": {
      if (state.phase !== "attack") return state;
      const { snap } = state.battle;
      if (snap.wasBlocker) {
        const randomMsg = snap.chosenBlockerLabel
          ? ` [랜덤 선택: ${snap.chosenBlockerLabel}]`
          : "";
        return {
          phase: "block",
          board: pushLog(state.board, `블록 스텝: 《블로커》 발동!${randomMsg} 이 유닛으로 어택 대상 변경.`),
          battle: { ...state.battle, blockerRested: true, targetCoords: event.blockerCoords },
        };
      }
      return {
        phase: "block",
        board: pushLog(state.board, "블록 스텝: 블로커 없음. 어택 계속."),
        battle: state.battle,
      };
    }

    // ── DAMAGE_TICK ────────────────────────────────────────────────────────────
    case "DAMAGE_TICK": {
      if (state.phase !== "action") return state;
      const logMsg = state.battle.snap.wasBlocker
        ? "대미지 스텝: 배틀 대미지 교환."
        : "대미지 스텝: 실드 에어리어에 어택 히트.";
      return {
        phase: "damage",
        board: pushLog(state.board, logMsg),
        battle: {
          ...state.battle,
          myAttacking: true,
          projKey: state.battle.projKey + 1,
          projCoords: event.projCoords,
        },
      };
    }

    // ── TICK ───────────────────────────────────────────────────────────────────
    case "TICK": {
      switch (state.phase) {

        // block → action
        case "block":
          return {
            phase: "action",
            board: pushLog(state.board, "액션 스텝: 양측 교대로 【액션】 발동 가능. 양측 패스로 종료."),
            battle: { ...state.battle, showTarget: false },
          };

        // damage → hit: 투사체 착탄, 대미지 적용
        case "damage": {
          const { snap } = state.battle;
          let board = { ...state.board };
          let battle = { ...state.battle, myAttacking: false };

          if (!snap.wasBlocker) {
            // 블로커 없음: 실드/베이스 직접 피격
            if (snap.initHasBase) {
              const newBaseHp = snap.initBaseHp - snap.myAp;
              if (newBaseHp <= 0) {
                board = pushLog({ ...board, enemyBaseHp: 0, enemyHasBase: false },
                  `베이스에 ${snap.myAp} 대미지! HP 0 → 베이스 파괴!`);
              } else {
                board = pushLog({ ...board, enemyBaseHp: newBaseHp },
                  `베이스에 ${snap.myAp} 대미지! (HP ${snap.initBaseHp} → ${newBaseHp})`);
              }
            } else if (snap.initShields > 0) {
              const newShields = snap.initShields - 1;
              board = { ...board, enemyShields: newShields };
              if (snap.hasBurst) {
                board = pushLog(board, `실드 1장 파괴 → 【버스트】 발동! (남은: ${newShields}장)`);
                battle = { ...battle, burstKey: battle.burstKey + 1, burstFrom: snap.burstFrom };
              } else {
                board = pushLog(board, `실드 1장 파괴 → 트래시. (남은: ${newShields}장)`);
              }
            } else {
              board = pushLog(board, "실드·베이스 없음 → 직격! 상대 패배.");
            }
            return { phase: "hit", board, battle };
          }

          // 블로커 있음
          if (snap.hasFirstStrike) {
            board = pushLog(
              { ...board, enemyHp: snap.afterEnemyHp },
              `《선제공격》: 상대 유닛에 ${snap.myAp} 대미지! HP ${snap.enemyMaxHp} → ${snap.afterEnemyHp}`,
            );
            battle = { ...battle, enemyHit: true };
          } else {
            board = pushLog(
              { ...board, myHp: snap.afterMyHp, enemyHp: snap.afterEnemyHp },
              `배틀 대미지 교환: 내 유닛 −${Math.min(snap.enemyAp, snap.myMaxHp)} HP, 상대 유닛 −${Math.min(snap.myAp, snap.enemyMaxHp)} HP.`,
            );
            battle = {
              ...battle,
              myHit: snap.afterMyHp < snap.myMaxHp,
              enemyHit: snap.afterEnemyHp < snap.enemyMaxHp,
            };
          }
          return { phase: "hit", board, battle };
        }

        // hit → counter or clear
        case "hit": {
          const { snap } = state.battle;
          let board = state.board;
          let battle = { ...state.battle, enemyHit: false, myHit: false };

          if (!snap.wasBlocker) {
            return { phase: "clear", board, battle };
          }

          if (snap.hasFirstStrike) {
            if (snap.afterEnemyHp <= 0) {
              // 상대 파괴 → 돌파 처리 후 clear
              board = pushLog(board, "상대 유닛 파괴! 반격 대미지 없음.");
              battle = { ...battle, enemyDestroyed: true };
              const bt = applyBreakthrough(board, battle, snap);
              return { phase: "clear", board: bt.board, battle: bt.battle };
            }
            // 상대 생존 → 반격 counter
            board = pushLog(
              { ...board, myHp: snap.afterMyHp },
              `반격: 내 유닛에 ${snap.enemyAp} 대미지! HP ${snap.myMaxHp} → ${snap.afterMyHp}`,
            );
            battle = { ...battle, myHit: snap.afterMyHp < snap.myMaxHp };
            return { phase: "counter", board, battle };
          }

          // 동시 대미지 교환
          if (snap.afterMyHp <= 0) {
            board = pushLog(board, "내 유닛 파괴!");
            battle = { ...battle, myDestroyed: true };
          }
          if (snap.afterEnemyHp <= 0) {
            board = pushLog(board, "상대 유닛 파괴!");
            battle = { ...battle, enemyDestroyed: true };
            const bt = applyBreakthrough(board, battle, snap);
            board = bt.board;
            battle = bt.battle;
          }
          return { phase: "clear", board, battle };
        }

        // counter → clear: 반격 히트 해제
        case "counter": {
          const { snap } = state.battle;
          let board = state.board;
          let battle = { ...state.battle, myHit: false };
          if (snap.afterMyHp <= 0) {
            board = pushLog(board, "내 유닛 파괴!");
            battle = { ...battle, myDestroyed: true };
          }
          return { phase: "clear", board, battle };
        }

        // clear → end
        case "clear":
          return {
            phase: "end",
            board: pushLog(state.board, "배틀 종료 스텝: 배틀 중 효과 소멸."),
            battle: state.battle,
          };

        // end → idle: 배틀 완전 종료, 로스터 정리 트리거
        case "end":
          return {
            phase: "idle",
            board: state.board,
            turnBanner: null,
            battleDone: true,
          };

        default:
          return state;
      }
    }
  }
}
