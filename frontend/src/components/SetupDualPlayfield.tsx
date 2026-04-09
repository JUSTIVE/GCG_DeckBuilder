import { cn } from "@/lib/utils";
import {
  BoardHalfLayout,
  ZoneBox,
  ShieldSlots,
} from "@/components/PlayfieldLayout";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SetupBoardState = {
  hasDeck: boolean;
  hasResDeck: boolean;
  handCount: number;
  shieldCount: number;
  hasBase: boolean;
  hasExRes: boolean;
};

export type SetupHandImages = readonly (string | null | undefined)[];
export type MulliganPhase =
  | "idle"
  | "returning"
  | "shuffling"
  | "drawing"
  | "done";
export type DrawPhase = "initial" | "drawing" | "done";
export type OrderPhase = "idle" | "p1" | "both";
export type SetupHighlight =
  | "deck"
  | "order"
  | "hand"
  | "mulligan"
  | "shield"
  | "base"
  | "exres"
  | "start";

// ── Highlight color map ───────────────────────────────────────────────────────

export const HL: Record<
  SetupHighlight,
  { bg: string; text: string; border: string }
> = {
  deck: { bg: "bg-slate-500", text: "text-white", border: "border-slate-400" },
  order: {
    bg: "bg-violet-500",
    text: "text-white",
    border: "border-violet-400",
  },
  hand: { bg: "bg-green-500", text: "text-white", border: "border-green-400" },
  mulligan: {
    bg: "bg-amber-400",
    text: "text-white",
    border: "border-amber-300",
  },
  shield: { bg: "bg-blue-500", text: "text-white", border: "border-blue-400" },
  base: {
    bg: "bg-neutral-500",
    text: "text-white",
    border: "border-neutral-400",
  },
  exres: { bg: "bg-teal-500", text: "text-white", border: "border-teal-400" },
  start: { bg: "bg-red-500", text: "text-white", border: "border-red-400" },
};

// ── HandStrip ─────────────────────────────────────────────────────────────────

function HandStrip({
  count,
  accent,
  mulligan,
  flipped,
  cardImages,
  mulliganPhase,
  drawPhase,
}: {
  count: number;
  accent: boolean;
  mulligan: boolean;
  flipped: boolean;
  cardImages?: SetupHandImages;
  mulliganPhase?: MulliganPhase;
  drawPhase?: DrawPhase;
}) {
  const isReturning = mulliganPhase === "returning";
  const isShuffling = mulliganPhase === "shuffling";
  const isDrawing = mulliganPhase === "drawing";
  const isDrawInitial = drawPhase === "initial";
  const isDrawAnimating = drawPhase === "drawing";

  const cards = Array.from({ length: 5 }, (_, i) => {
    const url = cardImages?.[i];
    const flyY = flipped ? "55px" : "-55px";

    let transform = "translateY(0px) scale(1)";
    let opacity: number | undefined;
    let transition = `transform 300ms ease, opacity 300ms ease`;
    let transitionDelay = `${i * 35}ms`;

    if (isReturning) {
      transform = `translateY(${flyY}) scale(0.1)`;
      opacity = 0;
      transition = `transform 380ms ease-in, opacity 300ms ease`;
      transitionDelay = `${i * 45}ms`;
    } else if (isShuffling) {
      transform = `translateY(${flyY}) scale(0.1)`;
      opacity = 0;
      transition = `none`;
      transitionDelay = `0ms`;
    } else if (isDrawing) {
      transform = `translateY(0px) scale(1)`;
      opacity = 1;
      transition = `transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 280ms ease`;
      transitionDelay = `${i * 65}ms`;
    } else if (isDrawInitial) {
      transform = `translateY(${flyY}) scale(0.1)`;
      opacity = 0;
      transition = `none`;
      transitionDelay = `0ms`;
    } else if (isDrawAnimating) {
      transform = `translateY(0px) scale(1)`;
      opacity = 1;
      transition = `transform 400ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease`;
      transitionDelay = `${i * 80}ms`;
    }

    return (
      <div
        key={i}
        className={cn(
          "rounded-[3px] border overflow-hidden",
          i < count
            ? accent
              ? "border-primary/80"
              : "border-green-300"
            : "border-dashed border-border/20 opacity-20",
          "w-[18px] h-[26px]",
        )}
        style={
          i < count
            ? { transition, transitionDelay, transform, opacity }
            : { transitionDelay: `${i * 35}ms` }
        }
      >
        {i < count && url ? (
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : i < count ? (
          <div
            className={cn(
              "w-full h-full",
              accent ? "bg-primary/40" : "bg-green-100",
            )}
          />
        ) : null}
      </div>
    );
  });

  const showMulliganBadge = mulligan && count > 0 && !mulliganPhase;
  const showShuffling = isShuffling;
  const showDrawing = isDrawing || isDrawInitial || isDrawAnimating;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded border transition-all duration-300",
        count > 0
          ? accent
            ? "border-primary/60 bg-primary/8"
            : "border-green-200 bg-green-50"
          : "border-dashed border-border/30 opacity-30",
        flipped && "flex-row-reverse",
      )}
    >
      <span
        className={cn(
          "text-[9px] font-semibold shrink-0 transition-all duration-200",
          accent ? "text-primary" : "text-green-700",
        )}
      >
        {showShuffling
          ? "셔플"
          : showDrawing
            ? "드로우"
            : `패 ${count > 0 ? `${count}장` : ""}`}
      </span>
      <div className={cn("flex gap-0.5", flipped && "flex-row-reverse")}>
        {cards}
      </div>
      {showMulliganBadge && (
        <span
          className={cn(
            "text-[8px] rounded px-1 py-0.5 font-bold shrink-0",
            accent
              ? "bg-primary/20 text-primary"
              : "bg-amber-100 text-amber-700",
          )}
        >
          멀리건?
        </span>
      )}
    </div>
  );
}

// ── SetupShieldArea ───────────────────────────────────────────────────────────

function SetupShieldArea({
  board,
  accentBase,
  accentShield,
  flipped,
}: {
  board: SetupBoardState;
  accentBase: boolean;
  accentShield: boolean;
  flipped: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 flex flex-col rounded border p-0.5 gap-0.5 transition-all duration-300",
        accentBase || accentShield
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-muted/20",
        flipped ? "flex-col-reverse" : "",
      )}
      style={{ width: 56 }}
    >
      <span className="text-[8px] text-center text-muted-foreground leading-none font-medium">
        실드 에어리어
      </span>
      <ZoneBox
        label={board.hasBase ? "EX베이스" : "베이스존"}
        sub={board.hasBase ? "HP 3" : undefined}
        active={true}
        accent={accentBase && board.hasBase}
        dim={!board.hasBase}
        className="flex-none py-1"
      />
      <div
        className={cn(
          "flex-1 rounded border p-0.5 flex flex-col gap-0.5 transition-all duration-300",
          accentShield ? "border-primary/50 bg-primary/5" : "border-border/50",
        )}
      >
        <span className="text-[8px] text-center text-muted-foreground leading-none">
          실드존
        </span>
        <ShieldSlots
          count={board.shieldCount}
          accent={accentShield}
          reversed={flipped}
        />
      </div>
    </div>
  );
}

// ── SetupHalfBoard ────────────────────────────────────────────────────────────

function SetupHalfBoard({
  board,
  flipped,
  accentDeck,
  accentBase,
  accentShield,
  accentExRes,
  deckShuffling,
  battleContent,
}: {
  board: SetupBoardState;
  flipped: boolean;
  accentDeck: boolean;
  accentBase: boolean;
  accentShield: boolean;
  accentExRes: boolean;
  deckShuffling?: boolean;
  battleContent?: React.ReactNode;
}) {
  const resArea = (
    <div
      className={cn(
        "flex-[4] h-full rounded border flex flex-col items-center justify-center transition-all duration-300",
        board.hasExRes
          ? accentExRes
            ? "bg-primary/15 border-primary text-primary"
            : "bg-teal-50 border-teal-200 text-teal-700"
          : "border-border/50 bg-background",
      )}
    >
      <span className="text-[9px] font-semibold leading-none">리소스</span>
      {board.hasExRes && (
        <span
          className={cn(
            "text-[8px] mt-0.5 rounded px-1 font-bold",
            accentExRes ? "bg-primary/20" : "bg-teal-100",
          )}
        >
          EX×1
        </span>
      )}
    </div>
  );

  return (
    <BoardHalfLayout
      flipped={flipped}
      slots={{
        shieldArea: (
          <SetupShieldArea
            board={board}
            accentBase={accentBase}
            accentShield={accentShield}
            flipped={flipped}
          />
        ),
        battle: (
          <ZoneBox
            label="배틀 에어리어"
            active={true}
            className="flex-[3] h-full"
          >
            {battleContent}
          </ZoneBox>
        ),
        deck: (
          <ZoneBox
            label={deckShuffling ? "셔플 중" : "덱"}
            sub={board.hasDeck && !deckShuffling ? "50장" : undefined}
            active={board.hasDeck}
            accent={(accentDeck && board.hasDeck) || deckShuffling}
            className="flex-[1] h-full"
            animation={
              deckShuffling ? "deck-shuffle 0.42s ease-in-out 2" : undefined
            }
          />
        ),
        resDeck: (
          <ZoneBox
            label="리소스덱"
            sub={board.hasResDeck ? "10장" : undefined}
            active={board.hasResDeck}
            accent={accentDeck && board.hasResDeck}
            className="flex-[2] h-full"
          />
        ),
        resource: resArea,
        trash: (
          <ZoneBox label="트래시" active={true} className="flex-[2] h-full" />
        ),
      }}
    />
  );
}

// ── SetupDualPlayfield ────────────────────────────────────────────────────────

export function SetupDualPlayfield({
  p1,
  p2,
  hl,
  p1Label,
  p2Label,
  p1HandImages,
  p2HandImages,
  mulliganPhase,
  drawPhase,
  orderPhase,
  p1BattleContent,
  p2BattleContent,
}: {
  p1: SetupBoardState;
  p2: SetupBoardState;
  hl: SetupHighlight;
  p1Label: string;
  p2Label: string;
  p1HandImages?: SetupHandImages;
  p2HandImages?: SetupHandImages;
  mulliganPhase?: MulliganPhase;
  drawPhase?: DrawPhase;
  orderPhase?: OrderPhase;
  p1BattleContent?: React.ReactNode;
  p2BattleContent?: React.ReactNode;
}) {
  const accent = (zone: SetupHighlight) => hl === zone;
  const deckShuffling = mulliganPhase === "shuffling";

  return (
    <div className="flex flex-col gap-0.5 text-[10px] select-none">
      {/* ── P2 (top) ── */}
      <div className="flex flex-col gap-0.5 rounded-md bg-blue-50/60 px-1.5 pt-1 pb-1.5">
        <HandStrip
          count={p2.handCount}
          accent={accent("hand") || accent("mulligan")}
          mulligan={accent("mulligan")}
          flipped={true}
          cardImages={p2HandImages}
          mulliganPhase={mulliganPhase}
          drawPhase={drawPhase}
        />
        <div
          className={cn(
            "text-center text-[10px] font-bold py-0.5 rounded transition-all duration-300",
            (accent("order") ? orderPhase === "both" : false)
              ? cn(HL[hl].bg, HL[hl].text)
              : "text-muted-foreground",
          )}
        >
          {p2Label}
        </div>
        <SetupHalfBoard
          board={p2}
          flipped={true}
          accentDeck={accent("deck")}
          accentBase={accent("base")}
          accentShield={accent("shield")}
          accentExRes={accent("exres")}
          deckShuffling={deckShuffling}
          battleContent={p2BattleContent}
        />
      </div>

      {/* ── CENTER DIVIDER ── */}
      <div className="flex items-center gap-2 py-0.5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[9px] text-muted-foreground font-medium px-1">
          VS
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── P1 (bottom) ── */}
      <div className="flex flex-col gap-0.5 rounded-md bg-rose-50/60 px-1.5 pt-1.5 pb-1">
        <SetupHalfBoard
          board={p1}
          flipped={false}
          accentDeck={accent("deck")}
          accentBase={accent("base")}
          accentShield={accent("shield")}
          accentExRes={accent("exres")}
          deckShuffling={deckShuffling}
          battleContent={p1BattleContent}
        />
        <div
          className={cn(
            "text-center text-[10px] font-bold py-0.5 rounded transition-all duration-300",
            (accent("order")
              ? orderPhase === "p1" || orderPhase === "both"
              : false) || accent("start")
              ? cn(HL[hl].bg, HL[hl].text)
              : "text-muted-foreground",
          )}
        >
          {p1Label}
        </div>
        <HandStrip
          count={p1.handCount}
          accent={accent("hand") || accent("mulligan")}
          mulligan={accent("mulligan")}
          flipped={false}
          cardImages={p1HandImages}
          drawPhase={drawPhase}
          mulliganPhase={mulliganPhase}
        />
      </div>
    </div>
  );
}
