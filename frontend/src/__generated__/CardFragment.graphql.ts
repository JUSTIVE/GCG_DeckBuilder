/**
 * @generated SignedSource<<0e4681410459177c909301352e3238fb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type CardFragment$data = {
  readonly __typename: "UnitCard";
  readonly " $fragmentSpreads": FragmentRefs<"UnitCardFragment">;
  readonly " $fragmentType": "CardFragment";
} | {
  // This will never be '%other', but we need some
  // value in case none of the concrete values match.
  readonly __typename: "%other";
  readonly " $fragmentType": "CardFragment";
};
export type CardFragment$key = {
  readonly " $data"?: CardFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"CardFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "CardFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "__typename",
      "storageKey": null
    },
    {
      "kind": "InlineFragment",
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "UnitCardFragment"
        }
      ],
      "type": "UnitCard",
      "abstractKey": null
    }
  ],
  "type": "Card",
  "abstractKey": "__isCard"
};

(node as any).hash = "a4df40933a16e5f960df6fd901edbb14";

export default node;
