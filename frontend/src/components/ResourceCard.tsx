import { graphql } from "relay-runtime";
import type { ResourceCardFragment$key } from "@/__generated__/ResourceCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import tempimg from "./tempimg.webp";
import { renderRarity } from "@/render/rarity";
import { Dialog } from "@base-ui/react/dialog";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";

const Fragment = graphql`
  fragment ResourceCardFragment on Resource {
    id
    name
    rarity
  }
`;

type Props = {
  resourceCardRef: ResourceCardFragment$key;
};

function CardBody({
  resourceCard,
}: {
  resourceCard: { name: string; rarity: string };
}) {
  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={resourceCard.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="z-1 px-2 pt-2 flex justify-end">
        <span className="bg-black/70 text-white text-[4cqw] font-bold px-1.5 py-0.5 rounded">
          {renderRarity(resourceCard.rarity)}
        </span>
      </div>
      <div className="z-1 px-2 pb-2">
        <div className="p-2 bg-black/80 text-white text-[6cqw] font-bold text-center cutout-tl-sm cutout whitespace-pre-wrap">
          {resourceCard.name}
        </div>
      </div>
    </>
  );
}

export function ResourceCard({ resourceCardRef }: Props) {
  const resourceCard = useFragment(Fragment, resourceCardRef);
  const search = Route.useSearch();
  const router = useRouter();

  const open = search.cardId === resourceCard.id;

  function openDialog() {
    router.navigate({
      to: "/cardlist",
      search: (prev) => ({ ...prev, cardId: resourceCard.id }),
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
        <CardBody resourceCard={resourceCard} />
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
              <CardBody resourceCard={resourceCard} />
            </div>

            <div className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-2">
              <h2 className="text-sm font-bold leading-tight">
                {resourceCard.name}
              </h2>
              <div className="text-xs text-white/60">{resourceCard.id}</div>
              <div className="text-xs text-white/60">
                {renderRarity(resourceCard.rarity)}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
