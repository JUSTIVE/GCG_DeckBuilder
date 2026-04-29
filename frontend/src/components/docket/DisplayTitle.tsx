import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function DisplayTitle({
  children,
  className,
  as = "h1",
}: PropsWithChildren<{ className?: string; as?: "h1" | "h2" | "div" }>) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "display-title font-bold leading-[0.88] text-foreground",
        "text-[clamp(3rem,12vw,9rem)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
