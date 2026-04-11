import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import type { CardPreview_card$key } from "@/__generated__/CardPreview_card.graphql";
import { UnitCardBody } from "./UnitCard";
import { PilotCardBody } from "./PilotCard";
import { BaseCardBody } from "./BaseCard";
import { CommandCardBody } from "./CommandCard";
import { ResourceCardBody } from "./ResourceCard";
import { COLOR_BG, COLOR_BORDER, COLOR_SHADOW } from "src/render/color";
import { cn } from "@/lib/utils";

const Fragment = graphql`
  fragment CardPreview_card on Card {
    __typename
    ... on UnitCard {
      id
      color
      ...UnitCard_UnitCardBody
    }
    ... on PilotCard {
      id
      color
      ...PilotCard_PilotCardBody
    }
    ... on BaseCard {
      id
      color
      ...BaseCard_BaseCardBody
    }
    ... on CommandCard {
      id
      color
      ...CommandCard_CommandCardBody
    }
    ... on Resource {
      id
      ...ResourceCard_ResourceCardBody_Fragment
    }
  }
`;

export function CardPreview({
  cardRef,
  onOpen,
}: {
  cardRef: CardPreview_card$key;
  onOpen?: (id: string) => void;
}) {
  const card = useFragment(Fragment, cardRef);

  const color =
    card.__typename !== "Resource" && card.__typename !== "%other"
      ? (card as { color: string }).color
      : null;

  const borderCls = color ? COLOR_BORDER[color] : "border-gray-300";
  const shadowCls = color ? COLOR_SHADOW[color] : "";
  const cardBg = color ? COLOR_BG[color] : "bg-black";
  const isWhite = color === "WHITE";

  const id = card.__typename !== "%other" ? (card as { id: string }).id : null;

  const body = (() => {
    switch (card.__typename) {
      case "UnitCard":
        return <UnitCardBody unitCardRefs={card} cardBg={cardBg} isWhite={isWhite} />;
      case "PilotCard":
        return <PilotCardBody pilotCardRef={card} />;
      case "BaseCard":
        return <BaseCardBody baseCardRef={card} isWhite={isWhite} />;
      case "CommandCard":
        return <CommandCardBody commandCardRef={card} />;
      case "Resource":
        return <ResourceCardBody resourceCardRef={card} />;
      default:
        return null;
    }
  })();

  return (
    <button
      type="button"
      onClick={() => id && onOpen?.(id)}
      className={cn(
        "@container relative flex flex-col aspect-800/1117 w-full rounded-xl justify-between text-white overflow-hidden outline border-2",
        borderCls,
        shadowCls,
        onOpen && id ? "cursor-pointer" : "cursor-default",
      )}
    >
      {body}
    </button>
  );
}
