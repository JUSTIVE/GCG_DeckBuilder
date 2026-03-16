import type { CardListFragment$key } from "@/__generated__/CardListFragment.graphql";
import { usePaginationFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { Card } from "./Card";

const Fragment = graphql`
  fragment CardListFragment on Query
  @argumentDefinitions(
    filter: { type: "CardFilterInput" }
    first: { type: "Int" }
    after: { type: "String" }
  ) {
    cards(after: $after, first: $first, filter: $filter)
      @connection(key: "CardListFragment_cards") {
      edges {
        cursor
        node {
          ...CardFragment
        }
      }
    }
  }
`;

type Props = {
  queryRef: CardListFragment$key;
};

export function CardList({ queryRef }: Props) {
  const { data } = usePaginationFragment(Fragment, queryRef);

  return (
    <div className="grid grid-cols-4">
      {data.cards.edges.map(({ cursor, node }) => (
        <Card key={cursor} cardRef={node} />
      ))}
    </div>
  );
}
