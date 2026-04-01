import { graphql } from "relay-runtime";
import type { CommandCardFragment$key } from "@/__generated__/CommandCardFragment.graphql";
import type { CommandCard_CommandCardBody$key } from "@/__generated__/CommandCard_CommandCardBody.graphql";

import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";

import { renderTrait } from "@/render/trait";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import {
  COLOR_BG,
  COLOR_BG20,
  COLOR_TEXT20,
  COLOR_BORDER,
  COLOR_SHADOW,
} from "src/render/color";
import { renderRarity } from "src/render/rarity";

export function CommandCardBody({
  commandCardRef,
}: {
  commandCardRef: CommandCard_CommandCardBody$key;
}) {
  const commandCard = useFragment(
    graphql`
      fragment CommandCard_CommandCardBody on CommandCard {
        id
        level
        cost
        name
        rarity
        color
        traits
        commandPilot: pilot {
          name
          AP
          HP
        }
      }
    `,
    commandCardRef,
  );

  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0 bg-gray-100"
        alt={commandCard.name}
      />
      <div className="flex flex-col gap-[5cqw]">
        <div className="flex flex-row items-start justify-between z-1">
          <div className="flex flex-col font-bold">
            <div
              className={cn(
                "text-white text-[6cqw] w-[20cqw] leading-[8cqw] cutout cutout-br-sm text-center",
                COLOR_BG[commandCard.color],
                commandCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              <span className="text-[3cqw]">Lv.</span>
              {commandCard.level}
            </div>
            <div
              className={cn(
                "text-white w-[16cqw] text-[12cqw] leading-[12cqw] pb-2 cutout cutout-br-[4px] -translate-y-px text-center",
                COLOR_BG[commandCard.color],
                commandCard.color === "WHITE" ? "text-gray-400" : undefined,
              )}
            >
              {commandCard.cost}
            </div>
          </div>
          <div className="bg-black text-white z-1 w-fit px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
            {commandCard.id}-{renderRarity(commandCard.rarity)}
          </div>
        </div>
        <div>
          <div
            className={cn(
              "w-[8cqw] cutout cutout-r-2xl h-[55cqw] text-[4cqw] font-semibold pl-0.5 flex items-center",
              COLOR_BG[commandCard.color],
            )}
          >
            <span
              className={cn(
                "rotate-90 min-w-[20cqw] translate-x-[-7cqw] scale-y-80",
                commandCard.color === "WHITE"
                  ? "text-gray-400"
                  : "text-white/80",
              )}
            >
              커맨드
            </span>
          </div>
          <div
            className={cn(
              "w-[3.5cqw] cutout cutout-br-lg h-[15cqw] font-semibold pl-0.5 flex items-center -translate-y-[2cqh]",
              COLOR_BG[commandCard.color],
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black break-words cutout-tl-sm cutout text-[6cqw] font-bold text-center line-clamp-2">
            {commandCard.name}
          </div>
        </div>
        {commandCard.commandPilot != null ? (
          <div className="flex flex-row gap-0.5 pr-2 bg-white/20 backdrop-blur-sm">
            <div className="flex flex-col flex-1">
              <div className="flex flex-row h-[8cqw] overflow-hidden">
                <div className={cn("w-4 bg-black -mr-4 shrink-0")} />
                <div className="bg-black overflow-hidden w-full pl-7 cutout cutout-tr-sm px-2 flex items-center">
                  <div
                    className={cn(
                      "flex text-white text-[5cqw] w-full overflow-hidden",
                      COLOR_TEXT20[commandCard.color],
                    )}
                  >
                    <Marquee speed={6} gap={16}>
                      <span>{commandCard.commandPilot.name}</span>
                    </Marquee>
                  </div>
                </div>
              </div>

              <div className="flex flex-row h-[6cqw] overflow-hidden">
                <div
                  className={cn(
                    "w-12 bg-black -mr-5 text-[3cqw] px-2 items-center flex shrink-0",
                    COLOR_BG[commandCard.color],
                    commandCard.color !== "WHITE" ? "text-white" : "text-black",
                  )}
                >
                  파일럿
                </div>
                <div
                  className={cn(
                    "w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 px-2 flex items-center",
                    COLOR_BG20[commandCard.color],
                  )}
                >
                  <div className="flex text-gray-900 text-[4cqw] justify-end w-full">
                    <Marquee speed={8} gap={0}>
                      {commandCard.traits.map((x) => (
                        <span key={x} className="px-1">
                          ({renderTrait(x)})
                        </span>
                      ))}
                    </Marquee>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row gap-0.5 min-w-8 self-stretch">
              <div
                className={cn(
                  "bg-black flex-1 h-full flex justify-center items-center font-bold text-[8cqw] px-1",
                  COLOR_TEXT20[commandCard.color],
                )}
              >
                +{commandCard.commandPilot?.AP}
              </div>
              <div
                className={cn(
                  "bg-black flex-1 h-full flex justify-center items-center font-bold text-[8cqw] px-1",
                  COLOR_TEXT20[commandCard.color],
                )}
              >
                +{commandCard.commandPilot?.HP}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

const Fragment = graphql`
  fragment CommandCardFragment on CommandCard {
    ...CommandCard_CommandCardBody
    id
    name
    level
    cost
    color
    rarity
    traits
    commandPilot: pilot {
      name
      AP
      HP
    }
    description
  }
`;

type Props = {
  commandCardRef: CommandCardFragment$key;
};

export function CommandCard({ commandCardRef }: Props) {
  const commandCard = useFragment(Fragment, commandCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === commandCard.id;

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: commandCard.id }),
      replace: true,
    });
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline border-2 font-semibold",
          COLOR_BORDER[commandCard.color],
          COLOR_SHADOW[commandCard.color],
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <CommandCardBody commandCardRef={commandCard} />
      </button>
    </>
  );
}
