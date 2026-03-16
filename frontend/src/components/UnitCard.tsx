import { graphql } from "relay-runtime";
import type { UnitCardFragment$key } from "@/__generated__/UnitCardFragment.graphql";
import { useFragment } from "react-relay";

const Fragment = graphql`
  fragment UnitCardFragment on UnitCard {
    id
    name
    AP
    HP
  }
`;

type Props = {
  unitCardRef: UnitCardFragment$key;
};

export function UnitCard({ unitCardRef }: Props) {
  const unitCard = useFragment(Fragment, unitCardRef);
  return (
    <div className="flex flex-col ">
      <div>{unitCard.name}</div>
      <div>{unitCard.AP}</div>
      <div>{unitCard.HP}</div>
    </div>
  );
}
