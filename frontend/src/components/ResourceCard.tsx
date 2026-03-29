import { graphql } from "relay-runtime";
import type { ResourceCardFragment$key } from "@/__generated__/ResourceCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import tempimg from "./tempimg.webp";
import { renderRarity } from "@/render/rarity";
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

export function ResourceCardBody({
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
        <ResourceCardBody resourceCard={resourceCard} />
      </button>
    </>
  );
}
