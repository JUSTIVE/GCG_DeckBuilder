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
      ...UnitCardFragment
    }
    ... on PilotCard {
      id
      ...PilotCardFragment
    }
    ... on BaseCard {
      id
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
};

export function Card({ cardRef }: Props) {
  const card = useFragment(Fragment, cardRef);

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
}
