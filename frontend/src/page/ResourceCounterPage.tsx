import { useState } from "react";

type PlayerState = {
  level: number;
  resources: number;
  hasEx: boolean;
  turnsCompleted: number;
};

type Phase = "select-first" | "playing";

function effectiveLevel(p: PlayerState) {
  return p.level + (p.hasEx ? 1 : 0);
}

function initPlayers(firstPlayer: 1 | 2): [PlayerState, PlayerState] {
  const p1HasEx = firstPlayer === 2;
  const p2HasEx = firstPlayer === 1;
  return [
    { level: 1, resources: p1HasEx ? 2 : 1, hasEx: p1HasEx, turnsCompleted: 0 },
    { level: 1, resources: p2HasEx ? 2 : 1, hasEx: p2HasEx, turnsCompleted: 0 },
  ];
}

export function ResourceCounterPage() {
  const [phase, setPhase] = useState<Phase>("select-first");
  const [firstPlayer, setFirstPlayer] = useState<1 | 2>(1);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [turnStarted, setTurnStarted] = useState(true);
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([
    { level: 0, resources: 0, hasEx: false, turnsCompleted: 0 },
    { level: 0, resources: 0, hasEx: false, turnsCompleted: 0 },
  ]);

  function selectFirst(player: 1 | 2) {
    setFirstPlayer(player);
    setCurrentTurn(player);
    setTurnStarted(true);
    setPlayers(initPlayers(player));
    setPhase("playing");
  }

  function handleStartTurn() {
    const idx = currentTurn - 1;
    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      const p = next[idx];
      const newLevel = p.level + 1;
      const newEffLevel = newLevel + (p.hasEx ? 1 : 0);
      next[idx] = {
        ...p,
        level: newLevel,
        resources: newLevel,
      };
      return next;
    });
    setTurnStarted(true);
  }

  function handleEndTurn() {
    const idx = currentTurn - 1;
    const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;
    const nextIdx = nextTurn - 1;

    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = {
        ...next[idx],
        turnsCompleted: next[idx].turnsCompleted + 1,
      };
      return next;
    });

    setCurrentTurn(nextTurn);
    // Next player's first turn (turnsCompleted === 0) is auto-started
    setTurnStarted(players[nextIdx].turnsCompleted === 0);
  }

  function adjustResource(idx: 0 | 1, delta: number) {
    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      const p = next[idx];
      next[idx] = {
        ...p,
        resources: Math.max(
          0,
          Math.min(effectiveLevel(p), p.resources + delta),
        ),
      };
      return next;
    });
  }

  function useEx(idx: 0 | 1) {
    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      const p = next[idx];
      next[idx] = {
        ...p,
        hasEx: false,
        resources: Math.min(p.resources, p.level),
      };
      return next;
    });
  }

  function resetGame() {
    setPhase("select-first");
    setTurnStarted(true);
  }

  if (phase === "select-first") {
    return (
      <div className="flex h-[calc(100dvh-4rem)]">
        <button
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-blue-950 hover:bg-blue-900 text-white transition-colors cursor-pointer"
          onClick={() => selectFirst(1)}
        >
          <span className="text-blue-400 text-lg font-semibold tracking-widest uppercase">
            Player 1
          </span>
          <span className="text-5xl font-bold">선공</span>
        </button>

        <div className="flex flex-col items-center justify-center w-px bg-white/10 relative">
          <span className="absolute bg-[var(--bg-base)] text-[var(--sea-ink)] text-xs font-bold px-3 py-1.5 rounded-full border border-[var(--line)] whitespace-nowrap z-10">
            선공 선택
          </span>
        </div>

        <button
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-red-950 hover:bg-red-900 text-white transition-colors cursor-pointer"
          onClick={() => selectFirst(2)}
        >
          <span className="text-red-400 text-lg font-semibold tracking-widest uppercase">
            Player 2
          </span>
          <span className="text-5xl font-bold">선공</span>
        </button>
      </div>
    );
  }

  const [p1, p2] = players;
  const isP1Turn = currentTurn === 1;
  const isP2Turn = currentTurn === 2;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Player panels */}
      <div className="flex flex-1 min-h-0">
        <PlayerPanel
          playerNum={1}
          player={p1}
          isActive={isP1Turn}
          turnStarted={isP1Turn ? turnStarted : true}
          firstPlayer={firstPlayer}
          onStartTurn={handleStartTurn}
          onEndTurn={handleEndTurn}
          onAdjustResource={(d) => adjustResource(0, d)}
          onUseEx={() => useEx(0)}
        />

        <div className="w-px bg-[var(--line)]" />

        <PlayerPanel
          playerNum={2}
          player={p2}
          isActive={isP2Turn}
          turnStarted={isP2Turn ? turnStarted : true}
          firstPlayer={firstPlayer}
          onStartTurn={handleStartTurn}
          onEndTurn={handleEndTurn}
          onAdjustResource={(d) => adjustResource(1, d)}
          onUseEx={() => useEx(1)}
        />
      </div>
    </div>
  );
}

type PlayerPanelProps = {
  playerNum: 1 | 2;
  player: PlayerState;
  isActive: boolean;
  turnStarted: boolean;
  firstPlayer: 1 | 2;
  onStartTurn: () => void;
  onEndTurn: () => void;
  onAdjustResource: (delta: number) => void;
  onUseEx: () => void;
};

function PlayerPanel({
  playerNum,
  player,
  isActive,
  turnStarted,
  firstPlayer,
  onStartTurn,
  onEndTurn,
  onAdjustResource,
  onUseEx,
}: PlayerPanelProps) {
  const isFirst = firstPlayer === playerNum;

  const bgClass = playerNum === 1 ? "bg-blue-950/60" : "bg-red-950/60";
  const activeBgClass = playerNum === 1 ? "bg-blue-950/90" : "bg-red-950/90";
  const accentClass = playerNum === 1 ? "text-blue-400" : "text-red-400";
  const borderClass =
    playerNum === 1 ? "border-blue-800/50" : "border-red-800/50";
  const btnClass =
    playerNum === 1
      ? "bg-blue-700 hover:bg-blue-600 active:bg-blue-800"
      : "bg-red-700 hover:bg-red-600 active:bg-red-800";
  const dimBtnClass =
    playerNum === 1
      ? "bg-blue-900/60 hover:bg-blue-800/80"
      : "bg-red-900/60 hover:bg-red-800/80";

  return (
    <div
      className={`@conatiner flex-1 flex flex-col items-center justify-center gap-6 px-4 py-4 transition-colors ${isActive ? activeBgClass : bgClass}`}
    >
      {/* Player label */}
      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold tracking-wider ${accentClass}`}>
          PLAYER {playerNum}
        </span>
        {isFirst ? (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${borderClass} ${accentClass}`}
          >
            선공
          </span>
        ) : (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${borderClass} ${accentClass}`}
          >
            후공
          </span>
        )}
        {isActive && (
          <span className="text-xs font-medium text-green-600 animate-pulse ">
            ● 진행 중
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 items-end flex-1 w-full">
        {/* Level */}
        <div
          className={`flex flex-col flex-1 items-center gap-1 px-2 py-2 rounded-xl border ${borderClass} bg-black/20 h-full`}
        >
          <span className="text-xs font-semibold text-white/50 tracking-widest uppercase">
            Level
          </span>
          <span
            className={`flex items-center flex-1 text-[15cqw] font-bold tabular-nums h-[15cqw] leading-[15cqw] ${accentClass}`}
          >
            {effectiveLevel(player)}
          </span>
          {player.hasEx ? (
            <button
              type="button"
              onClick={onUseEx}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border border-yellow-600/60 bg-yellow-900/40 hover:bg-yellow-800/50 active:bg-yellow-900/70 text-yellow-300 font-bold text-sm transition-colors"
            >
              <span className="text-yellow-400 text-base">⚡</span>
              EX 리소스 사용
            </button>
          ) : null}
          {/* Turn controls */}
          {isActive && (
            <div className="flex gap-3">
              {!turnStarted ? (
                <button
                  type="button"
                  onClick={onStartTurn}
                  className={`px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-colors ${btnClass}`}
                >
                  턴 시작 (+1 레벨 / 리소스 회복)
                </button>
              ) : null}
              {turnStarted ? (
                <button
                  type="button"
                  onClick={onEndTurn}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/5 text-white/80 font-bold text-sm transition-colors border border-white/20"
                >
                  턴 종료
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Resources */}
        <div
          className={`flex flex-1 flex-col items-center gap-2 px-5 py-3 rounded-xl border ${borderClass} bg-black/20 h-full`}
        >
          <span className="text-xs font-semibold text-white/50 tracking-widest uppercase">
            Resources
          </span>

          <span
            className={`text-[15cqw] h-[15cqw] leading-[15cqw] font-bold tabular-nums w-16 text-center w-fit flex-1 items-center flex ${accentClass}`}
          >
            {player.resources}
          </span>

          <div className="flex flex-row gap-4 items-center w-full">
            <button
              type="button"
              onClick={() => onAdjustResource(-1)}
              disabled={player.resources <= 0}
              className={`flex-1 w-10 h-10 rounded-lg text-white font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-20 ${dimBtnClass}`}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => onAdjustResource(1)}
              disabled={player.resources >= effectiveLevel(player)}
              className={`flex-1 w-10 h-10 rounded-lg text-white font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-20 ${dimBtnClass}`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* EX Resource */}
    </div>
  );
}
