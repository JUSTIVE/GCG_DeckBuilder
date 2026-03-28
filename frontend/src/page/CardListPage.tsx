import type { CardListPageQuery } from "@/__generated__/CardListPageQuery.graphql";
import { CardList } from "@/components/CardList";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";

const Query = graphql`
  query CardListPageQuery {
    ...CardListFragment @arguments(first: 999, filter: { kind: [UNIT, PILOT] })
  }
`;

export function CardListPage() {
  const data = useLazyLoadQuery<CardListPageQuery>(Query, {});

  return <CardList queryRef={data} />;
}
