import type { MainPageQuery } from "@/__generated__/MainPageQuery.graphql";
import { CardList } from "@/components/CardList";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";

const Query = graphql`
  query MainPageQuery {
    ...CardListFragment @arguments(filter: { kind: UNIT })
  }
`;

export function MainPage() {
  const data = useLazyLoadQuery<MainPageQuery>(Query, {});

  return <CardList queryRef={data} />;
}
