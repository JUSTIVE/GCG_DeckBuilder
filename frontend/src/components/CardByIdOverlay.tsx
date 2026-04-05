import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { CardByIdOverlayQuery } from "@/__generated__/CardByIdOverlayQuery.graphql";
import type { CardByIdOverlayAddCardViewMutation } from "@/__generated__/CardByIdOverlayAddCardViewMutation.graphql";
import { useEffect } from "react";

const ADD_CARD_VIEW_MUTATION = graphql`
  mutation CardByIdOverlayAddCardViewMutation($cardId: ID!) {
    addCardView(cardId: $cardId) {
      ...SearchHistoryPanel_list
    }
  }
`;
import { UnitCardBody } from "./UnitCard";
import { PilotCardBody } from "./PilotCard";
import { BaseCardBody } from "./BaseCard";
import { CommandCardBody } from "./CommandCard";
import { ResourceCardBody } from "./ResourceCard";
import { renderTrait } from "@/render/trait";
import { KEYWORD_DESCRIPTIONS } from "@/render/keywordDescription";
import { renderZone } from "@/render/zone";
import { renderRarity } from "@/render/rarity";
import { renderSeries } from "@/render/series";
import { renderPackage } from "@/render/package";
import {
  COLOR_BG,
  COLOR_HEX,
  COLOR_BORDER,
  COLOR_SHADOW,
} from "src/render/color";
import { cn } from "@/lib/utils";
import { CardDescription } from "./CardDescription";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "@tanstack/react-router";
import type { CardListSearch, CardTrait } from "@/routes/cardlist";

const Query = graphql`
  query CardByIdOverlayQuery($id: ID!) {
    node(id: $id) {
      id
      __typename
      ... on UnitCard {
        ...UnitCard_UnitCardBody
        id
        name
        level
        cost
        color
        AP
        HP
        description
        zone
        traits
        relatedTraits
        keywords
        series
        package
        links {
          __typename
          ... on LinkPilot {
            pilot {
              name
            }
          }
          ... on LinkTrait {
            trait
          }
        }
      }
      ... on PilotCard {
        ...PilotCard_PilotCardBody
        id
        level
        cost
        color
        traits
        relatedTraits
        keywords
        description
        series
        package
        pilot {
          name
          AP
          HP
        }
      }
      ... on BaseCard {
        ...BaseCard_BaseCardBody
        id
        name
        level
        cost
        color
        AP
        HP
        description
        zone
        traits
        relatedTraits
        keywords
        series
        package
      }
      ... on CommandCard {
        ...CommandCard_CommandCardBody
        id
        name
        level
        cost
        color
        traits
        relatedTraits
        keywords
        description
        series
        package
        commandPilot: pilot {
          name
          AP
          HP
        }
      }
      ... on Resource {
        ...ResourceCard_ResourceCardBody_Fragment
        id
        name
        rarity
      }
    }
  }
`;

function KeywordContent({
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        키워드
      </span>
      {entries.map((entry, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-1.5 rounded-lg border px-3 py-2",
            borderClass ?? "border-white/20",
          )}
        >
          <CardDescription lines={[entry.name]} borderClass={borderClass} />
          <CardDescription
            lines={[entry.description]}
            borderClass={borderClass}
          />
        </div>
      ))}
    </div>
  );
}

function KeywordPanel({
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
        <div
          key={i}
          className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-3 text-white backdrop-blur-md flex flex-col gap-1.5"
        >
          <CardDescription lines={[entry.name]} borderClass={borderClass} />
          <CardDescription
            lines={[entry.description]}
            borderClass={borderClass}
          />
        </div>
      ))}
    </div>
  );
}

export function CardByIdOverlay({
  cardId,
  onClose,
  cardIds,
}: {
  cardId: string;
  onClose?: () => void;
  cardIds?: string[];
}) {
  const data = useLazyLoadQuery<CardByIdOverlayQuery>(Query, { id: cardId });
  const router = useRouter();

  const node = data.node;

  const [commitAddCardView] = useMutation<CardByIdOverlayAddCardViewMutation>(
    ADD_CARD_VIEW_MUTATION,
  );

  useEffect(() => {
    if (!node || node.__typename === "%other") return;
    commitAddCardView({ variables: { cardId } });
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cardIds?.length) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = cardIds!.indexOf(cardId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= cardIds!.length) return;
      e.preventDefault();
      router.navigate({
        to: "/cardlist",
        search: (prev) => ({ ...prev, cardId: cardIds![nextIdx] }),
        replace: true,
        viewTransition: true,
      });
    }
    document.addEventListener("keydown", handleKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKey, { capture: true });
  }, [cardIds, cardId, router]);

  if (!node || node.__typename === "%other") return null;

  function closeDialog() {
    if (onClose) {
      onClose();
      return;
    }
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: undefined }),
      replace: true,
    });
  }

  function navigateWithFilter(filter: Partial<CardListSearch>) {
    router.navigate({
      to: "/cardlist",
      search: filter,
      replace: true,
    });
  }

  function renderKeywords() {
    if (!node || node.__typename === "%other" || node.__typename === "Resource")
      return null;
    if (!("keywords" in node) || !node.keywords?.length) return null;
    return <KeywordPanel keywords={node.keywords as string[]} />;
  }

  function renderThumbnail() {
    if (!node) return null;
    if (node.__typename === "UnitCard") {
      const cardBg = COLOR_BG[node.color ?? ""] ?? "bg-black";
      const isWhite = node.color === "WHITE";
      return (
        <UnitCardBody unitCardRefs={node} cardBg={cardBg} isWhite={isWhite} />
      );
    }
    if (node.__typename === "PilotCard") {
      return <PilotCardBody pilotCardRef={node} />;
    }
    if (node.__typename === "BaseCard") {
      const isWhite = node.color === "WHITE";
      return <BaseCardBody baseCardRef={node} isWhite={isWhite} />;
    }
    if (node.__typename === "CommandCard") {
      return <CommandCardBody commandCardRef={node} />;
    }
    if (node.__typename === "Resource") {
      return <ResourceCardBody resourceCardRef={node} />;
    }
    return null;
  }

  function renderDetails() {
    if (!node) return null;

    if (node.__typename === "UnitCard") {
      const linkItems = (node.links ?? [])
        .map((x) => {
          if (x.__typename === "LinkPilot" && x.pilot) {
            return {
              label: `[${x.pilot.name}]`,
              onClick: () => navigateWithFilter({ query: x.pilot!.name }),
            };
          }
          if (x.__typename === "LinkTrait" && x.trait) {
            return {
              label: `(${renderTrait(x.trait)})`,
              onClick: () =>
                navigateWithFilter({ trait: [x.trait as CardTrait] }),
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return (
        <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                style={{ background: COLOR_HEX[node.color ?? ""] ?? "#000" }}
                onClick={() =>
                  navigateWithFilter({ color: [node.color as any] })
                }
              />
              <h2 className="text-sm font-bold leading-tight">{node.name}</h2>
            </div>
            <div className="text-xs text-white/60">{node.id}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
              <span>Lv {node.level}</span>
              <span>코스트 {node.cost}</span>
              <span>AP {node.AP}</span>
              <span>HP {node.HP}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
            <span>{renderSeries(node.series ?? "")}</span>
            <button
              type="button"
              className="hover:text-white cursor-pointer"
              onClick={() =>
                navigateWithFilter({
                  package: node.package as CardListSearch["package"],
                })
              }
            >
              {renderPackage(node.package ?? "")}
            </button>
          </div>

          {(node.zone?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                지형
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.zone ?? []).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => navigateWithFilter({ zone: [z as any] })}
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderZone(z)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.traits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.traits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(node.relatedTraits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                관련 특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.relatedTraits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {linkItems.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                링크
              </span>
              <div className="flex flex-wrap gap-1">
                {linkItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.description?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                효과
              </span>
              <CardDescription lines={node.description ?? []} />
            </div>
          )}

          {(node.keywords?.length ?? 0) > 0 && (
            <div className="sm:hidden">
              <KeywordContent keywords={(node.keywords as string[] | undefined) ?? []} />
            </div>
          )}
        </div>
      );
    }

    if (node.__typename === "PilotCard") {
      return (
        <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                style={{ background: COLOR_HEX[node.color ?? ""] ?? "#000" }}
                onClick={() =>
                  navigateWithFilter({ color: [node.color as any] })
                }
              />
              <h2 className="text-sm font-bold leading-tight">
                {node.pilot?.name}
              </h2>
            </div>
            <div className="text-xs text-white/60">{node.id}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
              <span>Lv {node.level}</span>
              <span>코스트 {node.cost}</span>
              <span>AP {node.pilot?.AP}</span>
              <span>HP {node.pilot?.HP}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
            <span>{renderSeries(node.series ?? "")}</span>
            <button
              type="button"
              className="hover:text-white cursor-pointer"
              onClick={() =>
                navigateWithFilter({ package: node.package as any })
              }
            >
              {renderPackage(node.package ?? "")}
            </button>
          </div>

          {(node.traits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.traits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(node.relatedTraits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                관련 특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.relatedTraits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.description?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                효과
              </span>
              <CardDescription lines={node.description ?? []} />
            </div>
          )}

          {(node.keywords?.length ?? 0) > 0 && (
            <div className="sm:hidden">
              <KeywordContent keywords={(node.keywords as string[] | undefined) ?? []} />
            </div>
          )}
        </div>
      );
    }

    if (node.__typename === "BaseCard") {
      return (
        <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                style={{ background: COLOR_HEX[node.color ?? ""] ?? "#000" }}
                onClick={() =>
                  navigateWithFilter({ color: [node.color as any] })
                }
              />
              <h2 className="text-sm font-bold leading-tight">{node.name}</h2>
            </div>
            <div className="text-xs text-white/60">{node.id}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
              <span>Lv {node.level}</span>
              <span>코스트 {node.cost}</span>
              <span>AP {node.AP}</span>
              <span>HP {node.HP}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
            <span>{renderSeries(node.series ?? "")}</span>
            <button
              type="button"
              className="hover:text-white cursor-pointer"
              onClick={() =>
                navigateWithFilter({ package: node.package as any })
              }
            >
              {renderPackage(node.package ?? "")}
            </button>
          </div>

          {(node.zone?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                지형
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.zone ?? []).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => navigateWithFilter({ zone: [z as any] })}
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderZone(z)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.traits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.traits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(node.relatedTraits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                관련 특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.relatedTraits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.description?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                효과
              </span>
              <CardDescription lines={node.description ?? []} />
            </div>
          )}

          {(node.keywords?.length ?? 0) > 0 && (
            <div className="sm:hidden">
              <KeywordContent keywords={(node.keywords as string[] | undefined) ?? []} />
            </div>
          )}
        </div>
      );
    }

    if (node.__typename === "CommandCard") {
      return (
        <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20 cursor-pointer hover:scale-125 transition-transform"
                style={{ background: COLOR_HEX[node.color ?? ""] ?? "#000" }}
                onClick={() =>
                  navigateWithFilter({ color: [node.color as any] })
                }
              />
              <h2 className="text-sm font-bold leading-tight">{node.name}</h2>
            </div>
            <div className="text-xs text-white/60">{node.id}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
              <span>Lv {node.level}</span>
              <span>코스트 {node.cost}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
            <span>{renderSeries(node.series ?? "")}</span>
            <button
              type="button"
              className="hover:text-white cursor-pointer"
              onClick={() =>
                navigateWithFilter({ package: node.package as any })
              }
            >
              {renderPackage(node.package ?? "")}
            </button>
          </div>

          {node.commandPilot && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                파일럿
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <button
                  type="button"
                  className="hover:text-white cursor-pointer"
                  onClick={() =>
                    navigateWithFilter({ query: node.commandPilot!.name })
                  }
                >
                  {node.commandPilot.name}
                </button>
                <span className="text-white/60">AP {node.commandPilot.AP}</span>
                <span className="text-white/60">HP {node.commandPilot.HP}</span>
              </div>
            </div>
          )}

          {(node.traits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.traits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(node.relatedTraits?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                관련 특성
              </span>
              <div className="flex flex-wrap gap-1">
                {(node.relatedTraits ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigateWithFilter({ trait: [t as CardTrait] })
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 cursor-pointer"
                  >
                    {renderTrait(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(node.description?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                효과
              </span>
              <CardDescription lines={node.description ?? []} />
            </div>
          )}

          {(node.keywords?.length ?? 0) > 0 && (
            <div className="sm:hidden">
              <KeywordContent keywords={(node.keywords as string[] | undefined) ?? []} />
            </div>
          )}
        </div>
      );
    }

    if (node.__typename === "Resource") {
      return (
        <div className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-2">
          <h2 className="text-sm font-bold leading-tight">{node.name}</h2>
          <div className="text-xs text-white/60">{node.id}</div>
          <div className="text-xs text-white/60">
            {renderRarity(node.rarity ?? "")}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <Dialog.Root open={true} onOpenChange={closeDialog}>
      <Dialog.Portal>
        <Dialog.Backdrop
          onClick={closeDialog}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <Dialog.Popup className="fixed inset-0 z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden outline-none transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <div className="flex items-center justify-center gap-4 p-6 pointer-events-none min-h-full">
            <div className="flex flex-col gap-4 items-center shrink-0">
              <div
                className={cn(
                  "@container pointer-events-auto relative flex w-72 sm:w-80 shrink-0 flex-col aspect-800/1117 justify-between text-white overflow-hidden rounded-xl border-2",
                  node && "color" in node
                    ? COLOR_BORDER[node.color as string]
                    : undefined,
                  node && "color" in node
                    ? COLOR_SHADOW[node.color as string]
                    : undefined,
                )}
              >
                {renderThumbnail()}
              </div>
              {renderDetails()}
            </div>
            {renderKeywords()}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
