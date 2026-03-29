import { graphql } from "relay-runtime";
import type { ResourceCardFragment$key } from "@/__generated__/ResourceCardFragment.graphql";
import { useFragment } from "react-relay";
import { cn } from "@/lib/utils";
import tempimg from "./tempimg.webp";
import { renderRarity } from "@/render/rarity";
import { Route } from "@/routes/cardlist";
import { useRouter } from "@tanstack/react-router";
import type { ResourceCard_ResourceCardBody_Fragment$key } from "src/__generated__/ResourceCard_ResourceCardBody_Fragment.graphql";

export function ResourceCardBody({
  resourceCardRef,
}: {
  resourceCardRef: ResourceCard_ResourceCardBody_Fragment$key;
}) {
  const resourceCard = useFragment(
    graphql`
      fragment ResourceCard_ResourceCardBody_Fragment on Resource {
        id
        name
        rarity
      }
    `,
    resourceCardRef,
  );

  return (
    <>
      <img
        className="absolute w-full h-full object-cover top-0"
        src={tempimg}
        alt={resourceCard.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="bg-black text-white z-1 w-fit self-end px-6 text-[3cqw] parallelogramx parallelogram-lg h-5 flex items-center ">
        {resourceCard.id}-{renderRarity(resourceCard.rarity)}
      </div>
      <div className="z-1 px-2 pb-2">
        <div className="p-2 bg-black/80 text-white text-[6cqw] font-bold text-center cutout-tl-sm cutout whitespace-pre-wrap">
          {resourceCard.name}
        </div>
      </div>
    </>
  );
}

const Fragment = graphql`
  fragment ResourceCardFragment on Resource {
    ...ResourceCard_ResourceCardBody_Fragment
    id
    name
  }
`;

type Props = {
  resourceCardRef: ResourceCardFragment$key;
};

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
    <button
      type="button"
      className={cn(
        "@container relative flex flex-col aspect-800/1117 min-w-40 w-full rounded-xl justify-between cursor-pointer text-white overflow-hidden outline",
        open && "z-10",
      )}
      onClick={openDialog}
    >
      <ResourceCardBody resourceCardRef={resourceCard} />
    </button>
  );
}
