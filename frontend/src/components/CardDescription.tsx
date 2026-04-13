import { cn } from "@/lib/utils";
import { useRouter, useParams } from "@tanstack/react-router";
import {
  ALL_KEYWORDS,
  TRIGGER_KEYWORD_SET,
  ABILITY_KEYWORD_SET,
  type CardKeyword,
} from "@/lib/gameConstants";
import { renderKeyword } from "@/render/keyword";
import i18n from "@/i18n";

// ─── Styles (CardKeyword enum 키) ─────────────────────────────────────────────

const TRIGGER_STYLES: Partial<Record<CardKeyword, string>> = {
  ACTIVATE_MAIN: "bg-blue-300 text-gray-800",
  ACTIVATE_ACTION: "bg-blue-300 text-gray-800",
  MAIN: "bg-blue-300 text-gray-800",
  ACTION: "bg-blue-300 text-gray-800",
  BURST: "bg-orange-400 text-white",
  DEPLOY: "bg-teal-500 text-gray-800",
  ATTACK: "bg-teal-500 text-gray-800",
  DESTROYED: "bg-teal-500 text-gray-800",
  WHEN_PAIRED: "bg-pink-400 text-gray-800 saturate-50",
  DURING_PAIR: "bg-pink-400 text-gray-800 saturate-50",
  PILOT: "bg-pink-400 text-gray-800 saturate-50",
  WHEN_LINKED: "bg-yellow-300 text-gray-800",
  DURING_LINK: "bg-yellow-300 text-gray-800",
  ONCE_PER_TURN: "bg-red-700 text-white",
};

const ABILITY_STYLES: Partial<Record<CardKeyword, string>> = {
  BLOCKER: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  HIGH_MANEUVER: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  FIRST_STRIKE: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  SUPPRESSION: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  BREACH: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  REPAIR: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  SUPPORT: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
};

export const TRIGGER_FALLBACK = "bg-white/20 text-white";
export const ABILITY_FALLBACK = "border-white/30 bg-white/5 text-white/80";

// ─── Keyword map — 외부 callers(DeckListPage, KeywordsPage, RulesPage)용 ───────
// triggerClass(text) / abilityClass(text) 시그니처 유지

// Derived from ko locale — single source of truth with game.json keyword.*
const ko = (kw: CardKeyword) => i18n.t(`keyword.${kw}`, { lng: "ko", ns: "game" });

const TRIGGER_KEYWORD_MAP: Array<[string, CardKeyword]> = ALL_KEYWORDS.filter((kw) =>
  TRIGGER_KEYWORD_SET.has(kw),
).map((kw) => [ko(kw), kw]);

const ABILITY_KEYWORD_MAP: Array<[string, CardKeyword]> = ALL_KEYWORDS.filter((kw) =>
  ABILITY_KEYWORD_SET.has(kw),
).flatMap((kw) => {
  const text = ko(kw);
  // "선제 공격" (띄어쓰기 있는 표기)이 일부 카드 텍스트에서 사용됨
  if (kw === "FIRST_STRIKE")
    return [
      [text, kw],
      ["선제 공격", kw],
    ] as [string, CardKeyword][];
  return [[text, kw]] as [string, CardKeyword][];
});

function findKeyword(text: string, map: Array<[string, CardKeyword]>): CardKeyword | null {
  for (const [k, v] of map) {
    if (text === k || text.startsWith(k)) return v;
  }
  return null;
}

export function triggerClass(text: string): string {
  const keyword = findKeyword(text, TRIGGER_KEYWORD_MAP);
  return (keyword && TRIGGER_STYLES[keyword]) ?? TRIGGER_FALLBACK;
}

export function abilityClass(text: string): string {
  const keyword = findKeyword(text, ABILITY_KEYWORD_MAP);
  return (keyword && ABILITY_STYLES[keyword]) ?? ABILITY_FALLBACK;
}

export function triggerClassByKeyword(keyword: CardKeyword): string {
  return TRIGGER_STYLES[keyword] ?? TRIGGER_FALLBACK;
}

export function abilityClassByKeyword(keyword: CardKeyword): string {
  return ABILITY_STYLES[keyword] ?? ABILITY_FALLBACK;
}

// ─── Token types (3.processed.json 구조와 일치) ───────────────────────────────

export type DescriptionToken =
  | { type: "trigger"; keyword: string; qualifier?: { en: string; ko: string } }
  | { type: "ability"; keyword: string; n?: number }
  | { type: "prose"; text: { en: string; ko: string } };

export type DescriptionLine = readonly DescriptionToken[];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  lines: readonly (readonly DescriptionToken[])[];
  className?: string;
  borderClass?: string;
};

export function CardDescription({ lines, className, borderClass }: Props) {
  const router = useRouter();
  const { locale = "ko" } = useParams({ strict: false });
  const proseLocale = locale === "en" ? "en" : "ko";

  function navigateKeyword(keyword: CardKeyword) {
    router.navigate({
      to: "/$locale/cardlist",
      params: { locale },
      search: { keyword: [keyword] },
      replace: true,
    });
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {lines.map((tokens, i) => (
        <li key={i} className="text-xs leading-relaxed ">
          {tokens.map((token, j) => {
            if (token.type === "trigger") {
              const keyword = token.keyword as CardKeyword;
              const qualifier = token?.qualifier?.[proseLocale] ?? "";
              return (
                <span
                  key={j}
                  onClick={() => navigateKeyword(keyword)}
                  className={cn(
                    "inline-flex align-middle items-center rounded mx-0.5 px-1.5 py-0.5 text-[10px] font-semibold leading-none cursor-pointer hover:brightness-110",
                    TRIGGER_STYLES[keyword.toUpperCase() as CardKeyword] ?? TRIGGER_FALLBACK,
                  )}
                >
                  {renderKeyword(keyword)}
                  {qualifier ?? ""}
                </span>
              );
            }

            if (token.type === "ability") {
              const keyword = token.keyword as CardKeyword;
              const label =
                renderKeyword(keyword) + (token.n !== undefined ? ` ${token?.n ?? ""}` : "");
              return (
                <span
                  key={j}
                  onClick={() => navigateKeyword(keyword)}
                  className={cn(
                    "inline-flex align-middle items-center rounded border mx-0.5 px-1.5 py-0.5 text-[10px] leading-none cursor-pointer hover:brightness-110",
                    ABILITY_STYLES[keyword] ?? ABILITY_FALLBACK,
                    borderClass,
                  )}
                >
                  {label}
                </span>
              );
            }

            return <span key={j}>{token.text[proseLocale]}</span>;
          })}
        </li>
      ))}
    </ul>
  );
}
