import { cn } from "@/lib/utils";
import { useRouter, useParams } from "@tanstack/react-router";
import type { CardKeyword } from "@/routes/$locale/cardlist";
import { renderKeyword } from "@/render/keyword";

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
  END_OF_TURN: "bg-red-700 text-white",
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

const TRIGGER_KEYWORD_MAP: Array<[string, CardKeyword]> = [
  ["기동･메인", "ACTIVATE_MAIN"],
  ["기동･액션", "ACTIVATE_ACTION"],
  ["메인", "MAIN"],
  ["액션", "ACTION"],
  ["버스트", "BURST"],
  ["공격 시", "ATTACK"],
  ["배치 시", "DEPLOY"],
  ["파괴 시", "DESTROYED"],
  ["링크 시", "WHEN_LINKED"],
  ["링크 중", "DURING_LINK"],
  ["세트 시", "WHEN_PAIRED"],
  ["세트 중", "DURING_PAIR"],
  ["파일럿", "PILOT"],
  ["턴 1회", "ONCE_PER_TURN"],
  ["내 턴이 끝날 때", "END_OF_TURN"],
];

const ABILITY_KEYWORD_MAP: Array<[string, CardKeyword]> = [
  ["블로커", "BLOCKER"],
  ["고기동", "HIGH_MANEUVER"],
  ["선제 공격", "FIRST_STRIKE"],
  ["선제공격", "FIRST_STRIKE"],
  ["제압", "SUPPRESSION"],
  ["돌파", "BREACH"],
  ["리페어", "REPAIR"],
  ["원호", "SUPPORT"],
];

function findKeyword(
  text: string,
  map: Array<[string, CardKeyword]>,
): CardKeyword | null {
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
  | { type: "prose"; en: string; ko: string };

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
                    TRIGGER_STYLES[keyword.toUpperCase() as CardKeyword] ??
                      TRIGGER_FALLBACK,
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
                renderKeyword(keyword) +
                (token.n !== undefined ? ` ${token?.n ?? ""}` : "");
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

            return <span key={j}>{token[proseLocale]}</span>;
          })}
        </li>
      ))}
    </ul>
  );
}
