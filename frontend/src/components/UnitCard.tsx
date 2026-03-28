import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.png";
import { use } from "react";
import { CardListFocusContext } from "./CardList";
import { renderRarity } from "@/render/rarity";
import { ZoneChip } from "./ZoneChip";
import { TraitChip } from "./TraitChip";

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

  const cardBorderColor =
    unitCard.color === "BLUE"
      ? "border-[#0272B6]"
      : unitCard.color === "GREEN"
        ? "border-[#62A43E]"
        : unitCard.color === "RED"
          ? "border-[#BD0152]"
          : unitCard.color === "PURPLE"
            ? "border-[#764A92]"
            : unitCard.color === "YELLOW"
              ? "border-[#D3B078]"
              : unitCard.color === "WHITE"
                ? "border-[#FFFFFF]"
                : "border-[#000000]";

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

  return (
    <button
      type="button"
      className={cn(
        "relative flex flex-col aspect-100/160 min-w-25 w-full rounded-xl  justify-between  border-8  transform-all cursor-pointer text-white",
        cardBorderColor,
      )}
      onClick={() => {
        setFocusedCard(focused ? null : unitCard.id);
      }}
    >
      <div className="absolute -right-2 bg-black text-[8px] px-2 -mt-2 cutout cutout-bl-sm pl-4 rounded rounded-tr-xl z-1">
        {`${unitCard.id} ${renderRarity(unitCard.rarity)}`}
      </div>
      <img
        className="absolute w-full h-full object-cover top-0 rounded-sm"
        src={tempimg}
        alt=""
      />
      <div
        className={cn("inline-flex flex-col font-bold w-fit items-start z-1")}
      >
        <div
          className={cn(
            "cutout-br-sm cutout px-2 w-10.5 self-start pl-1",
            cardBackgroundColor,
          )}
        >
          <span className="opacity-80 text-xs">Lv.{unitCard.level}</span>
        </div>
        <div className={cn("px-2 cutout-br-[4px] cutout", cardBackgroundColor)}>
          <span className="text-2xl opacity-80">{unitCard.cost}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-2 z-1">
        <div className="grid grid-cols-1 gap-0.5">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-sm font-bold ">
            {unitCard.name}
          </div>
          {focused && unitCard.description.length > 0 && (
            <div
              className={cn(
                "p-2 bg-black whitespace-pre-wrap text-sm origin-bottom overflow-hidden",
              )}
            >
              {unitCard.description.join("\n")}
            </div>
          )}
        </div>
        <div className="flex flex-row gap-2 ">
          <div className="flex flex-col justify-start flex-1 overflow-hidden">
            <div className="flex flex-row">
              {unitCard.zone.map((x) => (
                <ZoneChip zone={x} className={cardBackgroundColor} key={x} />
              ))}
            </div>
            <div className="w-full overflow-hidden">
              <div
                className={cn(
                  "flex text-end text-gray-900 text-[8px] brightness-200 saturate-50 px-2",
                  cardBackgroundColor,
                )}
              >
                <Marquee speed={6}>
                  {unitCard.traits.map((x) => (
                    <TraitChip trait={x} key={x} />
                  ))}
                </Marquee>
              </div>
            </div>
          </div>
          <div className="@container flex flex-1 flex-row gap-1 min-w-6">
            <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[28cqw]">
              {unitCard.AP}
            </div>
            <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[28cqw]">
              {unitCard.HP}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
