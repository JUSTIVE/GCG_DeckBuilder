import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import type { CardFilterInput } from "@/__generated__/CardListFragmentRefetchQuery.graphql";
import type { CardSort } from "@/__generated__/CardListPageQuery.graphql";
import { CardList } from "@/components/CardList";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import {
  Route,
  type CardListSearch,
  type CardKeyword,
  type CardTrait,
} from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { renderKeyword } from "@/render/keyword";
import {
  ChevronDownIcon,
  FileTextIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, useEffect, Suspense } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { COLOR_BG } from "src/render/color";

const Query = graphql`
  query CardListPageQuery($filter: CardFilterInput!, $sort: CardSort) {
    ...CardListFragment @arguments(first: 20, filter: $filter, sort: $sort)
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilter(search: CardListSearch): CardFilterInput {
  return {
    kind: search.kind ?? [],
    cost: search.cost ?? null,
    level: search.level ?? null,
    zone: search.zone ?? null,
    color: search.color ?? null,
    keyword: search.keyword ?? null,
    trait: search.trait ?? null,
    package: search.package ?? null,
    query: search.query ?? null,
  };
}

function buildSort(search: CardListSearch): CardSort | null {
  return (search.sort as CardSort) ?? null;
}

function filterToSearch(
  filter: CardFilterInput,
  sort: CardSort | null,
): CardListSearch {
  const kind = filter.kind as CardListSearch["kind"];
  const cost = filter.cost as number[] | null | undefined;
  const level = filter.level as number[] | null | undefined;
  const zone = filter.zone as CardListSearch["zone"] | null | undefined;
  const color = filter.color as CardListSearch["color"] | null | undefined;
  const keyword = filter.keyword as
    | CardListSearch["keyword"]
    | null
    | undefined;
  const trait = filter.trait as CardListSearch["trait"] | null | undefined;
  const pkg = filter.package as CardListSearch["package"] | null | undefined;
  const query = filter.query as string | null | undefined;
  return {
    kind: kind,
    cost: cost?.length ? cost : undefined,
    level: level?.length ? level : undefined,
    zone: zone?.length ? zone : undefined,
    color: color?.length ? color : undefined,
    keyword: keyword?.length ? keyword : undefined,
    trait: trait?.length ? trait : undefined,
    package: pkg || undefined,
    query: query || undefined,
    sort: sort as CardListSearch["sort"] | undefined,
  };
}

function activeFilterCount(filter: CardFilterInput): number {
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

// ─── Constants ───────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  UNIT: "유닛",
  PILOT: "파일럿",
  BASE: "베이스",
  COMMAND: "커맨드",
  RESOURCE: "리소스",
};

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NAME_ASC", label: "이름 ↑" },
  { value: "NAME_DESC", label: "이름 ↓" },
  { value: "COST_ASC", label: "코스트 ↑" },
  { value: "COST_DESC", label: "코스트 ↓" },
  { value: "LEVEL_ASC", label: "레벨 ↑" },
  { value: "LEVEL_DESC", label: "레벨 ↓" },
  { value: "AP_ASC", label: "공격력 ↑" },
  { value: "AP_DESC", label: "공격력 ↓" },
  { value: "HP_ASC", label: "체력 ↑" },
  { value: "HP_DESC", label: "체력 ↓" },
];
const ALL_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND", "RESOURCE"] as const;
const ALL_ZONES = ["SPACE", "EARTH"] as const;
const ZONE_LABELS: Record<string, string> = { SPACE: "우주", EARTH: "지구" };
const ALL_COLORS = [
  "BLUE",
  "GREEN",
  "RED",
  "YELLOW",
  "PURPLE",
  "WHITE",
] as const;
const COLOR_LABELS: Record<string, string> = {
  BLUE: "파랑",
  GREEN: "초록",
  RED: "빨강",
  YELLOW: "노랑",
  PURPLE: "보라",
  WHITE: "하양",
};

const COST_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const INITIAL_FILTER: CardFilterInput = { kind: [] };

const ALL_KEYWORDS: CardKeyword[] = [
  "ACTION",
  "ACTIVATE_ACTION",
  "ACTIVATE_MAIN",
  "ATTACK",
  "BLOCKER",
  "BREACH",
  "BURST",
  "DEPLOY",
  "DESTROYED",
  "DURING_LINK",
  "DURING_PAIR",
  "FIRST_STRIKE",
  "HIGH_MANEUVER",
  "SUPPRESSION",
  "MAIN",
  "ONCE_PER_TURN",
  "END_OF_TURN",
  "PILOT",
  "REPAIR",
  "SUPPORT",
  "WHEN_LINKED",
  "WHEN_PAIRED",
];

const KEYWORD_LABELS = Object.fromEntries(
  ALL_KEYWORDS.map((k) => [k, renderKeyword(k)]),
) as Record<CardKeyword, string>;

const ALL_TRAITS: CardTrait[] = [
  "EARTH_FEDERATION",
  "ZEON",
  "NEO_ZEON",
  "OZ",
  "ACADEMY",
  "EARTH_ALLIANCE",
  "MAGANAC_CORPS",
  "ZAFT",
  "OPERATION_METEOR",
  "NEWTYPE",
  "COORDINATOR",
  "CYBER_NEWTYPE",
  "STRONGHOLD",
  "WARSHIP",
  "TRIPLE_SHIP_ALLIANCE",
  "CIVILIAN",
  "WHITE_BASE_TEAM",
  "G_TEAM",
  "VANADIS_INSTITUTE",
  "ORB",
  "TEKKADAN",
  "TEIWAZ",
  "GJALLARHORN",
  "GUNDAM_FRAME",
  "ALAYA_VIJNANA",
  "TITANS",
  "VULTURE",
  "AEUG",
  "CLAN",
  "AGE_SYSTEM",
  "WHITE_FANG",
  "SIDE_6",
  "NEW_UNE",
  "UE",
  "VAGAN",
  "BIOLOGICAL_CPU",
  "ASUNO_FAMILY",
  "X_ROUNDER",
  "SUPERPOWER_BLOC",
  "CB",
  "INNOVADE",
  "GN_DRIVE",
  "SUPER_SOLDIER",
  "MAFTY",
  "SRA",
  "OLD_UNE",
  "JUPITRIS",
  "CYCLOPS_TEAM",
  "UN",
  "MINERVA_SQUAD",
];
const TRAIT_LABELS: Record<CardTrait, string> = {
  ACADEMY: "학원",
  OZ: "OZ",
  NEO_ZEON: "네오 지온",
  ZEON: "지온",
  EARTH_ALLIANCE: "지구 연합",
  EARTH_FEDERATION: "지구 연방",
  MAGANAC_CORPS: "마그아낙",
  ZAFT: "자프트",
  OPERATION_METEOR: "오퍼레이션 메테오",
  NEWTYPE: "뉴타입",
  COORDINATOR: "코디네이터",
  CYBER_NEWTYPE: "강화인간",
  STRONGHOLD: "거점",
  WARSHIP: "함선",
  TRIPLE_SHIP_ALLIANCE: "삼척동맹",
  CIVILIAN: "민간",
  WHITE_BASE_TEAM: "화이트베이스",
  G_TEAM: "G-팀",
  VANADIS_INSTITUTE: "바나디스",
  ORB: "오브",
  TEKKADAN: "철화단",
  TEIWAZ: "테이와즈",
  GJALLARHORN: "걀라르호른",
  GUNDAM_FRAME: "건담 프레임",
  ALAYA_VIJNANA: "아라야식",
  TITANS: "티탄즈",
  VULTURE: "벌쳐",
  AEUG: "에우고",
  CLAN: "클랜",
  AGE_SYSTEM: "에이지",
  WHITE_FANG: "화이트 팽",
  SIDE_6: "사이드 6",
  NEW_UNE: "신지구연방",
  UE: "UE",
  VAGAN: "베이건",
  BIOLOGICAL_CPU: "생체 CPU",
  ASUNO_FAMILY: "아스노 일가",
  X_ROUNDER: "X-라운더",
  SUPERPOWER_BLOC: "초대국군",
  CB: "솔레스탈 비잉",
  INNOVADE: "이노베이드",
  GN_DRIVE: "GN 드라이브",
  SUPER_SOLDIER: "초인병",
  MAFTY: "마프티",
  SRA: "우주혁명군",
  OLD_UNE: "지구연방군",
  JUPITRIS: "주피트리스",
  CYCLOPS_TEAM: "사이클롭스",
  UN: "UN",
  MINERVA_SQUAD: "미네르바",
};

const PACK_GROUPS: {
  label: string;
  items: { value: string; label: string }[];
}[] = [
  {
    label: "부스트팩",
    items: [
      { value: "GD01", label: "GD01" },
      { value: "GD02", label: "GD02" },
      { value: "GD03", label: "GD03" },
    ],
  },
  {
    label: "스타터덱",
    items: [
      { value: "ST01", label: "ST01" },
      { value: "ST02", label: "ST02" },
      { value: "ST03", label: "ST03" },
      { value: "ST04", label: "ST04" },
      { value: "ST05", label: "ST05" },
      { value: "ST06", label: "ST06" },
      { value: "ST07", label: "ST07" },
      { value: "ST08", label: "ST08" },
      { value: "ST09", label: "ST09" },
    ],
  },
  {
    label: "기타",
    items: [
      { value: "BASIC_CARDS", label: "기본" },
      { value: "EDITION_BETA", label: "베타" },
      { value: "PROMOTION_CARD", label: "프로모" },
      { value: "OTHER_PRODUCT_CARD", label: "기타 상품" },
    ],
  },
];

// ─── CollapsibleChips ────────────────────────────────────────────────────────

function CollapsibleChips({
  label,
  activeCount,
  children,
}: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(activeCount > 0);

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 cursor-pointer w-fit"
      >
        <span className="text-xs text-muted-foreground w-10 shrink-0 text-left">
          {label}
        </span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 pl-[2.875rem]">{children}</div>
      )}
    </div>
  );
}

// ─── Filter controls (shared between bar and bottom sheet) ───────────────────

type FilterControlsProps = {
  filter: CardFilterInput;
  sort: CardSort | null;
  onChange: (filter: CardFilterInput) => void;
  onSortChange: (sort: CardSort | null) => void;
};

function FilterControls({
  filter,
  sort,
  onChange,
  onSortChange,
}: FilterControlsProps) {
  const [queryText, setQueryText] = useState(filter.query ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQueryText(filter.query ?? "");
  }, [filter.query]);

  function patch(next: Partial<CardFilterInput>) {
    onChange({ ...filter, ...next });
  }

  function toggleKind(k: (typeof ALL_KINDS)[number]) {
    const current = filter.kind as string[];
    const next = current.includes(k)
      ? current.filter((x) => x !== k)
      : [...current, k];
    patch({ kind: next as CardFilterInput["kind"] });
  }

  function toggleCost(c: number) {
    const current = (filter.cost as number[] | undefined) ?? [];
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c];
    patch({ cost: next.length > 0 ? next : null });
  }

  function toggleLevel(l: number) {
    const current = (filter.level as number[] | undefined) ?? [];
    const next = current.includes(l)
      ? current.filter((x) => x !== l)
      : [...current, l];
    patch({ level: next.length > 0 ? next : null });
  }

  function toggleZone(z: (typeof ALL_ZONES)[number]) {
    const current = (filter.zone as string[] | undefined) ?? [];
    const next = current.includes(z)
      ? current.filter((x) => x !== z)
      : [...current, z];
    patch({ zone: next.length > 0 ? (next as CardFilterInput["zone"]) : null });
  }

  function toggleColor(c: (typeof ALL_COLORS)[number]) {
    const current = (filter.color as string[] | undefined) ?? [];
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c];
    patch({
      color: next.length > 0 ? (next as CardFilterInput["color"]) : null,
    });
  }

  function togglePackage(p: string) {
    patch({
      package: filter.package === p ? null : (p as CardFilterInput["package"]),
    });
  }

  function toggleKeyword(k: CardKeyword) {
    const current = (filter.keyword as string[] | undefined) ?? [];
    const next = current.includes(k)
      ? current.filter((x) => x !== k)
      : [...current, k];
    patch({
      keyword: next.length > 0 ? (next as CardFilterInput["keyword"]) : null,
    });
  }

  function toggleTrait(t: CardTrait) {
    const current = (filter.trait as string[] | undefined) ?? [];
    const next = current.includes(t)
      ? current.filter((x) => x !== t)
      : [...current, t];
    patch({
      trait: next.length > 0 ? (next as CardFilterInput["trait"]) : null,
    });
  }

  function onQueryChange(value: string) {
    setQueryText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patch({ query: value.trim() || null });
    }, 300);
  }

  const activeKind = filter.kind as string[];
  const activeCost = (filter.cost as number[] | undefined) ?? [];
  const activeLevel = (filter.level as number[] | undefined) ?? [];
  const activeZone = (filter.zone as string[] | undefined) ?? [];
  const activeColor = (filter.color as string[] | undefined) ?? [];
  const activeKeyword = (filter.keyword as string[] | undefined) ?? [];
  const activeTrait = (filter.trait as string[] | undefined) ?? [];
  const activePackage = filter.package as string | null | undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          정렬
        </span>
        <select
          value={sort || ""}
          onChange={(e) =>
            onSortChange(e.target.value ? (e.target.value as CardSort) : null)
          }
          className="h-7 flex-1 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:border-primary cursor-pointer"
        >
          <option value="">기본</option>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Kind */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          종류
        </span>
        <div className="flex flex-wrap gap-1">
          {ALL_KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => toggleKind(k)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                activeKind.includes(k)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          코스트
        </span>
        <div className="flex flex-wrap gap-1">
          {COST_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCost(c)}
              className={cn(
                "h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer",
                activeCost.includes(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Level */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          레벨
        </span>
        <div className="flex flex-wrap gap-1">
          {LEVEL_OPTIONS.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => toggleLevel(l)}
              className={cn(
                "h-6 w-6 rounded border text-xs font-medium transition-colors cursor-pointer",
                activeLevel.includes(l)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Zone */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          지형
        </span>
        <div className="flex gap-1">
          {ALL_ZONES.map((z) => (
            <button
              type="button"
              key={z}
              onClick={() => toggleZone(z)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                activeZone.includes(z)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {ZONE_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          색상
        </span>
        <div className="flex flex-wrap gap-1">
          {ALL_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleColor(c)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                activeColor.includes(c)
                  ? cn(
                      COLOR_BG[c],
                      c === "WHITE"
                        ? "text-gray-600 ring-2 ring-offset-1 ring-current"
                        : "text-white ring-2 ring-offset-1 ring-current",
                    )
                  : cn(
                      c === "WHITE"
                        ? "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        : "border-border bg-background text-muted-foreground hover:bg-accent",
                    ),
              )}
            >
              {COLOR_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Pack */}
      <div className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1.5">
        <span className="text-xs text-muted-foreground pt-0.5">팩</span>
        <div className="flex flex-col gap-1.5">
          {PACK_GROUPS.map((group) => (
            <div
              key={group.label}
              className="grid grid-cols-[2.5rem_1fr] items-start gap-x-1"
            >
              <span className="text-[10px] text-muted-foreground/60 pt-0.5">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.items.map(({ value, label }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => togglePackage(value)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                      activePackage === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyword */}
      <CollapsibleChips label="키워드" activeCount={activeKeyword.length}>
        {ALL_KEYWORDS.map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => toggleKeyword(k)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
              activeKeyword.includes(k)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {KEYWORD_LABELS[k]}
          </button>
        ))}
      </CollapsibleChips>

      {/* Trait */}
      <CollapsibleChips label="특성" activeCount={activeTrait.length}>
        {ALL_TRAITS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => toggleTrait(t)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
              activeTrait.includes(t)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {TRAIT_LABELS[t]}
          </button>
        ))}
      </CollapsibleChips>

      {/* Query */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground w-10 shrink-0">
          검색
        </span>
        <div className="relative flex-1 flex items-center">
          <input
            value={queryText}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이름 · 효과 검색"
            className="h-7 w-full rounded-md border border-input bg-background px-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-1.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Desktop filter bar (md+) ─────────────────────────────────────────────────

function FilterBar({
  filter,
  sort,
  onChange,
  onSortChange,
}: FilterControlsProps) {
  const hasFilters = activeFilterCount(filter) > 0;

  return (
    <aside className="hidden md:flex flex-col gap-4 w-85 shrink-0 border-r border-border px-4 py-4 overflow-y-auto h-[calc(100dvh-65px)]">
      <FilterControls
        filter={filter}
        sort={sort}
        onChange={onChange}
        onSortChange={onSortChange}
      />
      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTER)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer self-start"
        >
          초기화
        </button>
      )}
    </aside>
  );
}

// ─── Mobile filter trigger + bottom sheet (<md) ───────────────────────────────

function FilterBottomSheet({
  filter,
  sort,
  onChange,
  onSortChange,
  showDescription,
  onToggleDescription,
}: FilterControlsProps & {
  showDescription: boolean;
  onToggleDescription: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const count = activeFilterCount(filter);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    setDragY(0);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    setDragY(delta);
  }

  function onHandlePointerUp() {
    if (dragStartY.current === null) return;
    if (dragY > 80) {
      setOpen(false);
    }
    dragStartY.current = null;
    setDragY(0);
  }

  const isDragging = dragStartY.current !== null;

  return (
    <div className="flex md:hidden items-center gap-2 border-b border-border px-4 py-2">
      <button
        type="button"
        onClick={onToggleDescription}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
          showDescription
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <FileTextIcon className="h-3.5 w-3.5" />
        효과
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <SlidersHorizontalIcon className="h-3.5 w-3.5" />
        필터
        {count > 0 && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </button>

      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTER)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
        >
          초기화
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="px-4 pb-0 pt-0 rounded-t-xl max-h-[80dvh] flex flex-col"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? "none" : undefined,
          }}
        >
          <div
            className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-muted-foreground/30 shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          />
          <SheetHeader className="p-0 mb-4 shrink-0">
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">
            <FilterControls
              filter={filter}
              sort={sort}
              onChange={onChange}
              onSortChange={onSortChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Content (suspends on initial load only) ─────────────────────────────────

function CardListContent({
  filter,
  sort,
  showDescription,
}: {
  filter: CardFilterInput;
  sort: CardSort | null;
  showDescription: boolean;
}) {
  const initialFilterRef = useRef(filter);
  const initialSortRef = useRef(sort);
  const data = useLazyLoadQuery<CardListPageQuery>(Query, {
    filter: initialFilterRef.current,
    sort: initialSortRef.current,
  });
  return (
    <CardList
      queryRef={data}
      filter={filter}
      sort={sort}
      showDescription={showDescription}
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CardListPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const filter = buildFilter(search);
  const sort = buildSort(search);
  const [showDescription, setShowDescription] = useState(false);

  function handleFilterChange(newFilter: CardFilterInput) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({
        ...filterToSearch(newFilter, sort),
        cardId: prev.cardId,
      }),
      replace: true,
    });
  }

  function handleSortChange(newSort: CardSort | null) {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({
        ...filterToSearch(filter, newSort),
        cardId: prev.cardId,
      }),
      replace: true,
    });
  }

  return (
    <div className="flex flex-col md:flex-row">
      <FilterBar
        filter={filter}
        sort={sort}
        onChange={handleFilterChange}
        onSortChange={handleSortChange}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <FilterBottomSheet
          filter={filter}
          sort={sort}
          onChange={handleFilterChange}
          onSortChange={handleSortChange}
          showDescription={showDescription}
          onToggleDescription={() => setShowDescription((v) => !v)}
        />
        <div className="hidden md:flex items-center gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              showDescription
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <FileTextIcon className="h-3.5 w-3.5" />
            효과
          </button>
        </div>
        <Suspense>
          <CardListContent
            filter={filter}
            sort={sort}
            showDescription={showDescription}
          />
        </Suspense>
        {search.cardId && (
          <Suspense>
            <CardByIdOverlay cardId={search.cardId} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
