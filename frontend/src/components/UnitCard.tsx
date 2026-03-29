import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { ZoneChip } from "./ZoneChip";
import { renderTrait } from "@/render/trait";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG, COLOR_BG20 } from "src/render/color";

const Fragment = graphql`
  fragment UnitCardFragment on UnitCard {
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
};

// Shared card body used in both thumbnail and dialog.
export function UnitCardBody({
  unitCard,
  cardBg,
  isWhite,
}: {
  unitCard: {
    name: string;
    color: string;
    AP: number;
    HP: number;
    zone: readonly string[];
    traits: readonly string[];
    links: readonly {
      __typename: string;
      pilot?: { name: string };
      trait?: string;
    }[];
  };
  cardBg: string;
  isWhite: boolean;
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={unitCard.name}
      />
      <div />
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-[6cqw] font-bold text-center">
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
                <div className="w-6 bg-black -mr-4 py-px pb-1 z-1 text-[3cqw] pl-1.5">
                  링크
                </div>
                <div className="bg-black overflow-hidden w-full pl-7 parallelogram parallelogram-sm px-2 pt-px pb-0.5 min-h-3">
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

export function UnitCard({ unitCardRef }: Props) {
  const unitCard = useFragment(Fragment, unitCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === unitCard.id;

  const cardBg = COLOR_BG[unitCard.color] ?? "bg-black";
  const isWhite = unitCard.color === "WHITE";

  function openDialog() {
    router.navigate({
      to: "/cardlist",
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
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline",
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <UnitCardBody unitCard={unitCard} cardBg={cardBg} isWhite={isWhite} />
      </button>
    </>
  );
}
