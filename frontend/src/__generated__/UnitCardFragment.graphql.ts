/**
 * @generated SignedSource<<cefeca680ed0ffd99530e28d5803e4fc>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type UnitCardFragment$data = {
  readonly AP: number;
  readonly HP: number;
  readonly id: string;
  readonly name: string;
  readonly " $fragmentType": "UnitCardFragment";
};
export type UnitCardFragment$key = {
  readonly " $data"?: UnitCardFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"UnitCardFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "UnitCardFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "id",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "name",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "AP",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "HP",
      "storageKey": null
    }
  ],
  "type": "UnitCard",
  "abstractKey": null
};

(node as any).hash = "97b4c62d4436d47f87bc0b68bc0b0bf9";

export default node;
