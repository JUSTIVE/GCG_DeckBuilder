import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import Marquee from "@/components/Marquee";
import tempimg from "./tempimg.webp";
import { ZoneChip } from "./ZoneChip";
import { TraitChip } from "./TraitChip";
import { renderTrait } from "@/render/trait";
import { renderZone } from "@/render/zone";
import { Dialog } from "@base-ui/react/dialog";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import { COLOR_BG, COLOR_BG50, COLOR_HEX } from "src/render/color";

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
};

// Shared card body used in both thumbnail and dialog.
function CardBody({
  unitCard,
  cardBg,
  cardBg50,
  isWhite,
}: {
  unitCard: {
    name: string;
    AP: number;
    HP: number;
    zone: readonly string[];
    traits: readonly string[];
    links: readonly {
      __typename: string;
      pilot?: { name: string };
      trait?: string;
    }[];
  };
  cardBg: string;
  cardBg50: string;
  isWhite: boolean;
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={unitCard.name}
      />
      <div />
      <div className="flex flex-col gap-2 z-1">
        <div className="px-2">
          <div className="p-2 bg-black whitespace-pre-wrap cutout-tl-sm cutout text-xs font-bold">
            {unitCard.name}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row px-3">
            {unitCard.zone.map((x) => (
              <ZoneChip
                zone={x}
                className={cn(cardBg, isWhite ? "text-black" : "")}
                key={x}
              />
            ))}
          </div>
          <div className={cn("flex flex-row gap-0.5 pr-2", cardBg50)}>
            <div className="flex flex-col justify-end flex-1 overflow-hidden">
              <div className="flex flex-row translate-y-px">
                <div className="w-2 bg-black -mr-5" />
                <div className="w-10 bg-black -mr-5 parallelogram parallelogram-sm" />
                <div className="w-[calc(100%-12px)] ml-3 overflow-hidden bg-gray-100/80 parallelogram parallelogram-sm px-2 py-px">
                  <div className="flex text-end text-gray-900 text-[4cqw]">
                    <Marquee speed={8}>
                      {unitCard.traits.map((x) => (
                        <TraitChip trait={x} key={x} />
                      ))}
                    </Marquee>
                  </div>
                </div>
              </div>
              <div className="flex flex-row">
                <div className="w-4 bg-black -mr-4 py-px pb-1" />
                <div className="bg-black overflow-hidden w-full pl-7 parallelogram parallelogram-sm px-2 pt-px pb-0.5 min-h-3">
                  <div className="flex text-end text-white text-[4cqw] items-center min-h-[6cqw]">
                    <Marquee speed={6}>
                      {unitCard.links.map((x) =>
                        x.__typename === "LinkPilot" && x.pilot ? (
                          <span key={x.pilot.name}>[{x.pilot.name}]</span>
                        ) : x.__typename === "LinkTrait" && x.trait ? (
                          <span key={x.trait}>({renderTrait(x.trait)})</span>
                        ) : null,
                      )}
                    </Marquee>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row gap-0.5 min-w-8">
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
    </>
  );
}

export function UnitCard({ unitCardRef }: Props) {
  const unitCard = useFragment(Fragment, unitCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === unitCard.id;

  const cardBg = COLOR_BG[unitCard.color] ?? "bg-black";
  const cardBg50 = COLOR_BG50[unitCard.color] ?? "bg-gray-500";
  const isWhite = unitCard.color === "WHITE";

  const linkLabels = unitCard.links
    .map((x) =>
      x.__typename === "LinkPilot" && x.pilot
        ? `[${x.pilot.name}]`
        : x.__typename === "LinkTrait" && x.trait
          ? `(${renderTrait(x.trait)})`
          : null,
    )
    .filter(Boolean);

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: unitCard.id }),
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
      {/* ── Thumbnail ───────────────────────────────────────────────────── */}
      <button
        type="button"
        className={cn(
          "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline",
          open && "z-10",
        )}
        onClick={openDialog}
      >
        <CardBody
          unitCard={unitCard}
          cardBg={cardBg}
          cardBg50={cardBg50}
          isWhite={isWhite}
        />
      </button>

      {/* ── Detail dialog ────────────────────────────────────────────────── */}
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
            {/* Large card */}
            <div className="@container pointer-events-auto relative flex w-72 sm:w-80 shrink-0 flex-col aspect-800/1117 justify-between text-white overflow-hidden rounded-xl shadow-2xl">
              <CardBody
                unitCard={unitCard}
                cardBg={cardBg}
                cardBg50={cardBg50}
                isWhite={isWhite}
              />
            </div>

            {/* Description panel */}
            <div className="pointer-events-auto max-h-[80dvh] w-72 overflow-y-auto rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                    style={{ background: COLOR_HEX[unitCard.color] ?? "#000" }}
                  />
                  <h2 className="text-sm font-bold leading-tight">
                    {unitCard.name}
                  </h2>
                </div>
                <div className="text-xs text-white/60">{unitCard.id}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
                  <span>Lv {unitCard.level}</span>
                  <span>코스트 {unitCard.cost}</span>
                  <span>AP {unitCard.AP}</span>
                  <span>HP {unitCard.HP}</span>
                </div>
              </div>

              {unitCard.zone.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    지형
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {unitCard.zone.map((z) => (
                      <span
                        key={z}
                        className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs"
                      >
                        {renderZone(z)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {unitCard.traits.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    특성
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {unitCard.traits.map((t) => (
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

              {linkLabels.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    링크
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {linkLabels.map((l) => (
                      <span
                        key={l}
                        className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {unitCard.description.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    효과
                  </span>
                  <ul className="flex flex-col gap-2">
                    {unitCard.description.map((line) => (
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
