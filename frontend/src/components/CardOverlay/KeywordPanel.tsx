import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { CardDescription } from "@/components/CardDescription";
import { cn } from "@/lib/utils";

export function KeywordContent({
  keywords,
  borderClass,
}: {
  keywords: string[];
  borderClass?: string;
}) {
  const entries = keywords
    .map((k) => KEYWORD_DESCRIPTIONS[k])
    .filter((e): e is NonNullable<typeof e> => e != null);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">키워드</span>
      {entries.map((entry, i) => (
        <div key={i} className={cn("flex flex-col gap-1.5 rounded-lg border px-3 py-2", borderClass ?? "border-white/20")}>
          <CardDescription lines={[entry.name]} borderClass={borderClass} />
          <CardDescription lines={[entry.description]} borderClass={borderClass} />
        </div>
      ))}
    </div>
  );
}

export function KeywordPanel({
  keywords,
  borderClass,
}: {
  keywords: string[];
  borderClass?: string;
}) {
  const entries = keywords
    .map((k) => KEYWORD_DESCRIPTIONS[k])
    .filter((e): e is NonNullable<typeof e> => e != null);
  if (entries.length === 0) return null;

  return (
    <div className="hidden sm:flex flex-col gap-3 max-h-[80dvh] overflow-y-auto">
      {entries.map((entry, i) => (
        <div key={i} className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-3 text-white backdrop-blur-md flex flex-col gap-1.5">
          <CardDescription lines={[entry.name]} borderClass={borderClass} />
          <CardDescription lines={[entry.description]} borderClass={borderClass} />
        </div>
      ))}
    </div>
  );
}
