/**
 * serve.test.ts — Integration tests for serveGraphQL
 *
 * Mirrors the schema.graphql ground truth:
 *  • link: UnitLink           → single nullable object (not an array)
 *  • rarity: CardRarity!      → non-null; defaults to "COMMON" when absent from data
 *  • LinkPilot.pilot: PilotCard! → non-null; stub returned when pilot not in dataset
 *  • CommandCard              → only exposes id / name / level / cost / series
 *  • CardFilterInput.rarity   → rarity filter (absent rarity treated as "COMMON")
 */

import { describe, it, expect } from "vitest";
import { serveGraphQL } from "./serve";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Run a query and assert there are no errors. */
async function gql(query: string, variables?: Record<string, unknown>) {
  const result = await serveGraphQL(query, variables);
  if (result.errors?.length) {
    throw new Error(
      `GraphQL errors:\n${result.errors.map((e) => e.message).join("\n")}`,
    );
  }
  return result.data as Record<string, unknown>;
}

// ─── Query.cards – kind filter ────────────────────────────────────────────────

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

// ─── Query.cards – filter combinations ───────────────────────────────────────

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

  it("filters by rarity — absent rarity defaults to COMMON", async () => {
    // All cards in the dataset have no rarity field; absent rarity → "COMMON".
    // Filtering by COMMON should return all units; filtering by RARE → 0.
    const commonData = await gql(
      `query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`,
      { f: { kind: "UNIT", rarity: "COMMON" } },
    );
    const rareData = await gql(
      `query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`,
      { f: { kind: "UNIT", rarity: "RARE" } },
    );

    const commonCount = (commonData["cards"] as { totalCount: number })
      .totalCount;
    const rareCount = (rareData["cards"] as { totalCount: number }).totalCount;

    // Every unit has rarity=COMMON (default), so common === all units
    const allData = await gql(
      `query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`,
      { f: { kind: "UNIT" } },
    );
    const allCount = (allData["cards"] as { totalCount: number }).totalCount;

    expect(commonCount).toBe(allCount);
    expect(rareCount).toBe(0);
  });

  it("returns 0 results for an impossible filter combination", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) { totalCount edges { cursor } }
      }`,
      { f: { kind: "UNIT", package: "ST01", level: [99] } },
    );

    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBe(0);
  });
});

// ─── Query.cards – cursor pagination ─────────────────────────────────────────

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

  it("second page returns next items and correct pageInfo", async () => {
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
    const firstPageIds = p1.edges.map((e) => e.node.id);

    // Page 2
    const page2 = await gql(
      `query($f: CardFilterInput!, $after: String) {
        cards(first: 3, after: $after, filter: $f) {
          edges { cursor node { ... on UnitCard { id } } }
          pageInfo { hasPreviousPage hasNextPage }
        }
      }`,
      { f: { kind: "UNIT" }, after: p1.pageInfo.endCursor },
    );

    const p2 = page2["cards"] as {
      edges: Array<{ cursor: string; node: { id: string } }>;
      pageInfo: { hasPreviousPage: boolean; hasNextPage: boolean };
    };

    const secondPageIds = p2.edges.map((e) => e.node.id);
    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }
    expect(p2.pageInfo.hasPreviousPage).toBe(true);
  });

  it("full scan: concatenating all pages yields totalCount items", async () => {
    const PAGE_SIZE = 5;
    let after: string | null = null;
    let collected = 0;
    let totalCount = 0;

    for (let page = 0; page < 300; page++) {
      const data = await gql(
        `query($f: CardFilterInput!, $after: String) {
          cards(first: ${PAGE_SIZE}, after: $after, filter: $f) {
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

// ─── UnitCard.link – single nullable UnitLink ─────────────────────────────────
//
// schema.graphql declares:  link: UnitLink   (single nullable, NOT [UnitLink!]!)

describe("UnitCard.link – single nullable UnitLink", () => {
  it("link is null or a plain object (never an array)", async () => {
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
          node: { id: string; link: { __typename: string } | null };
        }>;
      }
    ).edges;

    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      // link must be null or a plain object — never an array
      expect(Array.isArray(edge.node.link)).toBe(false);
      if (edge.node.link !== null) {
        expect(["LinkTrait", "LinkPilot"]).toContain(edge.node.link.__typename);
      }
    }
  });

  it("UnitCard without link field returns null", async () => {
    // ST01-005 (GM) has no link field in the raw JSON
    const data = await gql(
      `{ node(id: "ST01-005") { ... on UnitCard { id link { __typename } } } }`,
    );

    const node = data["node"] as { id: string; link: unknown };
    expect(node.link).toBeNull();
  });

  it("LinkTrait link exposes the trait field", async () => {
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

    const traitLinks = (
      data["cards"] as {
        edges: Array<{
          node: { link: { __typename: string; trait?: string } | null };
        }>;
      }
    ).edges
      .map((e) => e.node.link)
      .filter(
        (l): l is { __typename: "LinkTrait"; trait: string } =>
          l !== null && l.__typename === "LinkTrait",
      );

    expect(traitLinks.length).toBeGreaterThan(0);
    for (const l of traitLinks) {
      expect(l.trait).toBeTruthy();
    }
  });
});

// ─── LinkPilot.pilot — pilotName → PilotCard lookup ──────────────────────────

describe("LinkPilot.pilot – pilotName → PilotCard lookup", () => {
  it("pilot is resolved to a full PilotCard", async () => {
    // ST01-001 (Gundam) → LinkPilot → pilot is "아무로 레이" = ST01-010
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
      link: {
        pilot: { id: string; name: string; AP: number; HP: number };
      } | null;
    };

    expect(node.link).not.toBeNull();
    // pilot is non-null (PilotCard!) — always present (stub if not in dataset)
    expect(node.link!.pilot).toBeDefined();
    expect(node.link!.pilot.id).toBe("ST01-010");
    expect(typeof node.link!.pilot.AP).toBe("number");
    expect(typeof node.link!.pilot.HP).toBe("number");
  });

  it("pilot is never null even when the pilot card is not in the dataset (stub returned)", async () => {
    // Query any 20 LinkPilot units; every pilot must be non-null
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 20, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                link {
                  __typename
                  ... on LinkPilot { pilot { id name } }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: "UNIT" } },
    );

    const pilotLinks = (
      data["cards"] as {
        edges: Array<{
          node: {
            link: {
              __typename: string;
              pilot?: { id: string; name: string };
            } | null;
          };
        }>;
      }
    ).edges
      .map((e) => e.node.link)
      .filter(
        (
          l,
        ): l is {
          __typename: "LinkPilot";
          pilot: { id: string; name: string };
        } => l !== null && l.__typename === "LinkPilot",
      );

    for (const l of pilotLinks) {
      expect(l.pilot).toBeDefined();
      expect(typeof l.pilot.name).toBe("string");
      expect(l.pilot.name.length).toBeGreaterThan(0);
    }
  });
});

// ─── rarity field — defaults to "COMMON" ─────────────────────────────────────

describe("rarity: CardRarity! – defaults to COMMON when absent from data", () => {
  it("UnitCard.rarity is 'COMMON' (data has no rarity field)", async () => {
    const data = await gql(
      `{ node(id: "ST01-001") { ... on UnitCard { id rarity } } }`,
    );
    const node = data["node"] as { id: string; rarity: string };
    expect(node.rarity).toBe("COMMON");
  });

  it("PilotCard.rarity is 'COMMON'", async () => {
    const data = await gql(
      `{ node(id: "ST01-010") { ... on PilotCard { id rarity } } }`,
    );
    const node = data["node"] as { id: string; rarity: string };
    expect(node.rarity).toBe("COMMON");
  });

  it("BaseCard.rarity is 'COMMON'", async () => {
    const data = await gql(
      `{ node(id: "ST01-015") { ... on BaseCard { id rarity } } }`,
    );
    const node = data["node"] as { id: string; rarity: string };
    expect(node.rarity).toBe("COMMON");
  });
});

// ─── AP / HP null coercion → 0 ───────────────────────────────────────────────

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
          ... on UnitCard { name AP HP level cost color series keywords zone rarity }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      name: string;
      AP: number;
      HP: number;
      rarity: string;
    };

    expect(node.id).toBe("ST01-001");
    expect(node.name).toBe("Gundam");
    expect(node.AP).toBe(3);
    expect(node.HP).toBe(4);
    expect(node.rarity).toBe("COMMON");
  });

  it("returns null for an unknown id", async () => {
    const data = await gql(`{ node(id: "DOES-NOT-EXIST") { id } }`);
    expect(data["node"]).toBeNull();
  });

  it("returns a PilotCard by id", async () => {
    const data = await gql(
      `{ node(id: "ST01-010") {
          id
          ... on PilotCard { name AP HP rarity }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      name: string;
      rarity: string;
    };
    expect(node.id).toBe("ST01-010");
    expect(node.name).toBeTruthy();
    expect(node.rarity).toBe("COMMON");
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
