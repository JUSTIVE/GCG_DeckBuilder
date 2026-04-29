import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type MetaRow = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
};

export function MetaBlock({
  title,
  subtitle,
  rows,
  className,
}: {
  title: string;
  subtitle?: string;
  rows: MetaRow[];
  className?: string;
}) {
  return (
    <div className={cn("border border-foreground p-3 sm:p-4 bg-card", className)}>
      <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-foreground/30">
        <span className="docket-meta-strong">{title}</span>
        {subtitle && <span className="docket-meta">/ {subtitle}</span>}
      </div>
      <dl className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
            <dt className="docket-meta">{row.label}</dt>
            <dd className="docket-mono text-xs text-foreground tabular-nums">
              {row.highlight ? (
                <span className="docket-marker-orange inline-block">{row.value}</span>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
