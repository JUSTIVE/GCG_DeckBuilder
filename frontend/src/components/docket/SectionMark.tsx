import { cn } from "@/lib/utils";

export function SectionMark({
  number,
  title,
  subtitle,
  className,
}: {
  number: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-3 sm:gap-6 border-b border-foreground/40 pb-2",
        className,
      )}
    >
      <span className="docket-mono text-xs sm:text-sm text-muted-foreground tabular-nums">
        § {number}
      </span>
      <span className="display-title text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
        {title}
      </span>
      {subtitle && (
        <span className="docket-meta hidden sm:inline ml-auto truncate">{subtitle}</span>
      )}
    </div>
  );
}
