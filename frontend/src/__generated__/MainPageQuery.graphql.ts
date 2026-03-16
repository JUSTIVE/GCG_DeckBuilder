/**
 * @generated SignedSource<<f2f1ca8935dfcca178854617523bae4f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type MainPageQuery$variables = Record<PropertyKey, never>;
export type MainPageQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"CardListFragment">;
};
export type MainPageQuery = {
  response: MainPageQuery$data;
  variables: MainPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "kind": "Literal",
    "name": "filter",
    "value": {
      "kind": "UNIT"
    }
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "MainPageQuery",
    "selections": [
      {
        "args": (v0/*: any*/),
        "kind": "FragmentSpread",
        "name": "CardListFragment"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "MainPageQuery",
    "selections": [
      {
        "alias": null,
        "args": (v0/*: any*/),
        "concreteType": "CardConnection",
        "kind": "LinkedField",
        "name": "cards",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "CardEdges",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "cursor",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": null,
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "__typename",
                    "storageKey": null
                  },
                  {
                    "kind": "TypeDiscriminator",
                    "abstractKey": "__isCard"
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": [
                      (v1/*: any*/),
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
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": [
                      (v1/*: any*/)
                    ],
                    "type": "Node",
                    "abstractKey": "__isNode"
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "PageInfo",
            "kind": "LinkedField",
            "name": "pageInfo",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "endCursor",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "hasNextPage",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": "cards(filter:{\"kind\":\"UNIT\"})"
      },
      {
        "alias": null,
        "args": (v0/*: any*/),
        "filters": [
          "filter"
        ],
        "handle": "connection",
        "key": "CardListFragment_cards",
        "kind": "LinkedHandle",
        "name": "cards"
      }
    ]
  },
  "params": {
    "cacheID": "12f4581dc61bda21968ea00b3ef18fc6",
    "id": null,
    "metadata": {},
    "name": "MainPageQuery",
    "operationKind": "query",
    "text": "query MainPageQuery {\n  ...CardListFragment_3GkafP\n}\n\nfragment CardFragment on Card {\n  __isCard: __typename\n  __typename\n  ... on UnitCard {\n    ...UnitCardFragment\n  }\n}\n\nfragment CardListFragment_3GkafP on Query {\n  cards(filter: {kind: UNIT}) {\n    edges {\n      cursor\n      node {\n        __typename\n        ...CardFragment\n        ... on Node {\n          __isNode: __typename\n          id\n        }\n      }\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}\n\nfragment UnitCardFragment on UnitCard {\n  id\n  name\n  AP\n  HP\n}\n"
  }
};
})();

(node as any).hash = "c17a0a9e3721de6b3254355b7ac32beb";

export default node;
