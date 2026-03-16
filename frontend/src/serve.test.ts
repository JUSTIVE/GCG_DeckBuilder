/**
 * serve.test.ts — Integration tests for serveGraphQL
 *
 * Covers:
 *  • cards query: kind filter, level/cost/package/keyword/zone/query filters
 *  • Relay cursor pagination (first / after)
 *  • UnitCard.link: single object in JSON → [UnitLink!]! in GraphQL
 *  • LinkPilot.pilot: pilotName string → PilotCard lookup
 *  • BaseCard.AP / HP: null in JSON → 0 in GraphQL (Int! coercion)
 *  • ResourceCard __typename → Resource GraphQL type
 *  • node(id) lookup
 */

import { describe, it, expect } from "vitest";
import { serveGraphQL } from "./serve";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Run a query and assert there are no errors. */
async function gql(
  query: string,
  variables?: Record<string, unknown>,
) {
  const result = await serveGraphQL(query, variables);
  if (result.errors?.length) {
    throw new Error(
      `GraphQL errors:\n${result.errors.map((e) => e.message).join("\n")}`,
    );
  }
  return result.data as Record<string, unknown>;
}

// ─── Query.cards ──────────────────────────────────────────────────────────────

describe("Query.cards – kind filter", () => {
  it("returns only UnitCards when kind=UNIT", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges {
            node {
              __typename
              ... on UnitCard { id name AP HP }
            }
          }
        }
      }`,
      { f: { kind: "UNIT" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string; id: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("UnitCard");
    }
  });

  it("returns only PilotCards when kind=PILOT", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename ... on PilotCard { id name AP HP } } }
        }
      }`,
      { f: { kind: "PILOT" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("PilotCard");
    }
  });

  it("resolves ResourceCard __typename as 'Resource'", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename ... on Resource { id name } } }
        }
      }`,
      { f: { kind: "RESOURCE" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string; id: string; name: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("Resource");
    }
    // Known resource card
    const gundam = conn.edges.find((e) => e.node.id === "T-001");
    expect(gundam?.node.name).toBe("Gundam");
  });

  it("returns BaseCards when kind=BASE", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename ... on BaseCard { id name AP HP } } }
        }
      }`,
      { f: { kind: "BASE" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("BaseCard");
    }
  });

  it("returns CommandCards when kind=COMMAND", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename ... on CommandCard { id name } } }
        }
      }`,
      { f: { kind: "COMMAND" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("CommandCard");
    }
  });
});

// ─── Filter combinations ──────────────────────────────────────────────────────

describe("Query.cards – filter combinations", () => {
  it("filters by package", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id package } } }
        }
      }`,
      { f: { kind: "UNIT", package: "ST01" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { id: string; package: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.package).toBe("ST01");
    }
  });

  it("filters by level", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id level } } }
        }
      }`,
      { f: { kind: "UNIT", level: [4] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { level: number } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.level).toBe(4);
    }
  });

  it("filters by cost", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id cost } } }
        }
      }`,
      { f: { kind: "UNIT", cost: [1, 2] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { cost: number } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect([1, 2]).toContain(edge.node.cost);
    }
  });

  it("filters by keyword", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id keywords } } }
        }
      }`,
      { f: { kind: "UNIT", keyword: ["BLOCKER"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { keywords: string[] } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.keywords).toContain("BLOCKER");
    }
  });

  it("filters by zone (SPACE)", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id zone } } }
        }
      }`,
      { f: { kind: "UNIT", zone: ["SPACE"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { zone: string[] } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.zone).toContain("SPACE");
    }
  });

  it("full-text searches name and description", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on UnitCard { id name } } }
        }
      }`,
      { f: { kind: "UNIT", query: "Gundam" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { name: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.name.toLowerCase()).toContain("gundam");
    }
  });

  it("returns 0 results for an impossible filter combination", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) { totalCount edges { cursor } }
      }`,
      // ST01 only has BLUE and WHITE cards; RED + ST01 → no results
      { f: { kind: "UNIT", package: "ST01", level: [99] } },
    );

    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBe(0);
  });
});

// ─── Cursor pagination ────────────────────────────────────────────────────────

describe("Query.cards – cursor pagination", () => {
  it("first:2 returns 2 edges and a valid endCursor", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 2, filter: $f) {
          totalCount
          edges { cursor node { ... on UnitCard { id } } }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }`,
      { f: { kind: "UNIT" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ cursor: string; node: { id: string } }>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
      };
    };

    expect(conn.edges).toHaveLength(2);
    expect(conn.pageInfo.hasPreviousPage).toBe(false);
    expect(conn.pageInfo.hasNextPage).toBe(true);
    expect(conn.pageInfo.endCursor).toBeTruthy();
    expect(conn.pageInfo.startCursor).toBe(conn.edges[0]!.cursor);
    expect(conn.pageInfo.endCursor).toBe(conn.edges[1]!.cursor);
  });

  it("second page (after cursor) returns next items and correct pageInfo", async () => {
    // Page 1
    const page1 = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 3, filter: $f) {
          edges { cursor node { ... on UnitCard { id } } }
          pageInfo { endCursor }
        }
      }`,
      { f: { kind: "UNIT" } },
    );

    const p1 = page1["cards"] as {
      edges: Array<{ cursor: string; node: { id: string } }>;
      pageInfo: { endCursor: string };
    };
    const afterCursor = p1.pageInfo.endCursor;
    const firstPageIds = p1.edges.map((e) => e.node.id);

    // Page 2
    const page2 = await gql(
      `query($f: CardFilterInput!, $after: String) {
        cards(first: 3, after: $after, filter: $f) {
          edges { cursor node { ... on UnitCard { id } } }
          pageInfo { hasPreviousPage hasNextPage }
        }
      }`,
      { f: { kind: "UNIT" }, after: afterCursor },
    );

    const p2 = page2["cards"] as {
      edges: Array<{ cursor: string; node: { id: string } }>;
      pageInfo: { hasPreviousPage: boolean; hasNextPage: boolean };
    };

    // No overlap between pages
    const secondPageIds = p2.edges.map((e) => e.node.id);
    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }
    expect(p2.pageInfo.hasPreviousPage).toBe(true);
  });

  it("full scan: concatenating all pages yields totalCount items", async () => {
    const UNIT_PAGE_SIZE = 5;
    let after: string | null = null;
    let collected = 0;
    let totalCount = 0;

    for (let page = 0; page < 200; page++) {
      const data = await gql(
        `query($f: CardFilterInput!, $after: String) {
          cards(first: ${UNIT_PAGE_SIZE}, after: $after, filter: $f) {
            totalCount
            edges { cursor node { ... on PilotCard { id } } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { f: { kind: "PILOT" }, after },
      );

      const conn = data["cards"] as {
        totalCount: number;
        edges: Array<{ cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };

      if (page === 0) totalCount = conn.totalCount;
      collected += conn.edges.length;

      if (!conn.pageInfo.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }

    expect(collected).toBe(totalCount);
  });
});

// ─── UnitCard.link field resolution ──────────────────────────────────────────

describe("UnitCard.link – single object → [UnitLink!]!", () => {
  it("link is always an array", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 50, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                id
                link {
                  __typename
                  ... on LinkTrait { trait }
                  ... on LinkPilot  { pilot { id name } }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: "UNIT", package: "ST01" } },
    );

    const edges = (
      data["cards"] as {
        edges: Array<{
          node: { id: string; link: Array<{ __typename: string }> };
        }>;
      }
    ).edges;

    for (const edge of edges) {
      expect(Array.isArray(edge.node.link)).toBe(true);
    }
  });

  it("UnitCards without a link in JSON return an empty array", async () => {
    // ST01-005 (GM) has no link field in raw JSON
    const data = await gql(
      `{ node(id: "ST01-005") { ... on UnitCard { id link { __typename } } } }`,
    );

    const node = data["node"] as { id: string; link: unknown[] };
    expect(Array.isArray(node.link)).toBe(true);
    expect(node.link).toHaveLength(0);
  });

  it("LinkTrait entries expose the trait field", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 100, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                id
                link {
                  __typename
                  ... on LinkTrait { trait }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: "UNIT" } },
    );

    const edges = (
      data["cards"] as {
        edges: Array<{
          node: { link: Array<{ __typename: string; trait?: string }> };
        }>;
      }
    ).edges;

    const traitLinks = edges
      .flatMap((e) => e.node.link)
      .filter((l) => l.__typename === "LinkTrait");

    expect(traitLinks.length).toBeGreaterThan(0);
    for (const l of traitLinks) {
      expect(l.trait).toBeTruthy();
    }
  });
});

// ─── LinkPilot.pilot resolution ───────────────────────────────────────────────

describe("LinkPilot.pilot – pilotName → PilotCard lookup", () => {
  it("pilot is resolved to a full PilotCard", async () => {
    // ST01-001 (Gundam) links to pilot "아무로 레이" whose id is ST01-010
    const data = await gql(
      `{ node(id: "ST01-001") {
          ... on UnitCard {
            link {
              ... on LinkPilot {
                pilot { id name AP HP }
              }
            }
          }
        }
      }`,
    );

    const node = data["node"] as {
      link: Array<{ pilot?: { id: string; name: string; AP: number; HP: number } }>;
    };

    const pilotLink = node.link[0];
    expect(pilotLink).toBeDefined();
    expect(pilotLink!.pilot).toBeDefined();
    expect(pilotLink!.pilot!.id).toBe("ST01-010");
    expect(typeof pilotLink!.pilot!.AP).toBe("number");
    expect(typeof pilotLink!.pilot!.HP).toBe("number");
  });
});

// ─── AP / HP null coercion ────────────────────────────────────────────────────

describe("BaseCard.AP null coercion → 0", () => {
  it("AP is never null even when JSON has null", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          edges {
            node {
              ... on BaseCard { id name AP HP }
            }
          }
        }
      }`,
      { f: { kind: "BASE" } },
    );

    const edges = (
      data["cards"] as {
        edges: Array<{ node: { id: string; AP: number; HP: number } }>;
      }
    ).edges;

    for (const edge of edges) {
      expect(typeof edge.node.AP).toBe("number");
      expect(typeof edge.node.HP).toBe("number");
    }
  });

  // ST01-015 (White Base) has "AP": null in mapped.json
  it("White Base AP is 0 after coercion", async () => {
    const data = await gql(
      `{ node(id: "ST01-015") { ... on BaseCard { id name AP HP } } }`,
    );
    const node = data["node"] as { id: string; AP: number; HP: number };
    expect(node.id).toBe("ST01-015");
    expect(node.AP).toBe(0);
    expect(node.HP).toBeGreaterThan(0);
  });
});

// ─── Query.node ───────────────────────────────────────────────────────────────

describe("Query.node", () => {
  it("returns a UnitCard by id", async () => {
    const data = await gql(
      `{ node(id: "ST01-001") {
          id
          ... on UnitCard { name AP HP level cost color series keywords zone }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      name: string;
      AP: number;
      HP: number;
    };

    expect(node.id).toBe("ST01-001");
    expect(node.name).toBe("Gundam");
    expect(node.AP).toBe(3);
    expect(node.HP).toBe(4);
  });

  it("returns null for an unknown id", async () => {
    const data = await gql(`{ node(id: "DOES-NOT-EXIST") { id } }`);
    expect(data["node"]).toBeNull();
  });

  it("returns a PilotCard by id", async () => {
    const data = await gql(
      `{ node(id: "ST01-010") {
          id
          ... on PilotCard { name AP HP }
        }
      }`,
    );

    const node = data["node"] as { id: string; name: string };
    expect(node.id).toBe("ST01-010");
    expect(node.name).toBeTruthy();
  });

  it("returns a Resource by id", async () => {
    const data = await gql(
      `{ node(id: "T-001") {
          id
          ... on Resource { name }
        }
      }`,
    );

    const node = data["node"] as { id: string; name: string };
    expect(node.id).toBe("T-001");
    expect(node.name).toBe("Gundam");
  });
});
