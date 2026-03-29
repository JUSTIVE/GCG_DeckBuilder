import { cn } from "@/lib/utils";

// ─── Styles ───────────────────────────────────────────────────────────────────
// 【트리거】 키워드별 클래스. 매칭되지 않으면 fallback 사용.

const TRIGGER_STYLES: Record<string, string> = {
  메인: "bg-blue-300 text-gray-800",
  액션: "bg-blue-300 text-gray-800",
  "기동･메인": "bg-blue-300 text-gray-800",
  "기동･액션": "bg-blue-300 text-gray-800",
  버스트: "bg-orange-400 text-white",
  "공격 시": "bg-blue-300 text-gray-800",
  "배치 시": "bg-blue-300 text-gray-800",
  "파괴 시": "bg-blue-300 text-gray-800",
  "링크 시": "bg-yellow-300 text-gray-800",
  "세트 시": "bg-pink-400 text-gray-800 saturate-50", // startsWith 매칭
  파일럿: "",
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

function triggerClass(text: string): string {
  if (text in TRIGGER_STYLES) return TRIGGER_STYLES[text] || TRIGGER_FALLBACK;
  // prefix 매칭 (세트 시･... 등)
  for (const key of Object.keys(TRIGGER_STYLES)) {
    if (text.startsWith(key)) return TRIGGER_STYLES[key] || TRIGGER_FALLBACK;
  }
  return TRIGGER_FALLBACK;
}

function abilityClass(text: string): string {
  if (text in ABILITY_STYLES) return ABILITY_STYLES[text] || ABILITY_FALLBACK;
  // prefix 매칭 (돌파 3, 리페어 2, 원호 1 등)
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
};

export function CardDescription({ lines, className }: Props) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {lines.map((line, i) => (
        <li key={i} className="text-xs leading-relaxed text-white/90">
          {tokenize(line).map((token, j) => {
            if (token.type === "trigger") {
              return (
                <span
                  key={j}
                  className={cn(
                    "inline-flex align-middle items-center rounded mx-0.5 px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    triggerClass(token.text),
                  )}
                >
                  {token.text}
                </span>
              );
            }
            if (token.type === "ability") {
              return (
                <span
                  key={j}
                  className={cn(
                    "inline-flex align-middle items-center rounded border mx-0.5 px-1.5 py-0.5 text-[10px] leading-none",
                    abilityClass(token.text),
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
