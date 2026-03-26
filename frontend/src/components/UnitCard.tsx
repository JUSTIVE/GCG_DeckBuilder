import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import { renderZone } from "@/render/zone";

const Fragment = graphql`
  fragment UnitCardFragment on UnitCard {
    id
    level
    cost
    name
    color
    description
    AP
    HP
    zone
    trait
  }
`;

type Props = {
  unitCardRef: UnitCardFragment$key;
};

export function UnitCard({ unitCardRef }: Props) {
  const unitCard = useFragment(Fragment, unitCardRef);

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
    <div
      className={cn(
        "flex flex-col aspect-100/160 min-w-50 w-75 rounded-xl bg-gray-100/50 justify-between border border-8",
        cardBorderColor,
      )}
    >
      <div className={cn("inline-flex flex-col font-bold w-fit  items-start")}>
        <div className={cn("px-2 cutout-br-sm cutout", cardBackgroundColor)}>
          <span className="opacity-50">Lv.{unitCard.level}</span>
        </div>
        <div className={cn("px-2 cutout-br-[4px] cutout", cardBackgroundColor)}>
          <span className="text-3xl opacity-50">{unitCard.cost}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-2">
        <div className="flex flex-col gap-0.5">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-lg font-bold">
            {unitCard.name}
          </div>
          {unitCard.description.length > 0 && (
            <div className="p-2 bg-black whitespace-pre-wrap text-sm">
              {unitCard.description.join("\n")}
            </div>
          )}
        </div>
        <div className="flex flex-row gap-2">
          <div className="flex-1 flex-col">
            <div className="flex flex-row">
              {unitCard.zone.map((x) => (
                <div
                  className={cn(
                    "px-3 text-xs cutout cutout-bl-sm cutout-tr-sm not-first:-ml-2",
                    cardBackgroundColor,
                  )}
                  key={x}
                >
                  {renderZone(x)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-row gap-1">
            <div className="bg-black p-1 px-0.5 min-w-[30px] flex justify-center font-bold text-2xl">
              {unitCard.AP}
            </div>
            <div className="bg-black p-1 px-0.5 min-w-[30px] flex justify-center font-bold text-2xl">
              {unitCard.HP}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
