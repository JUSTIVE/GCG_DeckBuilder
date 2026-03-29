import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { use } from "react";
import { CardListFocusContext } from "./CardList";
import { ZoneChip } from "./ZoneChip";
import { TraitChip } from "./TraitChip";
import { renderTrait } from "@/render/trait";

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
  focused: boolean;
};

export function UnitCard({ unitCardRef, focused }: Props) {
  const focusContext = use(CardListFocusContext);
  const unitCard = useFragment(Fragment, unitCardRef);
  if (!focusContext) return null;
  const { setFocusedCard } = focusContext;

  const cardBackgroundColor =
    unitCard.color === "BLUE"
      ? "bg-[#0272B6]"
      : unitCard.color === "GREEN"
        ? "bg-[#62A43E]"
        : unitCard.color === "RED"
          ? "bg-[#BD0152]"
          : unitCard.color === "PURPLE"
            ? "bg-[#764A92]"
            : unitCard.color === "YELLOW"
              ? "bg-[#D3B078]"
              : unitCard.color === "WHITE"
                ? "bg-[#FFFFFF]"
                : "bg-[#000000]";
  const cardBackgroundColor50 =
    unitCard.color === "BLUE"
      ? "bg-[#7FB8DA]"
      : unitCard.color === "GREEN"
        ? "bg-[#B0D19E]"
        : unitCard.color === "RED"
          ? "bg-[#DE80A8]"
          : unitCard.color === "PURPLE"
            ? "bg-[#BAA4C8]"
            : unitCard.color === "YELLOW"
              ? "bg-[#E9D7BB]"
              : unitCard.color === "WHITE"
                ? "bg-[#FFFFFF]"
                : "bg-[#808080]";

  return (
    <div className="flex flex-col relative">
      <button
        type="button"
        className={cn(
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl  justify-between transform-all cursor-pointer text-white  overflow-hidden outline",
        )}
        onClick={() => {
          setFocusedCard(focused ? null : unitCard.id);
        }}
      >
        <img
          className="absolute w-full h-full object-cover top-0 rounded-sm scale-100"
          src={tempimg}
          alt=""
        />
        <div></div>

        <div className="flex flex-col gap-2 z-1">
          <div className="grid grid-cols-1 gap-0.5 px-2">
            <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-xs font-bold ">
              {unitCard.name}
            </div>
          </div>
          <div className="flex flex-col gap-0.5 ">
            <div className="flex flex-row px-3">
              {unitCard.zone.map((x) => (
                <ZoneChip
                  zone={x}
                  className={cn(
                    cardBackgroundColor,
                    unitCard.color === "WHITE" ? "text-black" : "",
                  )}
                  key={x}
                />
              ))}
            </div>
            <div
              className={cn("flex flex-row gap-1 pr-2", cardBackgroundColor50)}
            >
              <div className="flex flex-col justify-end flex-1 overflow-hidden ">
                <div className="flex flex-row translate-y-px">
                  <div className="w-2 bg-black -mr-5 " />
                  <div className="w-10 bg-black -mr-5 parallelogram parallelogram-sm" />
                  <div
                    className={cn(
                      "w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 parallelogram parallelogram-sm px-2 py-px",
                    )}
                  >
                    <div
                      className={cn("flex text-end text-gray-900 text-[4cqw]")}
                    >
                      <Marquee speed={8}>
                        {unitCard.traits.map((x) => (
                          <TraitChip trait={x} key={x} />
                        ))}
                      </Marquee>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row ">
                  <div className="w-4 bg-black -mr-4 py-px pb-1"></div>
                  <div className="bg-black overflow-hidden w-full pl-7 parallelogram parallelogram-sm px-2 w-full pt-px pb-0.5 min-h-3">
                    <div
                      className={cn(
                        "flex text-end text-white text-[4cqw] items-center min-h-[6cqw]",
                      )}
                    >
                      <Marquee speed={6}>
                        {unitCard.links.map((x) => {
                          return x.__typename === "LinkPilot" ? (
                            <span key={x.pilot.name}>[{x.pilot.name}]</span>
                          ) : x.__typename === "LinkTrait" ? (
                            <span key={x.trait}>({renderTrait(x.trait)})</span>
                          ) : null;
                        })}
                      </Marquee>
                    </div>
                  </div>
                </div>
              </div>
              <div className=" flex  flex-row gap-0.5 min-w-8">
                <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw]">
                  {unitCard.AP}
                </div>
                <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw]">
                  {unitCard.HP}
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
      {focused && unitCard.description.length > 0 && (
        <div
          className={cn(
            "p-2 bg-black whitespace-pre-wrap text-sm origin-bottom overflow-hidden absolute  text-white z-2 cutout cutout-tl-sm p-4 top-[calc(100%+4px)] isolate",
          )}
        >
          <ul className="flex flex-col gap-1">
            {unitCard.description.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
