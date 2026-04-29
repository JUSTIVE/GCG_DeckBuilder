import { cn } from "@/lib/utils";

export function TickerBand({
  items,
  className,
  variant = "ink",
  speed = 60,
  gap = 48,
}: {
  items: string[];
  className?: string;
  variant?: "ink" | "cream";
  speed?: number;
  gap?: number;
}) {
  const palette =
    variant === "ink"
      ? "bg-foreground text-background border-y border-foreground"
      : "bg-card text-foreground border-y border-foreground";

  // Estimate content width: ~16 chars per item × ~22px char × items count, plus gaps and dots
  const charWidth = 22;
  const avgChars = items.reduce((s, x) => s + x.length, 0) / Math.max(1, items.length);
  const oneLoopWidth = items.length * (avgChars * charWidth + gap + 16 + gap);
  const duration = oneLoopWidth / speed;

  const renderTrack = (key: string) =>
    items.flatMap((item, i) => [
      <span
        key={`${key}-${item}-${i}`}
        className="display-title text-3xl sm:text-4xl font-bold uppercase tracking-tight whitespace-nowrap"
      >
        {item}
      </span>,
      <span
        key={`${key}-dot-${item}-${i}`}
        className="size-2 rounded-full bg-accent shrink-0 self-center"
        aria-hidden
      />,
    ]);

  return (
    <div className={cn("py-3 overflow-hidden relative", palette, className)}>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex w-max"
        style={{
          gap: `${gap}px`,
          animation: `ticker-scroll ${duration}s linear infinite`,
        }}
      >
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {renderTrack("a")}
        </div>
        <div className="flex shrink-0" style={{ gap: `${gap}px` }} aria-hidden>
          {renderTrack("b")}
        </div>
      </div>
    </div>
  );
}
