import { useState } from "react";

type PlayerState = {
  level: number;
  resources: number;
  Ex: {
    usedTurn: number | null;
  } | null;
  turnsCompleted: number;
};

type Phase = "select-first" | "playing";

function effectiveLevel(p: PlayerState) {
  return (
    p.level +
    ((
      p.Ex != null
        ? p.Ex.usedTurn == null
          ? true
          : p.Ex.usedTurn <= p.turnsCompleted + 1
        : false
    )
      ? 1
      : 0)
  );
}

function initPlayers(firstPlayer: PlayerTurn): [PlayerState, PlayerState] {
  const p1HasEx = firstPlayer === "p2";
  const p2HasEx = firstPlayer === "p1";
  return [
    {
      level: 0,
      resources: p1HasEx ? 0 : 0,
      Ex: p1HasEx ? { usedTurn: null } : null,
      turnsCompleted: 0,
    },
    {
      level: 0,
      resources: p2HasEx ? 0 : 0,
      Ex: p2HasEx ? { usedTurn: null } : null,
      turnsCompleted: 0,
    },
  ];
}

type PlayerTurn = "p1" | "p2";

export function ResourceCounterPage() {
  const [phase, setPhase] = useState<Phase>("select-first");
  const [firstPlayer, setFirstPlayer] = useState<PlayerTurn>("p1");
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>("p1");
  const [turnStarted, setTurnStarted] = useState(false);
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([
    { level: 0, resources: 0, Ex: null, turnsCompleted: 0 },
    { level: 0, resources: 0, Ex: null, turnsCompleted: 0 },
  ]);

  function selectFirst(player: PlayerTurn) {
    setFirstPlayer(player);
    setCurrentTurn(player);
    setPlayers(initPlayers(player));
    setPhase("playing");
  }

  function handleStartTurn() {
    const idx = currentTurn === "p1" ? 0 : 1;
    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      const p = next[idx];
      const newLevel = p.level + 1;
      const newEffLevel = newLevel;
      next[idx] = {
        ...p,
        level: newLevel,
        resources: newEffLevel,
      };
      return next;
    });
    setTurnStarted(true);
  }

  function handleEndTurn() {
    const idx = currentTurn === "p1" ? 0 : 1;
    const nextTurn: PlayerTurn = currentTurn === "p1" ? "p2" : "p1";

    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = {
        ...next[idx],
        turnsCompleted: next[idx].turnsCompleted + 1,
      };
      return next;
    });

    setCurrentTurn(nextTurn);
    setTurnStarted(false);
    // Next player's first turn (turnsCompleted === 0) is auto-started
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

  function activateEx(idx: 0 | 1) {
    setPlayers((prev) => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      const p = next[idx];
      next[idx] = {
        ...p,
        Ex: {
          usedTurn: p.turnsCompleted + 1,
        },
        resources: Math.min(p.resources, p.level),
      };
      return next;
    });
  }

  if (phase === "select-first") {
    return (
      <div className="flex h-[calc(100dvh-4rem)]">
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-blue-950 hover:bg-blue-900 text-white transition-colors cursor-pointer"
          onClick={() => selectFirst("p1")}
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
          type="button"
          className="flex-1 flex flex-col items-center justify-center gap-3 bg-red-950 hover:bg-red-900 text-white transition-colors cursor-pointer"
          onClick={() => selectFirst("p2")}
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
  const isP1Turn = currentTurn === "p1";
  const isP2Turn = currentTurn === "p2";

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Player panels */}
      <div className="flex flex-1 min-h-0">
        <PlayerPanel
          playerId={"p1"}
          player={p1}
          isActive={isP1Turn}
          turnStarted={isP1Turn ? turnStarted : true}
          firstPlayer={firstPlayer}
          onStartTurn={handleStartTurn}
          onEndTurn={handleEndTurn}
          onAdjustResource={(d) => adjustResource(0, d)}
          onUseEx={() => activateEx(0)}
        />

        <div className="w-px bg-[var(--line)]" />

        <PlayerPanel
          playerId={"p2"}
          player={p2}
          isActive={isP2Turn}
          turnStarted={isP2Turn ? turnStarted : true}
          firstPlayer={firstPlayer}
          onStartTurn={handleStartTurn}
          onEndTurn={handleEndTurn}
          onAdjustResource={(d) => adjustResource(1, d)}
          onUseEx={() => activateEx(1)}
        />
      </div>
    </div>
  );
}

type PlayerPanelProps = {
  playerId: PlayerTurn;

  player: PlayerState;
  isActive: boolean;
  turnStarted: boolean;
  firstPlayer: PlayerTurn;
  onStartTurn: () => void;
  onEndTurn: () => void;
  onAdjustResource: (delta: number) => void;
  onUseEx: () => void;
};

function PlayerPanel({
  playerId,
  player,
  isActive,
  turnStarted,
  firstPlayer,
  onStartTurn,
  onEndTurn,
  onAdjustResource,
  onUseEx,
}: PlayerPanelProps) {
  const isFirst = firstPlayer === playerId;
  const isP1 = playerId === "p1";

  const bgClass = isP1 ? "bg-blue-950/60" : "bg-red-950/60";
  const activeBgClass = isP1 ? "bg-blue-950/90" : "bg-red-950/90";
  const accentClass = isP1 ? "text-blue-400" : "text-red-400";
  const borderClass = isP1 ? "border-blue-800/50" : "border-red-800/50";
  const btnClass = isP1
    ? "bg-blue-700 hover:bg-blue-600 active:bg-blue-800"
    : "bg-red-700 hover:bg-red-600 active:bg-red-800";
  const dimBtnClass = isP1
    ? "bg-blue-900/60 hover:bg-blue-800/80"
    : "bg-red-900/60 hover:bg-red-800/80";

  console.log(playerId, player, isActive);

  const isExAvailable =
    player.Ex != null
      ? player.Ex.usedTurn == null
        ? true
        : player.Ex.usedTurn > player.turnsCompleted + 1
      : null;

  return (
    <div
      className={`@conatiner flex-1 flex flex-col items-center justify-center gap-6 px-4 py-4 transition-colors ${isActive ? activeBgClass : bgClass}`}
    >
      {/* Player label */}
      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold tracking-wider ${accentClass}`}>
          PLAYER {playerId === "p1" ? "1" : "2"}
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

          {/* Turn controls */}
          {isActive ? (
            <>
              {turnStarted && isExAvailable ? (
                <button
                  type="button"
                  onClick={onUseEx}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl border border-yellow-600/60 bg-yellow-900/40 hover:bg-yellow-800/50 active:bg-yellow-900/70 text-yellow-300 font-bold text-sm transition-colors w-full justify-center"
                >
                  <span className="text-yellow-400 text-base">⚡</span>
                  EX 리소스 사용
                </button>
              ) : null}
              {!turnStarted ? (
                <button
                  type="button"
                  onClick={onStartTurn}
                  className={`w-full px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-colors ${btnClass}`}
                >
                  턴 시작 (+1 레벨 / 리소스 회복)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEndTurn}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/5 text-white/80 font-bold text-sm transition-colors border border-white/20 w-full"
                >
                  턴 종료
                </button>
              )}
            </>
          ) : null}
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
