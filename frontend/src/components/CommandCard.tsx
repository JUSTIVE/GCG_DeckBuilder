import { graphql } from "relay-runtime";
import type { CommandCardFragment$key } from "@/__generated__/CommandCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { renderTrait } from "@/render/trait";
import { CardDescription } from "./CardDescription";
import { Dialog } from "@base-ui/react/dialog";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import {
  COLOR_BG,
  COLOR_BG20,
  COLOR_HEX,
  COLOR_TEXT20,
} from "src/render/color";

const Fragment = graphql`
  fragment CommandCardFragment on CommandCard {
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

function CardBody({
  commandCard,
}: {
  commandCard: {
    name: string;
    color: string;
    traits: readonly string[];
    commandPilot?: { name: string; AP: number; HP: number } | null;
  };
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={commandCard.name}
      />
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
                        <span key={x} className="px-2">
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

  function closeDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: undefined }),
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
        <CardBody commandCard={commandCard} />
      </button>

      <Dialog.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) closeDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop
            onClick={closeDialog}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          />
          <Dialog.Popup className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 pointer-events-none outline-none transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="@container pointer-events-auto relative flex w-72 sm:w-80 shrink-0 flex-col aspect-800/1117 justify-between text-white overflow-hidden rounded-xl shadow-2xl">
              <CardBody commandCard={commandCard} />
            </div>

            <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{
                      background: COLOR_HEX[commandCard.color] ?? "#000",
                    }}
                  />
                  <h2 className="text-sm font-bold leading-tight">
                    {commandCard.name}
                  </h2>
                </div>
                <div className="text-xs text-white/60">{commandCard.id}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
                  <span>Lv {commandCard.level}</span>
                  <span>코스트 {commandCard.cost}</span>
                </div>
              </div>

              {commandCard.commandPilot && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    파일럿
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    <span>{commandCard.commandPilot.name}</span>
                    <span className="text-white/60">
                      AP {commandCard.commandPilot.AP}
                    </span>
                    <span className="text-white/60">
                      HP {commandCard.commandPilot.HP}
                    </span>
                  </div>
                </div>
              )}

              {commandCard.traits.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    특성
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {commandCard.traits.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs"
                      >
                        {renderTrait(t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {commandCard.description.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    효과
                  </span>
                  <CardDescription lines={commandCard.description} />
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
