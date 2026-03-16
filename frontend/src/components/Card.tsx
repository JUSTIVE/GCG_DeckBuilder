import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { UnitCard } from "./UnitCard";

const Fragment = graphql`
  fragment CardFragment on Card {
    __typename
    ... on UnitCard {
      ...UnitCardFragment
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
    default:
      return null;
  }
}
