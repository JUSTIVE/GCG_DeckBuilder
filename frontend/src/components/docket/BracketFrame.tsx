import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "before:size-2.5 after:size-2.5",
  md: "before:size-3.5 after:size-3.5",
  lg: "before:size-5 after:size-5",
};

export function BracketFrame({
  children,
  size = "md",
  className,
}: PropsWithChildren<{ size?: Size; className?: string }>) {
  return (
    <div
      className={cn(
        "relative",
        "before:absolute before:top-0 before:left-0 before:border-t before:border-l before:border-foreground before:content-['']",
        "after:absolute after:bottom-0 after:right-0 after:border-b after:border-r after:border-foreground after:content-['']",
        SIZE[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
