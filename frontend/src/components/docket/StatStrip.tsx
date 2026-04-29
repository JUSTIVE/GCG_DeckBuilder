import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string;
  sublabel?: string;
};

export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        "border-y border-foreground bg-card",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "px-4 py-4 sm:px-5 sm:py-5",
            "border-foreground/30",
            i > 0 && "border-l",
            "lg:border-l",
            i === 0 && "lg:border-l-0",
          )}
        >
          <div className="docket-meta mb-2">{stat.label}</div>
          <div className="display-title text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">
            {stat.value}
          </div>
          {stat.sublabel && (
            <div className="docket-mono text-[11px] text-muted-foreground mt-2">
              {stat.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
