import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { UnitCard } from "./UnitCard";
import { use } from "react";
import { CardListFocusContext } from "./CardList";

const Fragment = graphql`
  fragment CardFragment on Card {
    __typename
    ... on UnitCard {
      id
      ...UnitCardFragment
    }
  }
`;

type Props = {
  cardRef: CardFragment$key;
};

export function Card({ cardRef }: Props) {
  const card = useFragment(Fragment, cardRef);

  const focusContext = use(CardListFocusContext);
  if (!focusContext) return null;
  const { focusedCard } = focusContext;

  switch (card.__typename) {
    case "UnitCard":
      return <UnitCard unitCardRef={card} focused={focusedCard === card.id} />;
    default:
      return null;
  }
}
