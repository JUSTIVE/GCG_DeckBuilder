import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function MarkerHighlight({
  children,
  variant = "ink",
  className,
}: PropsWithChildren<{ variant?: "ink" | "orange"; className?: string }>) {
  return (
    <span
      className={cn(
        variant === "ink" ? "docket-marker" : "docket-marker-orange",
        "inline",
        className,
      )}
    >
      {children}
    </span>
  );
}
