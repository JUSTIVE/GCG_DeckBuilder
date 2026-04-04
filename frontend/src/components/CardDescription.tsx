import { cn } from "@/lib/utils";
import { useRouter } from "@tanstack/react-router";
import type { CardKeyword } from "@/routes/cardlist";

// ─── Styles ───────────────────────────────────────────────────────────────────
// 【트리거】 키워드별 클래스. 매칭되지 않으면 fallback 사용.

const TRIGGER_STYLES: Record<string, string> = {
  "기동･메인": "bg-blue-300 text-gray-800",
  "기동･액션": "bg-blue-300 text-gray-800",
  메인: "bg-blue-300 text-gray-800",
  액션: "bg-blue-300 text-gray-800",
  버스트: "bg-orange-400 text-white",
  "배치 시": "bg-teal-500 text-gray-800",
  "공격 시": "bg-teal-500 text-gray-800",
  "파괴 시": "bg-teal-500 text-gray-800",
  "세트 시": "bg-pink-400 text-gray-800 saturate-50", // startsWith 매칭
  "세트 중": "bg-pink-400 text-gray-800 saturate-50", // startsWith 매칭
  파일럿: "bg-pink-400 text-gray-800 saturate-50",
  "링크 시": "bg-yellow-300 text-gray-800",
  "링크 중": "bg-yellow-300 text-gray-800",
  "턴 1회": "bg-red-700 text-white",
};

// <어빌리티> 키워드별 클래스. 매칭되지 않으면 fallback 사용.
const ABILITY_STYLES: Record<string, string> = {
  블로커: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  고기동: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  "선제 공격": "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  제압: "hex-chip hex-chip-md bg-white text-gray-800 font-bold",
  돌파: "hex-chip hex-chip-md bg-white text-gray-800 font-bold", // startsWith 매칭
  리페어: "hex-chip hex-chip-md bg-white text-gray-800 font-bold", // startsWith 매칭
  원호: "hex-chip hex-chip-md bg-white text-gray-800 font-bold", // startsWith 매칭
};

const TRIGGER_FALLBACK = "bg-white/20 text-white";
const ABILITY_FALLBACK = "border-white/30 bg-white/5 text-white/80";

// ─── Keyword map ──────────────────────────────────────────────────────────────

const TRIGGER_KEYWORD_MAP: Array<[string, CardKeyword]> = [
  ["메인", "MAIN"],
  ["액션", "ACTION"],
  ["기동･메인", "ACTIVATE_MAIN"],
  ["기동･액션", "ACTIVATE_ACTION"],
  ["버스트", "BURST"],
  ["공격 시", "ATTACK"],
  ["배치 시", "DEPLOY"],
  ["파괴 시", "DESTROYED"],
  ["링크 시", "WHEN_LINKED"],
  ["세트 시", "WHEN_PAIRED"],
  ["파일럿", "PILOT"],
  ["턴 1회", "ONCE_PER_TURN"],
];

const ABILITY_KEYWORD_MAP: Array<[string, CardKeyword]> = [
  ["블로커", "BLOCKER"],
  ["고기동", "HIGH_MANEUVER"],
  ["선제 공격", "FIRST_STRIKE"],
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
  if (text in TRIGGER_STYLES) return TRIGGER_STYLES[text] || TRIGGER_FALLBACK;
  for (const key of Object.keys(TRIGGER_STYLES)) {
    if (text.startsWith(key)) return TRIGGER_STYLES[key] || TRIGGER_FALLBACK;
  }
  return TRIGGER_FALLBACK;
}

export function abilityClass(text: string): string {
  if (text in ABILITY_STYLES) return ABILITY_STYLES[text] || ABILITY_FALLBACK;
  for (const key of Object.keys(ABILITY_STYLES)) {
    if (text.startsWith(key)) return ABILITY_STYLES[key] || ABILITY_FALLBACK;
  }
  return ABILITY_FALLBACK;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { type: "trigger"; text: string } // 【...】
  | { type: "ability"; text: string } // <...>
  | { type: "text"; text: string };

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  const regex = /【([^】]*)】|<([^>]+)>/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) {
      tokens.push({ type: "text", text: line.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "trigger", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: "ability", text: match[2] });
    }
    last = regex.lastIndex;
  }

  if (last < line.length) {
    tokens.push({ type: "text", text: line.slice(last) });
  }

  return tokens;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  lines: readonly string[];
  className?: string;
  borderClass?: string;
};

export function CardDescription({ lines, className, borderClass }: Props) {
  const router = useRouter();

  function navigateKeyword(keyword: CardKeyword) {
    router.navigate({
      to: "/cardlist",
      search: { keyword: [keyword] },
      replace: true,
    });
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {lines.map((line, i) => (
        <li key={i} className="text-xs leading-relaxed text-white/90">
          {tokenize(line).map((token, j) => {
            if (token.type === "trigger") {
              const keyword = findKeyword(token.text, TRIGGER_KEYWORD_MAP);
              return (
                <span
                  key={j}
                  onClick={keyword ? () => navigateKeyword(keyword) : undefined}
                  className={cn(
                    "inline-flex align-middle items-center rounded mx-0.5 px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    triggerClass(token.text),
                    keyword && "cursor-pointer hover:brightness-110",
                  )}
                >
                  {token.text}
                </span>
              );
            }
            if (token.type === "ability") {
              const keyword = findKeyword(token.text, ABILITY_KEYWORD_MAP);
              return (
                <span
                  key={j}
                  onClick={keyword ? () => navigateKeyword(keyword) : undefined}
                  className={cn(
                    "inline-flex align-middle items-center rounded border mx-0.5 px-1.5 py-0.5 text-[10px] leading-none",
                    abilityClass(token.text),
                    borderClass,
                    keyword && "cursor-pointer hover:brightness-110",
                  )}
                >
                  {token.text}
                </span>
              );
            }
            return <span key={j}>{token.text}</span>;
          })}
        </li>
      ))}
    </ul>
  );
}
