import { Suspense, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { KeywordsPageCardsQuery } from "@/__generated__/KeywordsPageCardsQuery.graphql";
import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { ALL_KEYWORDS } from "@/lib/filterConstants";
import {
  triggerClass,
  abilityClass,
  TRIGGER_FALLBACK,
  ABILITY_FALLBACK,
} from "@/components/CardDescription";
import { COLOR_HEX } from "src/render/color";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { AbilityDemo } from "@/components/AbilityDemo";

// ── query ─────────────────────────────────────────────────────────────────────

const CardsQuery = graphql`
  query KeywordsPageCardsQuery($keyword: CardKeyword!) {
    cards(
      first: 200
      filter: { keyword: [$keyword], kind: [UNIT, PILOT, BASE, COMMAND] }
    ) {
      totalCount
      edges {
        node {
          __typename
          ... on UnitCard {
            id
            name
            color
          }
          ... on PilotCard {
            id
            pilot {
              name
            }
            color
          }
          ... on BaseCard {
            id
            name
            color
          }
          ... on CommandCard {
            id
            name
            color
          }
        }
      }
    }
  }
`;

// ── keyword badge ─────────────────────────────────────────────────────────────

const TRIGGER_LIGHT_FALLBACK = "bg-gray-100 text-gray-700";
const ABILITY_LIGHT_FALLBACK = "border-gray-300 bg-gray-50 text-gray-700";

function KeywordBadge({ name }: { name: string }) {
  const isTrigger = name.startsWith("【");
  if (isTrigger) {
    const inner = name.replace(/^【/, "").replace(/】$/, "");
    const cls = triggerClass(inner);
    return (
      <span
        className={cn(
          "inline-flex items-center rounded px-2 py-0.5 text-sm font-semibold w-fit",
          cls === TRIGGER_FALLBACK ? TRIGGER_LIGHT_FALLBACK : cls,
        )}
      >
        {inner}
      </span>
    );
  }
  const inner = name.replace(/^</, "").replace(/>$/, "");
  const cls = abilityClass(inner);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-sm font-semibold w-fit",
        cls === ABILITY_FALLBACK ? ABILITY_LIGHT_FALLBACK : cls,
      )}
    >
      {inner}
    </span>
  );
}

// ── card list ─────────────────────────────────────────────────────────────────

const TYPENAME_KO: Record<string, string> = {
  UnitCard: "유닛",
  PilotCard: "파일럿",
  BaseCard: "베이스",
  CommandCard: "커맨드",
};

function KeywordCardList({ keyword }: { keyword: string }) {
  const router = useRouter();
  const data = useLazyLoadQuery<KeywordsPageCardsQuery>(CardsQuery, {
    keyword: keyword as any,
  });
  const edges = data.cards.edges;

  return (
    <div
      className={cn("border-t border-border px-3 py-2 flex flex-col gap-0.5")}
    >
      {edges.map(({ node }) => {
        const n = node as any;
        const id: string = n.id ?? "";
        const name: string = n.name ?? n.pilot?.name ?? id;
        const color: string = n.color ?? "";
        return (
          <button
            key={id}
            type="button"
            onClick={() =>
              router.navigate({ to: "/cardlist", search: { cardId: id } })
            }
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/50 rounded-md"
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0 border border-black/10"
              style={{ background: COLOR_HEX[color] ?? "#ccc" }}
            />
            <span className="font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              {id}
            </span>
            <span className="text-xs flex-1 min-w-0 truncate">{name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {TYPENAME_KO[node.__typename] ?? ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── keyword entry ─────────────────────────────────────────────────────────────

function KeywordEntry({
  keyword,
  className,
}: {
  keyword: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entry = KEYWORD_DESCRIPTIONS[keyword];
  if (!entry) return null;

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 rounded-lg"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <KeywordBadge name={entry.name} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {entry.description}
          </p>
        </div>
        <ChevronRightIcon
          className={cn(
            "size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      <AbilityDemo keyword={keyword} />
      {open && (
        <Suspense
          fallback={
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              불러오는 중…
            </div>
          }
        >
          <KeywordCardList keyword={keyword} />
        </Suspense>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const triggerKeywords = ALL_KEYWORDS.filter((k) =>
  KEYWORD_DESCRIPTIONS[k]?.name.startsWith("【"),
);
const abilityKeywords = ALL_KEYWORDS.filter((k) =>
  KEYWORD_DESCRIPTIONS[k]?.name.startsWith("<"),
);

export function KeywordsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8 w-full">
      <h1 className="text-lg font-bold">키워드 사전</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          트리거
        </h2>
        <div className="flex flex-col gap-2">
          {triggerKeywords.map((kw) => (
            <KeywordEntry key={kw} keyword={kw} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          어빌리티
        </h2>
        <div className="flex flex-col gap-2">
          {abilityKeywords.map((kw) => (
            <KeywordEntry key={kw} keyword={kw} className={"bg-gray-800/10"} />
          ))}
        </div>
      </section>
    </div>
  );
}
