import { graphql } from "relay-runtime";
import type { BaseCardFragment$key } from "@/__generated__/BaseCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { ZoneChip } from "./ZoneChip";
import { renderTrait } from "@/render/trait";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG, COLOR_BG20, COLOR_TEXT } from "src/render/color";

const Fragment = graphql`
  fragment BaseCardFragment on BaseCard {
    id
    name
    level
    cost
    color
    rarity
    AP
    HP
    zone
    traits
    description
  }
`;

type Props = {
  baseCardRef: BaseCardFragment$key;
};

export function BaseCardBody({
  baseCard,
  isWhite,
}: {
  baseCard: {
    name: string;
    color: string;
    AP: number;
    HP: number;
    zone: readonly string[];
    traits: readonly string[];
  };

  isWhite: boolean;
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={baseCard.name}
      />
      <div />
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-[6cqw] font-bold text-center">
            {baseCard.name}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row px-3">
            {baseCard.zone.map((x) => (
              <ZoneChip
                zone={x}
                className={cn(
                  COLOR_BG[baseCard.color],
                  isWhite ? "text-black" : "",
                )}
                key={x}
              />
            ))}
          </div>
          <div
            className={cn(
              "flex flex-row gap-0.5 pr-2 bg-white/20 backdrop-blur-sm",
            )}
          >
            <div className="flex flex-col justify-end flex-1 overflow-hidden">
              <div className="flex flex-row translate-y-px">
                <div className="w-2 bg-transparent -mr-5" />
                <div className="w-10 bg-transparent -mr-5 parallelogram parallelogram-sm" />
                <div className="w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 parallelogram parallelogram-sm px-2 py-px">
                  <div className="flex text-end text-gray-900 text-[4cqw]">
                    <Marquee speed={8} gap={0}>
                      {baseCard.traits.map((x) => (
                        <span key={x} className="px-2">
                          ({renderTrait(x)})
                        </span>
                      ))}
                    </Marquee>
                  </div>
                </div>
              </div>
              <div className="min-h-[6cqw]" />
            </div>
            <div className="flex flex-row gap-0.5 min-w-8">
              <div
                className={cn(
                  "aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1",
                  COLOR_BG20[baseCard.color],
                  baseCard.color === "WHITE"
                    ? "text-black"
                    : COLOR_TEXT[baseCard.color],
                )}
              >
                {baseCard.AP}
              </div>
              <div
                className={cn(
                  "bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1",
                  COLOR_BG20[baseCard.color],
                  baseCard.color === "WHITE"
                    ? "text-black"
                    : COLOR_TEXT[baseCard.color],
                )}
              >
                {baseCard.HP}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function BaseCard({ baseCardRef }: Props) {
  const baseCard = useFragment(Fragment, baseCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === baseCard.id;

  const isWhite = baseCard.color === "WHITE";

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: baseCard.id }),
      replace: true,
    });
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline",
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <BaseCardBody baseCard={baseCard} isWhite={isWhite} />
      </button>
    </>
  );
}
