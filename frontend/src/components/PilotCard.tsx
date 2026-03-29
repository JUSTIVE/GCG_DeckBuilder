import { graphql } from "relay-runtime";
import type { PilotCardFragment$key } from "@/__generated__/PilotCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { renderTrait } from "@/render/trait";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG, COLOR_BG20 } from "src/render/color";
import type { PilotCard_PilotCardBody$key } from "src/__generated__/PilotCard_PilotCardBody.graphql";
import { renderRarity } from "src/render/rarity";

export function PilotCardBody({
  pilotCardRef,
}: {
  pilotCardRef: PilotCard_PilotCardBody$key;
}) {
  const pilotCard = useFragment(
    graphql`
      fragment PilotCard_PilotCardBody on PilotCard {
        id
        rarity
        color
        traits
        pilot {
          name
          AP
          HP
        }
      }
    `,
    pilotCardRef,
  );

  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={pilotCard.pilot.name}
      />

      <div className="bg-black text-white z-1 w-fit self-end px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
        {pilotCard.id}-{renderRarity(pilotCard.rarity)}
      </div>
      <div className="flex flex-col gap-2 z-1">
        <div className="flex flex-row gap-0.5 pr-2 bg-white/20 backdrop-blur-sm">
          <div className="flex flex-col justify-end flex-1 overflow-hidden">
            <div className="">
              <div className="p-2 py-1 bg-black whitespace-pre-wrap cutout-tr-sm cutout text-[6cqw] font-bold text-center">
                {pilotCard.pilot.name}
              </div>
            </div>
            <div className="flex flex-row translate-y-px">
              <div
                className={cn(
                  "w-12 bg-black -mr-5 text-[3cqw] px-2 items-center flex",
                  COLOR_BG[pilotCard.color],
                  pilotCard.color !== "WHITE" ? "text-white" : "text-black",
                )}
              >
                파일럿
              </div>
              <div
                className={cn(
                  "w-[calc(100%-12px)] ml-3 overflow-hidden  px-2 py-px",
                  COLOR_BG20[pilotCard.color],
                )}
              >
                <div className="flex text-end text-gray-900 text-[4cqw]">
                  <Marquee speed={8} gap={0}>
                    {pilotCard.traits.map((x) => (
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
              +{pilotCard.pilot.AP}
            </div>
            <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
              +{pilotCard.pilot.HP}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Fragment = graphql`
  fragment PilotCardFragment on PilotCard {
    ...PilotCard_PilotCardBody
    id
    level
    cost
    color
    rarity
    traits
    description
    pilot {
      name
      AP
      HP
    }
  }
`;

type Props = {
  pilotCardRef: PilotCardFragment$key;
};

export function PilotCard({ pilotCardRef }: Props) {
  const pilotCard = useFragment(Fragment, pilotCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === pilotCard.id;

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: pilotCard.id }),
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
        <PilotCardBody pilotCardRef={pilotCard} />
      </button>
    </>
  );
}
