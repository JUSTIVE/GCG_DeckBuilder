import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PencilIcon,
  CheckIcon,
  XIcon,
  MinusIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  Trash2Icon,
  FileSpreadsheetIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_BG, COLOR_HEX } from "src/render/color";
import { CostHistogram, LevelHistogram } from "@/components/DeckHistograms";
import { extractCardInfo } from "@/lib/cardInfo";
import { encodeDeckCode, decodeDeckCode } from "@/lib/deckCode";
import { downloadDeckExcel } from "@/lib/deckExcel";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const KIND_ORDER = ["UnitCard", "PilotCard", "BaseCard", "CommandCard"] as const;
function getKindLabel(kind: string): string {
  const map: Record<string, string> = {
    UnitCard: i18n.t("kind.UNIT", { ns: "game" }),
    PilotCard: i18n.t("kind.PILOT", { ns: "game" }),
    BaseCard: i18n.t("kind.BASE", { ns: "game" }),
    CommandCard: i18n.t("kind.COMMAND", { ns: "game" }),
  };
  return map[kind] ?? kind;
}

export type DeckPanelProps = {
  deckName: string;
  colors: string[];
  cards: readonly {
    count: number;
    card: any;
    pilotLinked?: boolean;
    hasLinkingUnit?: boolean;
  }[];
  totalCards: number;
  errorMessage: string | null;
  onRemove: (cardId: string) => void;
  onRename: (name: string) => void;
  onSetCards: (cards: { cardId: string; count: number }[]) => void;
  onOpenCard: (cardId: string) => void;
  scrollAll?: boolean;
};

export function DeckPanel({
  deckName,
  colors,
  cards,
  totalCards,
  errorMessage,
  onRemove,
  onRename,
  onSetCards,
  onOpenCard,
  scrollAll = false,
}: DeckPanelProps) {
  const { t, i18n } = useTranslation("common");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState(false);

  function startEditing() {
    setEditName(deckName);
    setEditing(true);
  }
  function commitEdit() {
    const name = editName.trim();
    if (name && name !== deckName) onRename(name);
    setEditing(false);
  }

  const grouped = new Map<
    string,
    { count: number; card: any; pilotLinked?: boolean; hasLinkingUnit?: boolean }[]
  >();
  for (const k of KIND_ORDER) grouped.set(k, []);
  for (const dc of cards) {
    const t = dc.card?.__typename;
    if (grouped.has(t)) grouped.get(t)!.push(dc);
  }

  return (
    <div className={scrollAll ? "flex flex-col" : "flex flex-col h-full"}>
      {editing ? (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0",
            scrollAll && "sticky top-0 z-10 bg-background",
          )}
        >
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex-1 h-7 text-sm font-bold"
            autoFocus
          />
          <Button size="icon-sm" onClick={commitEdit}>
            <CheckIcon />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
            <XIcon />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 pt-3 pb-2 shrink-0",
            scrollAll && "sticky top-0 z-10 bg-background",
          )}
        >
          <h2 className="font-bold text-sm flex-1 truncate">{deckName}</h2>
          <div className="flex gap-1 shrink-0">
            {colors.map((color) => (
              <span
                key={color}
                className={cn(
                  "inline-block w-2.5 h-2.5 rounded-full",
                  COLOR_BG[color],
                  color === "WHITE" && "border border-gray-200",
                )}
              />
            ))}
          </div>
          <Button size="icon-sm" variant="ghost" onClick={startEditing}>
            <PencilIcon />
          </Button>
          {cards.length > 0 && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                if (confirm(t("deck.confirmClear"))) onSetCards([]);
              }}
            >
              <Trash2Icon className="text-destructive" />
            </Button>
          )}
        </div>
      )}

      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {t("deck.cardCountOf", { count: totalCards, max: 50 })}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round((totalCards / 50) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              totalCards >= 50 ? "bg-green-500" : "bg-primary",
            )}
            style={{ width: `${Math.min((totalCards / 50) * 100, 100)}%` }}
          />
        </div>
      </div>

      <LevelHistogram cards={cards} />
      <CostHistogram cards={cards} />

      {errorMessage && (
        <div className="mx-3 mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive shrink-0">
          {errorMessage}
        </div>
      )}

      <div className={scrollAll ? "px-2 pb-4" : "flex-1 min-h-0 overflow-y-auto px-2 pb-4"}>
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">{t("deck.noCards")}</p>
        )}
        {KIND_ORDER.map((kind) => {
          const group = grouped.get(kind) ?? [];
          if (group.length === 0) return null;
          const groupTotal = group.reduce((s, c) => s + c.count, 0);
          return (
            <div key={kind} className="mb-3">
              <div className="px-1 mb-1 text-xs font-semibold text-muted-foreground">
                {getKindLabel(kind)} ({groupTotal})
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.map((dc, i) => {
                  const info = extractCardInfo(dc.card, i18n.language);
                  if (!info) return null;
                  return (
                    <li
                      key={`${info.id}-${i}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
                    >
                      <div className="relative shrink-0">
                        <button type="button" className="block" onClick={() => onOpenCard(info.id)}>
                          <img
                            className="h-10 w-8 rounded object-cover cutout cutout-br-md"
                            src={info.imageUrl?.replace(/\.webp$/, "-sm.webp") ?? undefined}
                            style={{
                              backgroundColor: COLOR_HEX[info.color]
                                ? `${COLOR_HEX[info.color]}33`
                                : "var(--muted)",
                            }}
                            alt={info.name}
                          />
                        </button>
                        {info.level != null && (
                          <div className="absolute top-0 left-0 w-4 h-4 rounded-br bg-black/70 text-[9px] font-bold flex items-center justify-center text-white/80 leading-none">
                            {info.level}
                          </div>
                        )}
                        <div
                          className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-tl text-[9px] font-bold flex items-center justify-center leading-none",
                            COLOR_BG[info.color] ?? "bg-gray-500",
                            info.color === "WHITE"
                              ? "text-gray-700 border-t border-l border-gray-200"
                              : "text-white",
                          )}
                        >
                          {info.cost ?? "-"}
                        </div>
                      </div>
                      <span className="flex-1 min-w-0 flex flex-col text-xs">
                        <div className="truncate">{info.name}</div>
                        <div className="truncate text-muted-foreground">{info.id}</div>
                        {dc.pilotLinked === false && (
                          <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangleIcon className="size-3 shrink-0" />
                            {t("deck.linkWarning.unitNoPilot")}
                          </div>
                        )}
                        {dc.hasLinkingUnit === false && (
                          <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangleIcon className="size-3 shrink-0" />
                            {t("deck.linkWarning.pilotNoUnit")}
                          </div>
                        )}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground w-5 text-center">
                        ×{dc.count}
                      </span>
                      <Button variant="ghost" size="icon-xs" onClick={() => onRemove(info.id)}>
                        <MinusIcon className="text-muted-foreground" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "px-3 pb-3 shrink-0 border-t border-border pt-3 flex flex-col gap-2",
          scrollAll && "sticky bottom-0 bg-background",
        )}
      >
        <Button
          className="w-full"
          size="sm"
          disabled={totalCards !== 50}
          onClick={() => {
            const text = cards
              .map((dc) => {
                const id = (dc.card as any)?.id;
                return id ? `${dc.count}X ${id}` : null;
              })
              .filter(Boolean)
              .join("\n");
            navigator.clipboard.writeText(text);
          }}
        >
          <ClipboardCopyIcon className="size-3.5" />
          {t("deck.copyMsaCode")}
        </Button>
        {i18n.language !== "en" && (
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            disabled={totalCards !== 50}
            onClick={() => downloadDeckExcel(deckName, cards)}
          >
            <FileSpreadsheetIcon className="size-3.5" />
            {t("deck.downloadExcel")}
          </Button>
        )}
        <div className="flex gap-1.5">
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(encodeDeckCode(cards))}
          >
            <ClipboardCopyIcon className="size-3.5" />
            {t("deck.copyDeckCode")}
          </Button>
          <Button
            className="flex-1"
            size="sm"
            variant="outline"
            onClick={() => {
              setPasteOpen((v) => !v);
              setPasteValue("");
              setPasteError(false);
            }}
          >
            <ClipboardPasteIcon className="size-3.5" />
            {t("deck.importDeckCode")}
          </Button>
        </div>
        {pasteOpen && (
          <div className="flex flex-col gap-1.5">
            <textarea
              className={cn(
                "w-full rounded-md border bg-background px-2 py-1.5 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring",
                pasteError && "border-destructive focus:ring-destructive",
              )}
              rows={3}
              placeholder={t("deck.pasteDeckCode")}
              value={pasteValue}
              onChange={(e) => {
                setPasteValue(e.target.value);
                setPasteError(false);
              }}
            />
            {pasteError && (
              <p className="text-[10px] text-destructive">{t("deck.invalidDeckCode")}</p>
            )}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  const cards = decodeDeckCode(pasteValue);
                  if (!cards) {
                    setPasteError(true);
                    return;
                  }
                  onSetCards(cards);
                  setPasteOpen(false);
                  setPasteValue("");
                }}
              >
                <CheckIcon className="size-3.5" />
                {t("action.import")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
