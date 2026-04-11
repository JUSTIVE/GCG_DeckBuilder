import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  BoardHalfLayout,
  ZoneBox,
  ShieldSlots,
  PlayerSection,
  VsDivider,
} from "@/components/PlayfieldLayout";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DualBoardState = {
  shieldCount: number; // 0–6
  hasBase?: boolean; // default true
  baseHp?: number; // 베이스 HP (표시용, 없으면 숨김)
};

/** Which zone type to highlight on both halves. null = no highlight. */
export type DualAccent = "shield" | "base" | "battle" | null;

// ── DualShieldArea ────────────────────────────────────────────────────────────

function DualShieldArea({
  board,
  accent,
  flipped,
  dataTarget,
}: {
  board: DualBoardState;
  accent: DualAccent;
  flipped: boolean;
  dataTarget?: string;
}) {
  const accentShield = accent === "shield";
  const accentBase = accent === "base";
  const hasBase = board.hasBase !== false;

  const { t } = useTranslation("game");
  const [hitKey, setHitKey] = useState(0);
  const prevShieldCount = useRef(board.shieldCount);
  useEffect(() => {
    if (board.shieldCount < prevShieldCount.current) setHitKey((k) => k + 1);
    prevShieldCount.current = board.shieldCount;
  }, [board.shieldCount]);

  return (
    <div
      key={hitKey}
      data-target={dataTarget}
      className={cn(
        "shrink-0 flex flex-col rounded border p-0.5 gap-0.5 transition-all duration-300 bg-white",
        accentShield || accentBase ? "border-orange-400/50" : "border-border",
        flipped ? "flex-col-reverse" : "",
      )}
      style={{ width: 56, animation: hitKey > 0 ? "card-hit 320ms ease" : undefined }}
    >
      <span className="text-[8px] text-center text-muted-foreground leading-none font-medium">
        {t("area.shieldArea")}
      </span>
      <ZoneBox
        label={t("area.baseZone")}
        sub={board.baseHp !== undefined && hasBase ? `HP ${board.baseHp}` : undefined}
        active={hasBase}
        accent={accentBase && hasBase}
        dim={!hasBase}
        className="flex-none py-1"
      />
      <div
        className={cn(
          "flex-1 rounded border p-0.5 flex flex-col gap-0.5 transition-all duration-300",
          accentShield ? "border-orange-400/50" : "border-border/50",
        )}
      >
        <span className="text-[8px] text-center text-muted-foreground leading-none">
          {t("area.shieldZone")}
        </span>
        <ShieldSlots count={board.shieldCount} accent={accentShield} reversed={flipped} />
      </div>
    </div>
  );
}

// ── DualHalfBoard ─────────────────────────────────────────────────────────────

function DualHalfBoard({
  board,
  flipped,
  accent,
  battleContent,
}: {
  board: DualBoardState;
  flipped: boolean;
  accent: DualAccent;
  battleContent?: React.ReactNode;
}) {
  const { t } = useTranslation("game");
  return (
    <BoardHalfLayout
      flipped={flipped}
      slots={{
        shieldArea: (
          <DualShieldArea
            board={board}
            accent={accent}
            flipped={flipped}
            dataTarget={flipped ? "p2-shield" : "p1-shield"}
          />
        ),
        battle: (
          <ZoneBox
            label={t("area.battle")}
            active={true}
            accent={accent === "battle"}
            className="flex-[3] h-full"
          >
            {battleContent}
          </ZoneBox>
        ),
        deck: <ZoneBox label={t("area.deck")} active={true} className="flex-[1] h-full" />,
        resDeck: (
          <ZoneBox label={t("area.resourceDeck")} active={true} className="flex-[2] h-full" />
        ),
        resource: <ZoneBox label={t("area.resource")} active={true} className="flex-[4] h-full" />,
        trash: (
          <ZoneBox
            label={t("area.trash")}
            active={true}
            className="flex-[2] h-full"
            data-trash={flipped ? "p2" : "p1"}
          />
        ),
      }}
    />
  );
}

// ── DualPlayfield ─────────────────────────────────────────────────────────────
// 순수 보드 레이아웃. 셋업 전용 요소(핸드스트립, 멀리건 페이즈 등) 없음.

export function DualPlayfield({
  p1,
  p2,
  p1Battle,
  p2Battle,
  p1Label = "나",
  p2Label = "상대",
  accent = null,
  p2Accent,
}: {
  p1: DualBoardState;
  p2: DualBoardState;
  p1Battle?: React.ReactNode;
  p2Battle?: React.ReactNode;
  p1Label?: string;
  p2Label?: string;
  accent?: DualAccent;
  /** P2 전용 accent. 지정 시 accent를 오버라이드. */
  p2Accent?: DualAccent;
}) {
  return (
    <div className="dual-playfield flex flex-col gap-0.5 text-[10px] select-none">
      <PlayerSection player="p2">
        <div className="text-center text-[10px] font-bold py-0.5 text-muted-foreground">
          {p2Label}
        </div>
        <DualHalfBoard
          board={p2}
          flipped={true}
          accent={p2Accent !== undefined ? p2Accent : accent}
          battleContent={p2Battle}
        />
      </PlayerSection>

      <VsDivider />

      <PlayerSection player="p1">
        <DualHalfBoard board={p1} flipped={false} accent={accent} battleContent={p1Battle} />
        <div className="text-center text-[10px] font-bold py-0.5 text-muted-foreground">
          {p1Label}
        </div>
      </PlayerSection>
    </div>
  );
}
