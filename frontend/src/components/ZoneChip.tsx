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
        "w-10 text-[8px] cutout cutout-bl-sm cutout-tr-sm not-first:-ml-2",
        className,
      )}
    >
      {renderZone(zone)}
    </div>
  );
}
