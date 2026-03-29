import { cn } from "@/lib/utils";

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { type: "trigger"; text: string }   // 【...】
  | { type: "ability"; text: string }   // <...>
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
                  className="inline-flex align-middle items-center rounded bg-white/20 mx-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none"
                >
                  {token.text}
                </span>
              );
            }
            if (token.type === "ability") {
              return (
                <span
                  key={j}
                  className="inline-flex align-middle items-center rounded border border-white/30 bg-white/5 mx-0.5 px-1.5 py-0.5 text-[10px] text-white/80 leading-none"
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
