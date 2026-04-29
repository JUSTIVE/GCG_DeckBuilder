import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Dossier({
  docId,
  category,
  title,
  jpTitle,
  description,
  status = "CURRENT",
  edition,
  rightSlot,
  className,
}: {
  docId: string;
  category: string;
  title: string;
  jpTitle?: string;
  description?: ReactNode;
  status?: string;
  edition?: string;
  rightSlot?: ReactNode;
  className?: string;
}) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  return (
    <header className={cn("border-b border-foreground/30 bg-card", className)}>
      {/* Top meta strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 py-2 docket-meta border-b border-foreground/15">
        <span className="docket-meta-strong">FILE</span>
        <span className="opacity-50">/</span>
        <span>{docId}</span>
        <span className="opacity-30">·</span>
        <span>{today}</span>
        {edition && (
          <>
            <span className="opacity-30">·</span>
            <span>{edition}</span>
          </>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="docket-marker-orange text-[10px]">{status}</span>
        </span>
      </div>

      {/* Title row */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 docket-meta mb-1">
            <span>GCG / {category}</span>
            {jpTitle && (
              <>
                <span className="opacity-30">·</span>
                <span>{jpTitle}</span>
              </>
            )}
          </div>
          <h1 className="display-title text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="docket-mono text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-prose">
              {description}
            </p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </header>
  );
}
