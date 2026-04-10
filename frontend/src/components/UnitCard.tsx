import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import type { UnitCard_UnitCardBody$key } from "@/__generated__/UnitCard_UnitCardBody.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";

import { ZoneChip } from "./ZoneChip";
import { renderTrait } from "@/render/trait";
import { useRouter, useSearch, useParams } from "@tanstack/react-router";
import {
  COLOR_BG,
  COLOR_BG20,
  COLOR_BORDER,
  COLOR_SHADOW,
} from "src/render/color";
import { renderRarity } from "src/render/rarity";

// Shared card body used in both thumbnail and dialog.
export function UnitCardBody({
  unitCardRefs,
  cardBg,
  isWhite,
}: {
  unitCardRefs: UnitCard_UnitCardBody$key;
  cardBg: string;
  isWhite: boolean;
}) {
  const unitCard = useFragment(
    graphql`
      fragment UnitCard_UnitCardBody on UnitCard {
        id
        name
        level
        rarity
        cost
        color
        imageUrl
        AP
        HP
        zone
        traits
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
    `,
    unitCardRefs,
  );

  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0 bg-gray-100"
        src={unitCard.imageUrl}
        alt={""}
      />
      <div className="flex flex-col gap-[11cqw]">
        <div className="flex flex-row items-start justify-between z-1">
          <div className="flex flex-col font-bold">
            <div
              className={cn(
                "text-white text-[6cqw] w-[20cqw] leading-[8cqw] cutout cutout-br-sm text-center",
                COLOR_BG[unitCard.color],
                unitCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              <span className="text-[3cqw]">Lv.</span>
              {unitCard.level}
            </div>
            <div
              className={cn(
                "text-white w-[15cqw] text-[12cqw] leading-[12cqw] pb-2 cutout cutout-br-sm -translate-y-px text-center",
                COLOR_BG[unitCard.color],
                unitCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              {unitCard.cost}
            </div>
          </div>
          <div className="bg-black text-white z-1 w-fit px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
            {unitCard.id}-{renderRarity(unitCard.rarity)}
          </div>
        </div>
        <div>
          <div
            className={cn(
              "w-[7cqw] cutout cutout-r-lg h-[40cqw] text-[4cqw] font-semibold pl-0.5 flex items-center",
              COLOR_BG[unitCard.color],
            )}
          >
            <span
              className={cn(
                "rotate-90 min-w-[20cqw] translate-x-[-7cqw] scale-y-80",
                unitCard.color === "WHITE" ? "text-gray-400" : "text-white/80",
              )}
            >
              유닛
            </span>
          </div>
          <div
            className={cn(
              "w-[3.5cqw] cutout cutout-br-lg h-[15cqw] font-semibold pl-0.5 flex items-center -translate-y-[1cqh]",
              COLOR_BG[unitCard.color],
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 ">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap break-words cutout-tl-sm cutout text-[6cqw] font-bold text-center">
            {unitCard.name}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row px-3">
            {unitCard.zone.map((x) => (
              <ZoneChip
                zone={x}
                className={cn(cardBg, isWhite ? "text-black" : "")}
                key={x}
              />
            ))}
          </div>
          <div className="flex flex-row gap-0.5 pr-2 bg-white/20 backdrop-blur-sm">
            <div className="flex flex-col justify-end flex-1 overflow-hidden ">
              <div className="flex flex-row">
                <div className="w-2 bg-black -mr-5" />
                <div className="w-10 bg-black -mr-5 parallelogram parallelogram-sm" />
                <div
                  className={cn(
                    "w-[calc(100%-12px)] ml-3 overflow-hidden px-2 py-px",
                    COLOR_BG20[unitCard.color],
                  )}
                >
                  <div className="flex text-end text-gray-900 text-[4cqw]">
                    <Marquee speed={8} gap={0}>
                      {unitCard.traits.map((x) => (
                        <span key={x} className="px-1">
                          ({renderTrait(x)})
                        </span>
                      ))}
                    </Marquee>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-center">
                <div className="w-6 h-5 bg-black -mr-4 py-px z-1 text-[3cqw] pl-1.5 min-h-3 leading-[6cqw]">
                  링크
                </div>
                <div className="bg-black overflow-hidden w-full pl-7 parallelogram parallelogram-sm px-2 pt-px pb-0.5 min-h-3 h-5 items-center flex">
                  <div className="flex text-end text-white text-[4cqw] items-center min-h-[6cqw]">
                    <Marquee speed={6}>
                      {unitCard.links.map((x) =>
                        x.__typename === "LinkPilot" && x.pilot ? (
                          <span key={x.pilot.name}>[{x.pilot.name}]</span>
                        ) : x.__typename === "LinkTrait" && x.trait ? (
                          <span key={x.trait}>({renderTrait(x.trait)})</span>
                        ) : null,
                      )}
                    </Marquee>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row gap-0.5 min-w-8">
              <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
                {unitCard.AP}
              </div>
              <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
                {unitCard.HP}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Fragment = graphql`
  fragment UnitCardFragment on UnitCard {
    ...UnitCard_UnitCardBody
    id
    level
    cost
    name
    color
    description
    rarity
    AP
    HP
    zone
    traits
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
`;

type Props = {
  unitCardRef: UnitCardFragment$key;
  onOpen?: (cardId: string) => void;
};

export function UnitCard({ unitCardRef, onOpen }: Props) {
  const unitCard = useFragment(Fragment, unitCardRef);
  const search = useSearch({ strict: false }) as { cardId?: string };
  const router = useRouter();
  const { locale = "ko" } = useParams({ strict: false });

  const open = search.cardId === unitCard.id;

  const cardBg = COLOR_BG[unitCard.color] ?? "bg-black";
  const isWhite = unitCard.color === "WHITE";

  function openDialog() {
    if (onOpen) { onOpen(unitCard.id); return; }
    router.navigate({
      to: "/$locale/cardlist",
      params: { locale },
      search: (prev) => ({ ...prev, cardId: unitCard.id }),
      replace: true,
    });
  }

  return (
    <>
      {/* ── Thumbnail ───────────────────────────────────────────────────── */}
      <button
        type="button"
        className={cn(
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline border-2",
          COLOR_BORDER[unitCard.color],
          COLOR_SHADOW[unitCard.color],
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <UnitCardBody
          unitCardRefs={unitCard}
          cardBg={cardBg}
          isWhite={isWhite}
        />
      </button>
    </>
  );
}
