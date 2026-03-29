import { graphql } from "relay-runtime";
import type { CommandCardFragment$key } from "@/__generated__/CommandCardFragment.graphql";
import type { CommandCard_CommandCardBody$key } from "@/__generated__/CommandCard_CommandCardBody.graphql";

import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { renderTrait } from "@/render/trait";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG, COLOR_BG20, COLOR_TEXT20 } from "src/render/color";
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
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={commandCard.name}
      />
      <div className="bg-black text-white z-1 w-fit self-end px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
        {commandCard.id}-{renderRarity(commandCard.rarity)}
      </div>
      {commandCard.commandPilot == null && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      )}
      <div />
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-[6cqw] font-bold text-center">
            {commandCard.name}
          </div>
        </div>
        {commandCard.commandPilot != null ? (
          <div className="flex flex-row gap-0.5 pr-2 bg-white/20 backdrop-blur-sm">
            <div className="flex flex-col justify-end flex-1 overflow-hidden">
              <div className="flex flex-row">
                <div className={cn("w-4 bg-black -mr-4 py-px pb-1")} />
                <div className="bg-black overflow-hidden w-full pl-7 cutout cutout-tr-sm px-2 pt-px pb-0.5 min-h-3">
                  <div
                    className={cn(
                      "flex text-end text-white text-[6cqw] items-center min-h-[6cqw] justify-center",
                      COLOR_TEXT20[commandCard.color],
                    )}
                  >
                    <span>{commandCard.commandPilot.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row -translate-y-px">
                <div
                  className={cn(
                    "w-12 bg-black -mr-5 text-[3cqw] px-2 items-center flex",
                    COLOR_BG[commandCard.color],
                    commandCard.color !== "WHITE" ? "text-white" : "text-black",
                  )}
                >
                  파일럿
                </div>
                <div
                  className={cn(
                    "w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 px-2 py-px",
                    COLOR_BG20[commandCard.color],
                  )}
                >
                  <div className="flex text-end text-gray-900 text-[4cqw] justify-end ">
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
            <div className="flex flex-row gap-0.5 min-w-8">
              <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
                +{commandCard.commandPilot?.AP}
              </div>
              <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
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
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline font-semibold",
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <CommandCardBody commandCardRef={commandCard} />
      </button>
    </>
  );
}
