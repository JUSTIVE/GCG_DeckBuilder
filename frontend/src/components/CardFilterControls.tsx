import { useState, useEffect, useRef } from "react";
import type { CardFilterInput, CardSort } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { COLOR_BG } from "src/render/color";
import {
  SORT_OPTIONS, ALL_KINDS, ALL_ZONES, ZONE_LABELS, ALL_COLORS, COLOR_LABELS,
  KIND_LABELS, COST_OPTIONS, LEVEL_OPTIONS, ALL_KEYWORDS, KEYWORD_LABELS,
  ALL_TRAITS, TRAIT_LABELS, PACK_GROUPS,
} from "@/lib/filterConstants";

export { SORT_OPTIONS, ALL_KINDS, ALL_ZONES, ZONE_LABELS, ALL_COLORS, COLOR_LABELS,
  KIND_LABELS, COST_OPTIONS, LEVEL_OPTIONS, ALL_KEYWORDS, KEYWORD_LABELS,
  ALL_TRAITS, TRAIT_LABELS, PACK_GROUPS } from "@/lib/filterConstants";

export const INITIAL_FILTER: CardFilterInput = { kind: [] };

// ─── activeFilterCount ────────────────────────────────────────────────────────

export function activeFilterCount(filter: CardFilterInput): number {
  let count = 0;
  const kind = filter.kind as string[];
  if (kind.length > 0) count++;
  if ((filter.cost as number[] | null | undefined)?.length) count++;
  if ((filter.level as number[] | null | undefined)?.length) count++;
  if ((filter.zone as string[] | null | undefined)?.length) count++;
  if ((filter.color as string[] | null | undefined)?.length) count++;
  if ((filter.keyword as string[] | null | undefined)?.length) count++;
  if ((filter.trait as string[] | null | undefined)?.length) count++;
  if (filter.package) count++;
  if (filter.query) count++;
  return count;
}

// ─── CollapsibleChips ────────────────────────────────────────────────────────

export function CollapsibleChips({
  label,
  activeCount,
  children,
}: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(activeCount > 0);
  useEffect(() => { if (activeCount > 0) setOpen(true); }, [activeCount]);

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 cursor-pointer w-fit">
        <span className="text-xs text-muted-foreground w-10 shrink-0 text-left">{label}</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-wrap gap-1 pl-[2.875rem]">{children}</div>}
    </div>
  );
}

// ─── FilterControls ───────────────────────────────────────────────────────────

export type FilterControlsProps = {
  filter: CardFilterInput;
  sort: CardSort | null;
  onChange: (filter: CardFilterInput) => void;
  onSortChange: (sort: CardSort | null) => void;
  deckColors?: string[];
};

export function FilterControls({ filter, sort, onChange, onSortChange, deckColors }: FilterControlsProps) {
  const restrictedColors = deckColors && deckColors.length >= 2 ? deckColors : null;
  const [queryText, setQueryText] = useState(filter.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQueryText(filter.query ?? ""); }, [filter.query]);

  function patch(next: Partial<CardFilterInput>) { onChange({ ...filter, ...next }); }

  function toggleKind(k: (typeof ALL_KINDS)[number]) {
    const current = filter.kind as string[];
    const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k];
    patch({ kind: next as CardFilterInput["kind"] });
  }
  function toggleCost(c: number) {
    const current = (filter.cost as number[] | undefined) ?? [];
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    patch({ cost: next.length > 0 ? next : null });
  }
  function toggleLevel(l: number) {
    const current = (filter.level as number[] | undefined) ?? [];
    const next = current.includes(l) ? current.filter((x) => x !== l) : [...current, l];
    patch({ level: next.length > 0 ? next : null });
  }
  function toggleZone(z: (typeof ALL_ZONES)[number]) {
    const current = (filter.zone as string[] | undefined) ?? [];
    const next = current.includes(z) ? current.filter((x) => x !== z) : [...current, z];
    patch({ zone: next.length > 0 ? (next as CardFilterInput["zone"]) : null });
  }
  function toggleColor(c: (typeof ALL_COLORS)[number]) {
    const current = (filter.color as string[] | undefined) ?? [];
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    patch({ color: next.length > 0 ? (next as CardFilterInput["color"]) : null });
  }
  function togglePackage(p: string) {
    patch({ package: filter.package === p ? null : (p as CardFilterInput["package"]) });
  }
  function toggleKeyword(k: string) {
    const current = (filter.keyword as string[] | undefined) ?? [];
    const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k];
    patch({ keyword: next.length > 0 ? (next as CardFilterInput["keyword"]) : null });
  }
  function toggleTrait(t: string) {
    const current = (filter.trait as string[] | undefined) ?? [];
    const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    patch({ trait: next.length > 0 ? (next as CardFilterInput["trait"]) : null });
  }
  function onQueryChange(value: string) {
    setQueryText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { patch({ query: value.trim() || null }); }, 300);
  }

  const activeKind = filter.kind as string[];
  const activeCost = (filter.cost as number[] | undefined) ?? [];
  const activeLevel = (filter.level as number[] | undefined) ?? [];
  const activeZone = (filter.zone as string[] | undefined) ?? [];
  const activeColor = (filter.color as string[] | undefined) ?? [];
  const activeKeyword = (filter.keyword as string[] | undefined) ?? [];
  const activeTrait = (filter.trait as string[] | undefined) ?? [];
  const activePackage = filter.package as string | null | undefined;

  const chipClass = (active: boolean) => cn(
    "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">정렬</span>
        <select value={sort || ""} onChange={(e) => onSortChange(e.target.value ? (e.target.value as CardSort) : null)} className="h-7 flex-1 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:border-primary cursor-pointer">
          <option value="">기본</option>
          {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">종류</span>
        <div className="flex flex-wrap gap-1">
          {ALL_KINDS.map((k) => <button type="button" key={k} onClick={() => toggleKind(k)} className={chipClass(activeKind.includes(k))}>{KIND_LABELS[k]}</button>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">코스트</span>
        <div className="flex flex-wrap gap-1">
          {COST_OPTIONS.map((c) => <button type="button" key={c} onClick={() => toggleCost(c)} className={cn("h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer", activeCost.includes(c) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>{c}</button>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">레벨</span>
        <div className="flex flex-wrap gap-1">
          {LEVEL_OPTIONS.map((l) => <button type="button" key={l} onClick={() => toggleLevel(l)} className={cn("h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer", activeLevel.includes(l) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>{l}</button>)}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">지형</span>
        <div className="flex gap-1">
          {ALL_ZONES.map((z) => <button type="button" key={z} onClick={() => toggleZone(z)} className={chipClass(activeZone.includes(z))}>{ZONE_LABELS[z]}</button>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">색상</span>
        <div className="flex flex-wrap gap-1">
          {(restrictedColors ?? ALL_COLORS).map((c) => (
            <button type="button" key={c} onClick={() => toggleColor(c as (typeof ALL_COLORS)[number])} className={cn("rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer", activeColor.includes(c) ? cn(COLOR_BG[c], c === "WHITE" ? "text-gray-600 ring-2 ring-offset-1 ring-current" : "text-white ring-2 ring-offset-1 ring-current") : cn(c === "WHITE" ? "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100" : "border-border bg-background text-muted-foreground hover:bg-accent"))}>
              {COLOR_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1.5">
        <span className="text-xs text-muted-foreground pt-0.5">팩</span>
        <div className="flex flex-col gap-1.5">
          {PACK_GROUPS.map((group) => (
            <div key={group.label} className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1">
              <span className="text-[10px] text-muted-foreground/60 pt-0.5">{group.label}</span>
              <div className="flex flex-wrap gap-1">
                {group.items.map(({ value, label }) => <button type="button" key={value} onClick={() => togglePackage(value)} className={chipClass(activePackage === value)}>{label}</button>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CollapsibleChips label="키워드" activeCount={activeKeyword.length}>
        {ALL_KEYWORDS.map((k) => <button type="button" key={k} onClick={() => toggleKeyword(k)} className={chipClass(activeKeyword.includes(k))}>{KEYWORD_LABELS[k]}</button>)}
      </CollapsibleChips>

      <CollapsibleChips label="특성" activeCount={activeTrait.length}>
        {ALL_TRAITS.map((t) => <button type="button" key={t} onClick={() => toggleTrait(t)} className={chipClass(activeTrait.includes(t))}>{TRAIT_LABELS[t]}</button>)}
      </CollapsibleChips>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">검색</span>
        <div className="relative flex-1 flex items-center">
          <input value={queryText} onChange={(e) => onQueryChange(e.target.value)} placeholder="이름 · 효과 검색" className="h-7 w-full rounded-md border border-input bg-background px-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:border-primary" />
          {queryText && <button type="button" onClick={() => onQueryChange("")} className="absolute right-1.5 text-muted-foreground hover:text-foreground"><XIcon className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
    </div>
  );
}
