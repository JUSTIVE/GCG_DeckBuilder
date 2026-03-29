import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { UnitCard } from "./UnitCard";
import { PilotCard } from "./PilotCard";
import { BaseCard } from "./BaseCard";
import { CommandCard } from "./CommandCard";
import { ResourceCard } from "./ResourceCard";

const Fragment = graphql`
  fragment CardFragment on Card {
    __typename
    ... on UnitCard {
      id
      description
      ...UnitCardFragment
    }
    ... on PilotCard {
      id
      description
      ...PilotCardFragment
    }
    ... on BaseCard {
      id
      description
      ...BaseCardFragment
    }
    ... on CommandCard {
      id
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
    card.__typename === "BaseCard"
      ? card.description
      : [];

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
        <div className="mt-2 rounded-xl bg-black/80 px-3 py-3 text-white flex flex-col gap-1.5">
          <ul className="flex flex-col gap-1.5">
            {description.map((line) => (
              <li key={line} className="text-xs leading-relaxed text-white/90">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
