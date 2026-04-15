/**
 * serve.test.ts — Integration tests for serveGraphQL
 *
 * Mirrors the schema.graphql ground truth:
 *  • PilotCard.pilot: Pilot!  → constructed from flat { name, AP, HP } raw fields
 *  • LinkPilot.pilot: Pilot!  → looked up by pilotName; Pilot has no `id` field
 *  • CommandCard.pilot: Pilot → nullable; already nested in raw data
 *  • links: [UnitLink!]!      → non-null array; raw "link" (single obj or absent) wrapped in []
 *  • rarity: CardRarity!      → non-null; defaults to "COMMON" when absent from data
 *  • CardFilterInput.rarity   → rarity filter (absent rarity treated as "COMMON")
 *  • kind=RESOURCE            → 0 results (ResourceCards have no package field and
 *                               are not included in combined.json)
 */

import { describe, it, expect } from "vitest";
import { serveGraphQL } from "./serve";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Run a query and assert there are no errors. */
async function gql(query: string, variables?: Record<string, unknown>) {
  const result = await serveGraphQL(query, variables);
  if (result.errors?.length) {
    throw new Error(`GraphQL errors:\n${result.errors.map((e) => e.message).join("\n")}`);
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
              ... on UnitCard { id name { en ko } AP HP }
            }
          }
        }
      }`,
      { f: { kind: ["UNIT"] } },
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
          edges { node { __typename ... on PilotCard { id pilot { name { en ko } AP HP } } } }
        }
      }`,
      { f: { kind: ["PILOT"] } },
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

  it("kind=RESOURCE returns ResourceCards", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename } }
        }
      }`,
      { f: { kind: ["RESOURCE"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.__typename).toBe("Resource");
    }
  });

  it("returns BaseCards when kind=BASE", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { __typename ... on BaseCard { id name { en ko } AP HP } } }
        }
      }`,
      { f: { kind: ["BASE"] } },
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
          edges { node { __typename ... on CommandCard { id name { en ko } } } }
        }
      }`,
      { f: { kind: ["COMMAND"] } },
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

  it("returns multiple card kinds when kind array has multiple values (OR condition)", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 100, filter: $f) {
          totalCount
          edges {
            node {
              __typename
              ... on UnitCard { id }
              ... on PilotCard { id }
            }
          }
        }
      }`,
      { f: { kind: ["UNIT", "PILOT"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);

    const typenames = new Set(conn.edges.map((e) => e.node.__typename));
    expect(typenames.has("UnitCard")).toBe(true);
    expect(typenames.has("PilotCard")).toBe(true);
    expect(typenames.has("BaseCard")).toBe(false);
    expect(typenames.has("CommandCard")).toBe(false);
  });

  it("returns all playable card kinds when kind=[UNIT, PILOT, BASE, COMMAND]", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 200, filter: $f) {
          totalCount
          edges { node { __typename } }
        }
      }`,
      { f: { kind: ["UNIT", "PILOT", "BASE", "COMMAND"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { __typename: string } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);

    const typenames = new Set(conn.edges.map((e) => e.node.__typename));
    expect(typenames.has("UnitCard")).toBe(true);
    expect(typenames.has("PilotCard")).toBe(true);
    expect(typenames.has("BaseCard")).toBe(true);
    expect(typenames.has("CommandCard")).toBe(true);
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
      { f: { kind: ["UNIT"], package: "ST01" } },
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
      { f: { kind: ["UNIT"], level: [4] } },
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
      { f: { kind: ["UNIT"], cost: [1, 2] } },
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
          edges { node { ... on UnitCard { id keywords { value } } } }
        }
      }`,
      { f: { kind: "UNIT", keyword: ["BLOCKER"] } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { keywords: Array<{ value: string }> } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.keywords.map((k) => k.value)).toContain("BLOCKER");
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
      { f: { kind: ["UNIT"], zone: ["SPACE"] } },
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
          edges { node { ... on UnitCard { id name { en ko } } } }
        }
      }`,
      { f: { kind: ["UNIT"], query: "건담" } },
    );

    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { name: { en: string; ko: string } } }>;
    };

    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      expect(edge.node.name.ko).toContain("건담");
    }
  });

  it("filters by rarity — absent rarity defaults to COMMON", async () => {
    const commonData = await gql(
      `query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`,
      { f: { kind: ["UNIT"], rarity: "COMMON" } },
    );
    const rareData = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["UNIT"], rarity: "RARE" },
    });
    const allData = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["UNIT"] },
    });

    const commonCount = (commonData["cards"] as { totalCount: number }).totalCount;
    const rareCount = (rareData["cards"] as { totalCount: number }).totalCount;
    const allCount = (allData["cards"] as { totalCount: number }).totalCount;

    // Cards now have real rarities — COMMON and RARE should each be a strict subset
    expect(commonCount).toBeGreaterThan(0);
    expect(rareCount).toBeGreaterThan(0);
    expect(commonCount + rareCount).toBeLessThanOrEqual(allCount);
  });

  it("returns 0 results for an impossible filter combination", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) { totalCount edges { cursor } }
      }`,
      { f: { kind: ["UNIT"], package: "ST01", level: [999] } },
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
      { f: { kind: ["UNIT"] } },
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
      { f: { kind: ["UNIT"] } },
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
      { f: { kind: ["UNIT"] }, after: p1.pageInfo.endCursor },
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

// ─── UnitCard.links – [UnitLink!]! ────────────────────────────────────────────
//
// schema.graphql declares:  links: [UnitLink!]!  (non-null array)
// Raw data stores a single object under "link" (or omits the field entirely).
// serve.ts wraps it: absent/null → [], present → [rawLink].

describe("UnitCard.links – [UnitLink!]!", () => {
  it("links is always an array (never null)", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 50, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                id
                links {
                  __typename
                  ... on LinkTrait { trait }
                  ... on LinkPilot  { pilot { name { en ko } } }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: ["UNIT"], package: "ST01" } },
    );

    const edges = (
      data["cards"] as {
        edges: Array<{
          node: { id: string; links: Array<{ __typename: string }> };
        }>;
      }
    ).edges;

    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      // links must always be an array — never null
      expect(Array.isArray(edge.node.links)).toBe(true);
      for (const l of edge.node.links) {
        expect(["LinkTrait", "LinkPilot"]).toContain(l.__typename);
      }
    }
  });

  it("UnitCard without link in raw data returns empty array []", async () => {
    // ST01-005 (GM) has no link field in the raw JSON → links: []
    const data = await gql(
      `{ node(id: "ST01-005") { ... on UnitCard { id links { __typename } } } }`,
    );

    const node = data["node"] as { id: string; links: unknown[] };
    expect(Array.isArray(node.links)).toBe(true);
    expect(node.links).toHaveLength(0);
  });

  it("UnitCard with a link returns array of length 1", async () => {
    // ST01-001 (Gundam) has a LinkPilot → links: [{ __typename: "LinkPilot", ... }]
    const data = await gql(
      `{ node(id: "ST01-001") {
          ... on UnitCard {
            id
            links {
              __typename
              ... on LinkPilot { pilot { name { en ko } AP HP } }
            }
          }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      links: Array<{
        __typename: string;
        pilot?: { name: string; AP: number; HP: number };
      }>;
    };
    expect(Array.isArray(node.links)).toBe(true);
    expect(node.links).toHaveLength(1);
    expect(node.links[0].__typename).toBe("LinkPilot");
  });

  it("LinkTrait link exposes the trait field", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 100, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                id
                links {
                  __typename
                  ... on LinkTrait { trait }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: ["UNIT"] } },
    );

    const traitLinks = (
      data["cards"] as {
        edges: Array<{
          node: { links: Array<{ __typename: string; trait?: string }> };
        }>;
      }
    ).edges
      .flatMap((e) => e.node.links)
      .filter((l): l is { __typename: "LinkTrait"; trait: string } => l.__typename === "LinkTrait");

    expect(traitLinks.length).toBeGreaterThan(0);
    for (const l of traitLinks) {
      expect(l.trait).toBeTruthy();
    }
  });
});

// ─── LinkPilot.pilot — pilotName → PilotCard lookup ──────────────────────────

describe("LinkPilot.pilot – pilotName → Pilot lookup", () => {
  it("pilot is resolved to a Pilot object with name/AP/HP", async () => {
    // ST01-001 (Gundam) → links[0] is LinkPilot → pilotName "아무로 레이"
    // Note: Pilot is a value type, not a Node — it has no `id` field.
    const data = await gql(
      `{ node(id: "ST01-001") {
          ... on UnitCard {
            links {
              ... on LinkPilot {
                pilot { name { en ko } AP HP }
              }
            }
          }
        }
      }`,
    );

    const node = data["node"] as {
      links: Array<{
        pilot?: { name: { en: string; ko: string }; AP: number; HP: number };
      }>;
    };

    expect(node.links).toHaveLength(1);
    const pilot = node.links[0].pilot;
    expect(pilot).toBeDefined();
    expect(pilot!.name.ko).toBe("아무로 레이");
    expect(typeof pilot!.AP).toBe("number");
    expect(typeof pilot!.HP).toBe("number");
  });

  it("pilot is never null even when the pilot card is not in the dataset (stub returned)", async () => {
    // Query any 20 UnitCards; for every LinkPilot entry pilot must be non-null
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 20, filter: $f) {
          edges {
            node {
              ... on UnitCard {
                links {
                  __typename
                  ... on LinkPilot { pilot { name { en ko } AP HP } }
                }
              }
            }
          }
        }
      }`,
      { f: { kind: ["UNIT"] } },
    );

    const pilotLinks = (
      data["cards"] as {
        edges: Array<{
          node: {
            links: Array<{
              __typename: string;
              pilot?: { name: { en: string; ko: string }; AP: number; HP: number };
            }>;
          };
        }>;
      }
    ).edges
      .flatMap((e) => e.node.links)
      .filter(
        (
          l,
        ): l is {
          __typename: "LinkPilot";
          pilot: { name: { en: string; ko: string }; AP: number; HP: number };
        } => l.__typename === "LinkPilot",
      );

    for (const l of pilotLinks) {
      expect(l.pilot).toBeDefined();
      expect(typeof l.pilot.name).toBe("object");
      expect(l.pilot.name.ko).toBeTruthy();
      expect(typeof l.pilot.AP).toBe("number");
      expect(typeof l.pilot.HP).toBe("number");
    }
  });
});

// ─── linkablePilots / linkableUnits ──────────────────────────────────────────

describe("UnitCard.linkablePilots – matches both LinkPilot (name) and LinkTrait", () => {
  it("LinkPilot unit returns pilots whose name matches", async () => {
    // ST01-001 (Gundam) → LinkPilot "아무로 레이"
    const data = await gql(
      `{ node(id: "ST01-001") {
          ... on UnitCard { linkablePilots { id pilot { name { ko } } } }
        }
      }`,
    );
    const node = data["node"] as {
      linkablePilots: Array<{ id: string; pilot: { name: { ko: string } } }>;
    };
    expect(node.linkablePilots.length).toBeGreaterThan(0);
    const ids = node.linkablePilots.map((p) => p.id);
    expect(ids).toContain("ST01-010"); // Amuro Ray
  });

  it("LinkTrait unit returns pilots whose trait matches (regression: G-스카이 Ez)", async () => {
    // GD01-014 (G-Sky Easy) → LinkTrait "WHITE_BASE_TEAM"
    // Prior to the fix this returned [] because the resolver only handled LinkPilot.
    const data = await gql(
      `{ node(id: "GD01-014") {
          ... on UnitCard { linkablePilots { id pilot { name { ko } } } }
        }
      }`,
    );
    const node = data["node"] as {
      linkablePilots: Array<{ id: string; pilot: { name: { ko: string } } }>;
    };
    expect(node.linkablePilots.length).toBeGreaterThan(0);
    const ids = node.linkablePilots.map((p) => p.id);
    // Both WHITE_BASE_TEAM-trait pilots should be linkable.
    expect(ids).toEqual(expect.arrayContaining(["ST01-010", "GD01-087"]));
  });
});

describe("PilotCard.linkableUnits – matches both LinkPilot (name) and LinkTrait", () => {
  it("Pilot returns trait-linked units via the pilot's traits (regression)", async () => {
    // ST01-010 (Amuro Ray) has trait WHITE_BASE_TEAM, so trait-linked units
    // like GD01-014 (G-Sky Easy) must appear in linkableUnits.
    const data = await gql(
      `{ node(id: "ST01-010") {
          ... on PilotCard { linkableUnits { id } }
        }
      }`,
    );
    const node = data["node"] as { linkableUnits: Array<{ id: string }> };
    const ids = node.linkableUnits.map((u) => u.id);
    expect(ids).toContain("GD01-014");
    // The name-match path still works: Gundam (ST01-001) links to Amuro Ray.
    expect(ids).toContain("ST01-001");
  });
});

// ─── PilotCard.pilot field ────────────────────────────────────────────────────

describe("PilotCard.pilot – flat raw fields → Pilot object", () => {
  it("PilotCard.pilot contains name/AP/HP constructed from flat raw data", async () => {
    // Raw PilotCard stores { name, AP, HP } as top-level fields.
    // The schema exposes them through pilot: Pilot! (no direct name/AP/HP on PilotCard).
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 5, filter: $f) {
          edges {
            node {
              ... on PilotCard {
                id
                pilot { name { en ko } AP HP }
                rarity
              }
            }
          }
        }
      }`,
      { f: { kind: ["PILOT"] } },
    );

    const edges = (
      data["cards"] as {
        edges: Array<{
          node: {
            id: string;
            pilot: { name: { en: string; ko: string }; AP: number; HP: number };
            rarity: string;
          };
        }>;
      }
    ).edges;

    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(typeof edge.node.pilot.name).toBe("object");
      expect(edge.node.pilot.name.ko).toBeTruthy();
      expect(typeof edge.node.pilot.AP).toBe("number");
      expect(typeof edge.node.pilot.HP).toBe("number");
    }
  });
});

// ─── CommandCard.pilot field ──────────────────────────────────────────────────

describe("CommandCard.pilot – nullable Pilot", () => {
  it("some CommandCards have a pilot, others have null", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 20, filter: $f) {
          totalCount
          edges {
            node {
              ... on CommandCard {
                id name { en ko }
                pilot { name { en ko } AP HP }
              }
            }
          }
        }
      }`,
      { f: { kind: ["COMMAND"] } },
    );

    const edges = (
      data["cards"] as {
        totalCount: number;
        edges: Array<{
          node: {
            id: string;
            name: { en: string; ko: string };
            pilot: { name: { en: string; ko: string }; AP: number; HP: number } | null;
          };
        }>;
      }
    ).edges;

    expect(edges.length).toBeGreaterThan(0);
    // pilot is nullable — some will be null, some will be an object
    for (const edge of edges) {
      if (edge.node.pilot !== null) {
        expect(typeof edge.node.pilot.name).toBe("object");
        expect(typeof edge.node.pilot.AP).toBe("number");
        expect(typeof edge.node.pilot.HP).toBe("number");
      }
    }
  });
});

// ─── rarity field — defaults to "COMMON" ─────────────────────────────────────

describe("rarity: CardRarity! – defaults to COMMON when absent from data", () => {
  it("UnitCard.rarity is 'COMMON'", async () => {
    const data = await gql(`{ node(id: "ST01-002") { ... on UnitCard { id rarity } } }`);
    const node = data["node"] as { id: string; rarity: string };
    expect(node.rarity).toBe("COMMON");
  });

  it("PilotCard.rarity is 'COMMON'", async () => {
    const data = await gql(`{ node(id: "ST01-010") { ... on PilotCard { id rarity } } }`);
    const node = data["node"] as { id: string; rarity: string };
    expect(node.rarity).toBe("COMMON");
  });

  it("BaseCard.rarity is 'COMMON'", async () => {
    const data = await gql(`{ node(id: "ST01-015") { ... on BaseCard { id rarity } } }`);
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
              ... on BaseCard { id name { en ko } AP HP }
            }
          }
        }
      }`,
      { f: { kind: ["BASE"] } },
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
      `{ node(id: "ST01-015") { ... on BaseCard { id name { en ko } AP HP } } }`,
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
          ... on UnitCard { name { en ko } AP HP level cost color series keywords zone rarity }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      name: { en: string; ko: string };
      AP: number;
      HP: number;
      rarity: string;
    };

    expect(node.id).toBe("ST01-001");
    expect(node.name.ko).toBe("건담");
    expect(node.AP).toBe(3);
    expect(node.HP).toBe(4);
    expect(node.rarity).toBe("LEGENDARY_RARE");
  });

  it("returns null for an unknown id", async () => {
    const data = await gql(`{ node(id: "DOES-NOT-EXIST") { id } }`);
    expect(data["node"]).toBeNull();
  });

  it("returns a PilotCard by id", async () => {
    // PilotCard.pilot: Pilot! — name/AP/HP are nested, not direct fields
    const data = await gql(
      `{ node(id: "ST01-010") {
          id
          ... on PilotCard { pilot { name { en ko } AP HP } rarity }
        }
      }`,
    );

    const node = data["node"] as {
      id: string;
      pilot: { name: { en: string; ko: string }; AP: number; HP: number };
      rarity: string;
    };
    expect(node.id).toBe("ST01-010");
    expect(node.pilot.name.ko).toBeTruthy();
    expect(typeof node.pilot.AP).toBe("number");
    expect(typeof node.pilot.HP).toBe("number");
    expect(node.rarity).toBe("COMMON");
  });

  it("node(id) returns a ResourceCard by id", async () => {
    const data = await gql(
      `{ node(id: "T-001") { id ... on Resource { name { en ko } rarity } } }`,
    );
    const node = data["node"] as { id: string; name: { en: string; ko: string }; rarity: string };
    expect(node.id).toBe("T-001");
    expect(typeof node.name).toBe("object");
  });
});

// ─── Regression – LocalizedString name field ──────────────────────────────────

describe("Regression – LocalizedString name field", () => {
  it("UnitCard name is LocalizedString with en and ko", async () => {
    const data = await gql(`{ node(id: "ST01-001") { ... on UnitCard { name { en ko } } } }`);
    const node = data["node"] as { name: { en: string; ko: string } };
    expect(node.name.en).toBe("Gundam");
    expect(node.name.ko).toBe("건담");
  });

  it("PilotCard pilot name is LocalizedString – unitNameMapper does not clobber pilot names", async () => {
    const data = await gql(
      `{ node(id: "ST01-010") { ... on PilotCard { pilot { name { en ko } } } } }`,
    );
    const node = data["node"] as { pilot: { name: { en: string; ko: string } } };
    expect(node.pilot.name.en).toBe("Amuro Ray");
    expect(node.pilot.name.ko).toBe("아무로 레이");
  });

  it("Korean name search returns results", async () => {
    const data = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["UNIT"], query: "건담" },
    });
    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBeGreaterThan(0);
  });

  it("English name search returns results", async () => {
    const data = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["UNIT"], query: "Gundam" },
    });
    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBeGreaterThan(0);
  });

  it("Korean pilot name search returns results", async () => {
    const data = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["PILOT"], query: "아무로" },
    });
    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBeGreaterThan(0);
  });

  it("English pilot name search returns results", async () => {
    const data = await gql(`query($f: CardFilterInput!) { cards(filter: $f) { totalCount } }`, {
      f: { kind: ["PILOT"], query: "Amuro" },
    });
    const conn = data["cards"] as { totalCount: number };
    expect(conn.totalCount).toBeGreaterThan(0);
  });

  it("name { en ko } never has nested objects – guards against double-wrapping", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(first: 20, filter: $f) {
          edges { node { ... on UnitCard { name { en ko } } } }
        }
      }`,
      { f: { kind: ["UNIT"] } },
    );
    const edges = (
      data["cards"] as {
        edges: Array<{ node: { name?: { en: string; ko: string } } }>;
      }
    ).edges;
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      if (edge.node.name) {
        expect(typeof edge.node.name.en).toBe("string");
        expect(typeof edge.node.name.ko).toBe("string");
      }
    }
  });

  it("PilotCard in full-text search by Korean pilot name", async () => {
    const data = await gql(
      `query($f: CardFilterInput!) {
        cards(filter: $f) {
          totalCount
          edges { node { ... on PilotCard { id pilot { name { en ko } } } } }
        }
      }`,
      { f: { kind: ["PILOT"], query: "아무로" } },
    );
    const conn = data["cards"] as {
      totalCount: number;
      edges: Array<{ node: { id?: string; pilot?: { name: { en: string; ko: string } } } }>;
    };
    expect(conn.totalCount).toBeGreaterThan(0);
    for (const edge of conn.edges) {
      if (edge.node.pilot) {
        expect(edge.node.pilot.name.ko).toContain("아무로");
      }
    }
  });
});
