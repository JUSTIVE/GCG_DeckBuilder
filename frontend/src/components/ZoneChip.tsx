import { cn } from "@/lib/utils";
import { renderZone } from "@/render/zone";

export function ZoneChip({
  zone,
  className,
}: {
  zone: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-10 text-[3cqw] parallelogram  parallelogram-sm not-first:-ml-1.5 text-center",
        className,
      )}
    >
      {renderZone(zone)}
    </div>
  );
}
