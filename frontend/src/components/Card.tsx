import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { UnitCard } from "./UnitCard";
import { PilotCard } from "./PilotCard";
import { BaseCard } from "./BaseCard";
import { CommandCard } from "./CommandCard";
import { ResourceCard } from "./ResourceCard";
import { CardDescription } from "./CardDescription";
import { COLOR_BORDER50 } from "src/render/color";
import { cn } from "src/lib/utils";
import { PlusIcon } from "lucide-react";

const Fragment = graphql`
  fragment CardFragment on Card {
    __typename
    ... on UnitCard {
      id
      color
      description
      limit
      blocked
      ...UnitCardFragment
    }
    ... on PilotCard {
      id
      color
      description
      limit
      blocked
      ...PilotCardFragment
    }
    ... on BaseCard {
      id
      color
      description
      limit
      blocked
      ...BaseCardFragment
    }
    ... on CommandCard {
      id
      color
      description
      limit
      blocked
      ...CommandCardFragment
    }
    ... on Resource {
      id
      ...ResourceCardFragment
    }
  }
`;

type Props = {
  cardRef: CardFragment$key;
  showDescription: boolean;
  onAdd?: (cardId: string) => void;
  onOpen?: (cardId: string) => void;
  deckCardCount?: number;
  deckColors?: string[];
};

export function Card({ cardRef, showDescription, onAdd, onOpen, deckCardCount = 0, deckColors }: Props) {
  const card = useFragment(Fragment, cardRef);

  const description: readonly string[] =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard"
      ? card.description
      : [];

  const borderClass =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard"
      ? COLOR_BORDER50[card.color]
      : undefined;

  const cardEl = (() => {
    switch (card.__typename) {
      case "UnitCard":
        return <UnitCard unitCardRef={card} onOpen={onOpen} />;
      case "PilotCard":
        return <PilotCard pilotCardRef={card} onOpen={onOpen} />;
      case "BaseCard":
        return <BaseCard baseCardRef={card} onOpen={onOpen} />;
      case "CommandCard":
        return <CommandCard commandCardRef={card} onOpen={onOpen} />;
      case "Resource":
        return <ResourceCard resourceCardRef={card} onOpen={onOpen} />;
      default:
        return null;
    }
  })();

  const isPlayable =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard";

  const cardId = isPlayable ? card.id : undefined;
  const cardLimit = isPlayable ? card.limit : Infinity;
  const blocked = isPlayable ? card.blocked : false;
  const colorBlocked =
    onAdd &&
    isPlayable &&
    deckColors !== undefined &&
    deckColors.length >= 2 &&
    !deckColors.includes(card.color);
  const atLimit = blocked || colorBlocked || deckCardCount >= cardLimit;

  return (
    <div className="flex flex-col">
      <div className={cn("relative group", atLimit && onAdd && "opacity-50")}>
        {onAdd && cardId && !atLimit && (
          <button
            type="button"
            className="absolute bottom-0 left-0 right-0 h-1/2 z-10 flex items-center justify-center rounded-b-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => onAdd(cardId)}
          >
            <PlusIcon className="size-8 text-white drop-shadow" />
          </button>
        )}
        {onAdd && atLimit && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1/2 z-10"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {onAdd && deckCardCount > 0 && (
          <div className="absolute top-1.5 right-1.5 z-10 min-w-7 h-7 rounded-full bg-white text-black text-sm font-black flex items-center justify-center px-1 leading-none pointer-events-none shadow-lg ring-2 ring-black/20">
            ×{deckCardCount}
          </div>
        )}
        {cardEl}
      </div>
      {showDescription && description.length > 0 && (
        <div
          className={cn(
            "mt-2 rounded-xl bg-black px-3 py-3 text-white border",
            borderClass,
          )}
        >
          <CardDescription lines={description} />
        </div>
      )}
    </div>
  );
}
