import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { graphql, useLazyLoadQuery } from "react-relay";
import { localize } from "@/lib/localize";
import i18n from "@/i18n";
import type { KeywordsPageCardsQuery } from "@/__generated__/KeywordsPageCardsQuery.graphql";
import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { ALL_KEYWORDS } from "@/lib/filterConstants";
import {
  triggerClassByKeyword,
  abilityClassByKeyword,
  TRIGGER_FALLBACK,
  ABILITY_FALLBACK,
  CardDescription,
} from "@/components/CardDescription";
import type { CardKeyword } from "@/routes/$locale/cardlist";
import { COLOR_HEX } from "src/render/color";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { AbilityDemo } from "@/components/AbilityDemo";
import { CardByIdOverlay } from "@/components/CardByIdOverlay";
import { Dossier } from "@/components/docket";

// ── query ─────────────────────────────────────────────────────────────────────

const CardsQuery = graphql`
  query KeywordsPageCardsQuery($keyword: CardKeyword!) {
    cards(first: 200, filter: { keyword: [$keyword], kind: [UNIT, PILOT, BASE, COMMAND] }) {
      totalCount
      edges {
        node {
          __typename
          ... on UnitCard {
            id
            name {
              en
              ko
            }
            color {
              value
            }
          }
          ... on PilotCard {
            id
            pilot {
              name {
                en
                ko
              }
            }
            color {
              value
            }
          }
          ... on BaseCard {
            id
            name {
              en
              ko
            }
            color {
              value
            }
          }
          ... on CommandCard {
            id
            name {
              en
              ko
            }
            color {
              value
            }
          }
        }
      }
    }
  }
`;

// ── keyword badge ─────────────────────────────────────────────────────────────

const TRIGGER_LIGHT_FALLBACK = "bg-gray-100 text-gray-700";
const ABILITY_LIGHT_FALLBACK = "border-gray-300 bg-gray-50 text-gray-700";

function KeywordBadge({ keyword }: { keyword: string }) {
  const { t } = useTranslation("game");
  const kw = keyword as CardKeyword;
  const firstToken = KEYWORD_DESCRIPTIONS[keyword]?.name[0];
  const label = t(`keyword.${kw.toUpperCase()}`);
  if (firstToken?.type === "trigger") {
    const cls = triggerClassByKeyword(kw);
    return (
      <span
        className={cn(
          "inline-flex items-center rounded px-2 py-0.5 text-sm font-semibold w-fit",
          cls === TRIGGER_FALLBACK ? TRIGGER_LIGHT_FALLBACK : cls,
        )}
      >
        {label}
      </span>
    );
  }
  const cls = abilityClassByKeyword(kw);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-sm font-semibold w-fit",
        cls === ABILITY_FALLBACK ? ABILITY_LIGHT_FALLBACK : cls,
      )}
    >
      {label}
    </span>
  );
}

// ── card list ─────────────────────────────────────────────────────────────────

const TYPENAME_KIND: Record<string, string> = {
  UnitCard: "UNIT",
  PilotCard: "PILOT",
  BaseCard: "BASE",
  CommandCard: "COMMAND",
};

function typenameLabel(typename: string): string {
  const kind = TYPENAME_KIND[typename];
  return kind ? i18n.t(`kind.${kind}`, { ns: "game", defaultValue: typename }) : "";
}

function KeywordCardList({ keyword, onOpen }: { keyword: string; onOpen: (id: string) => void }) {
  const { i18n } = useTranslation();
  const data = useLazyLoadQuery<KeywordsPageCardsQuery>(CardsQuery, {
    keyword: keyword as any,
  });
  const edges = data.cards.edges;

  return (
    <div className={cn("border-t border-border px-3 py-2 flex flex-col gap-0.5")}>
      {edges.map(({ node }) => {
        const n = node as any;
        const id: string = n.id ?? "";
        const rawName = n.name ?? n.pilot?.name;
        const name: string = rawName ? localize(rawName, i18n.language) : id;
        const color: string = n.color?.value ?? "";
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
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
              {typenameLabel(node.__typename)}
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
  onOpen,
}: {
  keyword: string;
  className?: string;
  onOpen: (id: string) => void;
}) {
  useTranslation("game"); // language-change subscription for CardDescription locale
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const entry = KEYWORD_DESCRIPTIONS[keyword];
  if (!entry) return null;

  return (
    <div
      id={`kw-${keyword}`}
      className={cn(
        "rounded-lg border transition-all duration-300",
        playing ? "border-primary/60 bg-primary/5" : "border-border",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 rounded-lg"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <KeywordBadge keyword={keyword} />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <CardDescription lines={[entry.description]} />
          </div>
        </div>
        <ChevronRightIcon
          className={cn(
            "size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      <AbilityDemo keyword={keyword} onPlayingChange={setPlaying} />
      {open && (
        <Suspense
          fallback={
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              {i18n.t("search.searching", { ns: "common" })}
            </div>
          }
        >
          <KeywordCardList keyword={keyword} onOpen={onOpen} />
        </Suspense>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const triggerKeywords = ALL_KEYWORDS.filter(
  (k) => KEYWORD_DESCRIPTIONS[k]?.name[0]?.type === "trigger",
);
const abilityKeywords = ALL_KEYWORDS.filter(
  (k) => KEYWORD_DESCRIPTIONS[k]?.name[0]?.type === "ability",
);

export function KeywordsPage() {
  const { t } = useTranslation("common");
  const { t: tGame } = useTranslation("game");
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);

  return (
    <div className="flex flex-col w-full md:h-[calc(100vh-4rem)] md:overflow-hidden">
      <Dossier
        docId="GCG-KW-DICT"
        category="REFERENCE / 用語集"
        title={t("nav.keywordDictionary")}
        description={t("nav.keywordDictionary") as string}
        edition="REV. 03"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 w-full md:flex-1 md:min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 items-start md:flex-1 md:min-h-0">
          <section className="flex flex-col gap-3 md:h-full md:overflow-y-auto md:pr-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider md:sticky md:top-0 md:bg-background md:z-10 md:py-1">
              {tGame("category.trigger")}
            </h2>
            <div className="flex flex-col gap-2">
              {triggerKeywords.map((kw) => (
                <KeywordEntry key={kw} keyword={kw} onOpen={setOverlayCardId} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3 md:h-full md:overflow-y-auto md:pr-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider md:sticky md:top-0 md:bg-background md:z-10 md:py-1">
              {tGame("category.ability")}
            </h2>
            <div className="flex flex-col gap-2">
              {abilityKeywords.map((kw) => (
                <KeywordEntry
                  key={kw}
                  keyword={kw}
                  className={"bg-gray-800/10"}
                  onOpen={setOverlayCardId}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {overlayCardId && (
        <Suspense>
          <CardByIdOverlay cardId={overlayCardId} onClose={() => setOverlayCardId(null)} />
        </Suspense>
      )}
    </div>
  );
}
