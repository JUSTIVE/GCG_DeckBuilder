import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Code128 module patterns (107 entries: 0..103 data, 104..105 starts, 106 stop body)
// Each pattern is 11 modules of bar(1) / space(0), except stop which is 13 modules.
const PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "11000111010",
];
const STOP_PATTERN = "1100011101011";

function encode128B(text: string): string {
  const data: number[] = [];
  for (const ch of text) {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 95) {
      // Outside printable ASCII (Code128B range): skip silently for the decorative use case.
      continue;
    }
    data.push(v);
  }
  const START_B = 104;
  let checksum = START_B;
  for (let i = 0; i < data.length; i++) {
    checksum += data[i] * (i + 1);
  }
  checksum %= 103;
  let bits = PATTERNS[START_B];
  for (const v of data) bits += PATTERNS[v];
  bits += PATTERNS[checksum];
  bits += STOP_PATTERN;
  return bits;
}

type Run = { width: number; bar: boolean };

function bitsToRuns(bits: string): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (i < bits.length) {
    const ch = bits[i];
    let len = 1;
    while (i + len < bits.length && bits[i + len] === ch) len++;
    runs.push({ width: len, bar: ch === "1" });
    i += len;
  }
  return runs;
}

export function BarcodeStub({
  code,
  className,
  height = 40,
  module = 1.6,
}: {
  code: string;
  className?: string;
  height?: number;
  /** width of one module in px */
  module?: number;
}) {
  const runs = useMemo(() => bitsToRuns(encode128B(code)), [code]);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-end" style={{ height }} role="img" aria-label={`Barcode ${code}`}>
        {runs.map((run, i) => (
          <span
            key={i}
            className={run.bar ? "bg-foreground" : ""}
            style={{ width: `${run.width * module}px`, height: "100%" }}
          />
        ))}
      </div>
      <span className="docket-mono text-[10px] tracking-[0.2em] text-foreground">{code}</span>
    </div>
  );
}
