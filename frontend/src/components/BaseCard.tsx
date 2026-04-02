import { graphql } from "relay-runtime";
import type { BaseCardFragment$key } from "@/__generated__/BaseCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import { ZoneChip } from "./ZoneChip";
import { renderTrait } from "@/render/trait";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
  COLOR_BG,
  COLOR_BG20,
  COLOR_TEXT,
  COLOR_BORDER,
  COLOR_SHADOW,
} from "src/render/color";
import type { BaseCard_BaseCardBody$key } from "src/__generated__/BaseCard_BaseCardBody.graphql";
import { renderRarity } from "src/render/rarity";

export function BaseCardBody({
  baseCardRef,
  isWhite,
}: {
  baseCardRef: BaseCard_BaseCardBody$key;

  isWhite: boolean;
}) {
  const baseCard = useFragment(
    graphql`
      fragment BaseCard_BaseCardBody on BaseCard {
        id
        level
        cost
        rarity
        name
        color
        imageUrl
        AP
        HP
        zone
        traits
        description
      }
    `,
    baseCardRef,
  );
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0 bg-gray-100"
        src={baseCard.imageUrl}
        alt={baseCard.name}
      />
      <div className="flex flex-col gap-[5cqw]">
        <div className="flex flex-row items-start justify-between z-1">
          <div className="flex flex-col font-bold">
            <div
              className={cn(
                "text-white text-[6cqw] w-[20cqw] leading-[8cqw] cutout cutout-br-sm text-center",
                COLOR_BG[baseCard.color],
                baseCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              <span className="text-[3cqw]">Lv.</span>
              {baseCard.level}
            </div>
            <div
              className={cn(
                "text-white w-[16cqw] text-[12cqw] leading-[12cqw] pb-2 cutout cutout-br-[4px] -translate-y-px text-center",
                COLOR_BG[baseCard.color],
                baseCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              {baseCard.cost}
            </div>
          </div>
          <div className="bg-black text-white z-1 w-fit px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
            {baseCard.id}-{renderRarity(baseCard.rarity)}
          </div>
        </div>
        <div>
          <div
            className={cn(
              "w-[8cqw] cutout cutout-r-2xl h-[55cqw] text-[4cqw] font-semibold pl-0.5 flex items-center",
              COLOR_BG[baseCard.color],
            )}
          >
            <span
              className={cn(
                "rotate-90 min-w-[20cqw] translate-x-[-7cqw] scale-y-80",
                baseCard.color === "WHITE" ? "text-gray-400" : "text-white/80",
              )}
            >
              베이스
            </span>
          </div>
          <div
            className={cn(
              "w-[3.5cqw] cutout cutout-br-lg h-[15cqw] font-semibold pl-0.5 flex items-center -mt-[2cqh]",
              COLOR_BG[baseCard.color],
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap break-words cutout-tl-sm cutout text-[6cqw] font-bold text-center">
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
                <div className="w-10 bg-transparent -mr-5 " />
                <div className="w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 parallelogramx parallelogram-sm px-2 py-px">
                  <div className="flex text-end text-gray-900 text-[4cqw]">
                    <Marquee speed={8} gap={0}>
                      {baseCard.traits.map((x) => (
                        <span key={x} className="px-1">
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
                    ? "text-gray-400"
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
                    ? "text-gray-400"
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

const Fragment = graphql`
  fragment BaseCardFragment on BaseCard {
    ...BaseCard_BaseCardBody
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
  onOpen?: (cardId: string) => void;
};

export function BaseCard({ baseCardRef, onOpen }: Props) {
  const baseCard = useFragment(Fragment, baseCardRef);
  const search = useSearch({ strict: false }) as { cardId?: string };
  const router = useRouter();

  const open = search.cardId === baseCard.id;

  const isWhite = baseCard.color === "WHITE";

  function openDialog() {
    if (onOpen) { onOpen(baseCard.id); return; }
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: baseCard.id }),
      replace: true,
    });
  }

  return (
    <button
      type="button"
      className={cn(
        "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline border-2",
        COLOR_BORDER[baseCard.color],
        COLOR_SHADOW[baseCard.color],
        open && "z-10",
      )}
      onClick={openDialog}
    >
      <BaseCardBody baseCardRef={baseCard} isWhite={isWhite} />
    </button>
  );
}
