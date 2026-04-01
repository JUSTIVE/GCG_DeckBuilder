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
      ...UnitCardFragment
    }
    ... on PilotCard {
      id
      color
      description
      ...PilotCardFragment
    }
    ... on BaseCard {
      id
      color
      description
      ...BaseCardFragment
    }
    ... on CommandCard {
      id
      color
      description
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
};

export function Card({ cardRef, showDescription, onAdd, onOpen }: Props) {
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

  const cardId =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard"
      ? card.id
      : undefined;

  return (
    <div className="flex flex-col relative">
      {onAdd && cardId && (
        <button
          type="button"
          className="absolute bottom-1.5 right-1.5 z-10 size-7 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary transition-colors"
          onClick={() => onAdd(cardId)}
        >
          <PlusIcon className="size-4" />
        </button>
      )}
      {cardEl}
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
