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
};

export function Card({ cardRef, showDescription }: Props) {
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
        return <UnitCard unitCardRef={card} />;
      case "PilotCard":
        return <PilotCard pilotCardRef={card} />;
      case "BaseCard":
        return <BaseCard baseCardRef={card} />;
      case "CommandCard":
        return <CommandCard commandCardRef={card} />;
      case "Resource":
        return <ResourceCard resourceCardRef={card} />;
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-col">
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
