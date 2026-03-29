import { graphql } from "relay-runtime";
import type { PilotCardFragment$key } from "@/__generated__/PilotCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { renderKeyword } from "@/render/keyword";
import { Dialog } from "@base-ui/react/dialog";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG50, COLOR_HEX } from "src/render/color";

const Fragment = graphql`
  fragment PilotCardFragment on PilotCard {
    id
    level
    cost
    color
    rarity
    keywords
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

function CardBody({
  pilotCard,
  cardBg50,
}: {
  pilotCard: {
    keywords: readonly string[];
    pilot: { name: string; AP: number; HP: number };
  };
  cardBg50: string;
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={pilotCard.pilot.name}
      />
      <div />
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-[6cqw] font-bold text-center">
            {pilotCard.pilot.name}
          </div>
        </div>
        <div className={cn("flex flex-row gap-0.5 pr-2", cardBg50)}>
          <div className="flex flex-col justify-end flex-1 overflow-hidden">
            <div className="flex flex-row translate-y-px">
              <div className="w-2 bg-black -mr-5" />
              <div className="w-10 bg-black -mr-5 parallelogram parallelogram-sm" />
              <div className="w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 parallelogram parallelogram-sm px-2 py-px">
                <div className="flex text-end text-gray-900 text-[4cqw]">
                  <Marquee speed={8}>
                    {pilotCard.keywords.map((x) => (
                      <span key={x} className="mr-2">
                        {renderKeyword(x)}
                      </span>
                    ))}
                  </Marquee>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-0.5 min-w-8">
            <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
              {pilotCard.pilot.AP}
            </div>
            <div className="bg-black aspect-100/160 flex-1 flex justify-center items-center font-bold text-[8cqw] px-1">
              {pilotCard.pilot.HP}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PilotCard({ pilotCardRef }: Props) {
  const pilotCard = useFragment(Fragment, pilotCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === pilotCard.id;

  const cardBg50 = COLOR_BG50[pilotCard.color] ?? "bg-gray-500";

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: pilotCard.id }),
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
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline",
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <CardBody pilotCard={pilotCard} cardBg50={cardBg50} />
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
              <CardBody pilotCard={pilotCard} cardBg50={cardBg50} />
            </div>

            <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{ background: COLOR_HEX[pilotCard.color] ?? "#000" }}
                  />
                  <h2 className="text-sm font-bold leading-tight">
                    {pilotCard.pilot.name}
                  </h2>
                </div>
                <div className="text-xs text-white/60">{pilotCard.id}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
                  <span>Lv {pilotCard.level}</span>
                  <span>코스트 {pilotCard.cost}</span>
                  <span>AP {pilotCard.pilot.AP}</span>
                  <span>HP {pilotCard.pilot.HP}</span>
                </div>
              </div>

              {pilotCard.keywords.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    키워드
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {pilotCard.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs"
                      >
                        {renderKeyword(k)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pilotCard.description.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    효과
                  </span>
                  <ul className="flex flex-col gap-2">
                    {pilotCard.description.map((line) => (
                      <li
                        key={line}
                        className="text-xs leading-relaxed text-white/90"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
