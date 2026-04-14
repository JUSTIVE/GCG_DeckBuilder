import { Suspense, useCallback, useMemo, useState } from "react";
import { graphql, useFragment, useLazyLoadQuery } from "react-relay";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cluster, hierarchy } from "d3-hierarchy";
import type { DeckGraphViewList_query$key } from "@/__generated__/DeckGraphViewList_query.graphql";
import type { DeckGraphViewCenterQuery } from "@/__generated__/DeckGraphViewCenterQuery.graphql";
import { Card } from "@/components/Card";
import { useLocalize } from "@/lib/localize";
import { renderTrait } from "@/render/trait";

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CARD_W = 160;
const CARD_H = 223; // 160 * 1117/800
const GRID_COLS = 6;
const GRID_COL_GAP = 24;
const GRID_ROW_GAP = 40;

// Outer ring radius — branch cards land here. Category labels sit halfway.
const LEAF_RADIUS = 620;

// ─── Fragments ────────────────────────────────────────────────────────────────

const ListFragment = graphql`
  fragment DeckGraphViewList_query on Query
  @argumentDefinitions(
    first: { type: "Int", defaultValue: 20 }
    after: { type: "String" }
    filter: { type: "CardFilterInput" }
    sort: { type: "CardSort" }
  ) {
    cards(first: $first, after: $after, filter: $filter, sort: $sort) {
      edges {
        node {
          __typename
          ... on UnitCard {
            id
          }
          ... on PilotCard {
            id
          }
          ... on BaseCard {
            id
          }
          ... on CommandCard {
            id
          }
          ... on Resource {
            id
          }
          ...CardFragment
        }
      }
    }
  }
`;

const CenterQuery = graphql`
  query DeckGraphViewCenterQuery($id: ID!) {
    node(id: $id) {
      __typename
      ... on UnitCard {
        id
        name {
          ko
          en
        }
        traits {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        series {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        linkablePilots {
          id
          pilot {
            name {
              ko
              en
            }
          }
          ...CardFragment
        }
        ...CardFragment
      }
      ... on PilotCard {
        id
        pilot {
          name {
            ko
            en
          }
        }
        traits {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        series {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        linkableUnits {
          id
          name {
            ko
            en
          }
          ...CardFragment
        }
        ...CardFragment
      }
      ... on BaseCard {
        id
        name {
          ko
          en
        }
        traits {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        series {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        ...CardFragment
      }
      ... on CommandCard {
        id
        name {
          ko
          en
        }
        traits {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        series {
          value
          cards {
            ...CardFragment
            __typename
            ... on UnitCard {
              id
            }
            ... on PilotCard {
              id
            }
            ... on BaseCard {
              id
            }
            ... on CommandCard {
              id
            }
          }
        }
        ...CardFragment
      }
    }
  }
`;

// ─── Custom node components ──────────────────────────────────────────────────

type CardNodeData = {
  cardRef: unknown;
  onSelect: (id: string) => void;
  id: string;
  scale?: number;
};

function CardNode({ data }: { data: CardNodeData }) {
  const scale = data.scale ?? 1;
  return (
    <div style={{ width: CARD_W * scale, cursor: "pointer" }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      {/* Card's internal button is disabled via pointer-events so ReactFlow's
          onNodeClick handler on the parent ReactFlow can receive the click. */}
      <div style={{ pointerEvents: "none" }}>
        <Card
          cardRef={data.cardRef as Parameters<typeof Card>[0]["cardRef"]}
          showDescription={false}
          onOpen={data.onSelect}
        />
      </div>
    </div>
  );
}

type CategoryNodeData = {
  label: string;
};

function CategoryNode({ data }: { data: CategoryNodeData }) {
  return (
    <div className="rounded-full bg-muted/90 backdrop-blur border border-border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm">
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      {data.label}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  card: CardNode as unknown as NodeTypes[string],
  category: CategoryNode as unknown as NodeTypes[string],
};

// ─── List mode ────────────────────────────────────────────────────────────────

function useListNodes(
  queryRef: DeckGraphViewList_query$key,
  onSelect: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const data = useFragment(ListFragment, queryRef);
  return useMemo(() => {
    const nodes: Node[] = [];
    data.cards.edges.forEach((edge, i) => {
      const id = (edge.node as { id?: string }).id;
      if (!id) return;
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * (CARD_W + GRID_COL_GAP);
      const y = row * (CARD_H + GRID_ROW_GAP);
      nodes.push({
        id,
        type: "card",
        position: { x, y },
        data: { cardRef: edge.node, onSelect, id },
        draggable: false,
        selectable: false,
      });
    });
    return { nodes, edges: [] };
  }, [data.cards.edges, onSelect]);
}

function ListMode({
  queryRef,
  onSelect,
}: {
  queryRef: DeckGraphViewList_query$key;
  onSelect: (id: string) => void;
}) {
  const { nodes, edges } = useListNodes(queryRef, onSelect);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_e, node) => {
        console.log("[DeckGraphView] onNodeClick", node.id, node.type);
        if (node.type === "card") onSelect((node.data as CardNodeData).id);
      }}
    >
      <Background gap={24} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// ─── Center mode ──────────────────────────────────────────────────────────────

type CategoryBranch = {
  key: string;
  label: string;
  cards: readonly { id?: string }[];
};

function useCenterNodes(
  cardId: string,
  onSelect: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const localize = useLocalize();
  const data = useLazyLoadQuery<DeckGraphViewCenterQuery>(CenterQuery, { id: cardId });
  return useMemo(() => {
    const node = data.node;
    if (!node || node.__typename === "%other") return { nodes: [], edges: [] };

    const branches: CategoryBranch[] = [];

    const traits = "traits" in node ? node.traits : [];
    for (const trait of traits) {
      branches.push({
        key: `trait:${trait.value}`,
        label: renderTrait(trait.value),
        cards: trait.cards.filter((c) => (c as { id?: string }).id !== cardId),
      });
    }

    const series = "series" in node ? node.series : null;
    if (series) {
      branches.push({
        key: `series:${series.value}`,
        label: String(series.value),
        cards: series.cards.filter((c) => (c as { id?: string }).id !== cardId),
      });
    }

    if (node.__typename === "UnitCard" && "linkablePilots" in node) {
      const linkable = node.linkablePilots as readonly {
        id: string;
        pilot: { name: { ko: string; en: string } };
      }[];
      if (linkable.length > 0) {
        branches.push({
          key: "linkablePilots",
          label: linkable.map((p) => localize(p.pilot.name)).join(", "),
          cards: linkable,
        });
      }
    }

    if (node.__typename === "PilotCard" && "linkableUnits" in node) {
      const linkable = node.linkableUnits as readonly {
        id: string;
        name: { ko: string; en: string };
      }[];
      if (linkable.length > 0) {
        branches.push({
          key: "linkableUnits",
          label: linkable.map((u) => localize(u.name)).join(", "),
          cards: linkable,
        });
      }
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Center card
    nodes.push({
      id: `center:${cardId}`,
      type: "card",
      position: { x: -CARD_W / 2, y: -CARD_H / 2 },
      data: { cardRef: node, onSelect, id: cardId },
      draggable: false,
      selectable: false,
    });

    const BRANCH_CARD_SCALE = 0.7;
    const BRANCH_CARD_W = CARD_W * BRANCH_CARD_SCALE;
    const BRANCH_CARD_H = CARD_H * BRANCH_CARD_SCALE;

    // Build a hierarchy: center → categories → branch cards. d3-hierarchy's
    // `cluster` places every leaf on the same ring and distributes them by
    // equal angular spacing, giving a clean radial layout automatically.
    type H = {
      kind: "center" | "category" | "card";
      id: string;
      branchKey?: string;
      label?: string;
      cardRef?: unknown;
      children?: H[];
    };

    const root: H = {
      kind: "center",
      id: `center:${cardId}`,
      children: branches.map<H>((branch) => ({
        kind: "category",
        id: `cat:${branch.key}`,
        branchKey: branch.key,
        label: branch.label,
        children: branch.cards
          .slice(0, 12)
          .map<H | null>((card) => {
            const id = (card as { id?: string }).id;
            return id
              ? {
                  kind: "card",
                  id: `branch:${branch.key}:${id}`,
                  cardRef: card,
                  branchKey: branch.key,
                }
              : null;
          })
          .filter((x): x is H => x != null),
      })),
    };

    const d3Root = hierarchy(root);
    cluster<H>().size([2 * Math.PI, LEAF_RADIUS])(d3Root);

    // d3 assigns .x (angle in radians, 0..2π) and .y (radial distance).
    // Convert polar → cartesian for React Flow positions.
    d3Root.each((n) => {
      const angle = (n.x ?? 0) - Math.PI / 2; // rotate so root is at top
      const radius = n.y ?? 0;
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;
      if (n.data.kind === "center") {
        // Already pushed above — nothing to do.
      } else if (n.data.kind === "category") {
        nodes.push({
          id: n.data.id,
          type: "category",
          position: { x: cx - 60, y: cy - 20 },
          data: { label: n.data.label ?? "" },
          draggable: false,
          selectable: false,
        });
        edges.push({
          id: `edge-center-${n.data.branchKey}`,
          source: `center:${cardId}`,
          target: n.data.id,
          animated: false,
          style: { strokeDasharray: "4 4", strokeOpacity: 0.5 },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      } else if (n.data.kind === "card") {
        const parentId = n.parent?.data.id ?? "";
        const id = n.data.id.split(":").pop() ?? "";
        nodes.push({
          id: n.data.id,
          type: "card",
          position: { x: cx - BRANCH_CARD_W / 2, y: cy - BRANCH_CARD_H / 2 },
          data: { cardRef: n.data.cardRef, onSelect, id, scale: BRANCH_CARD_SCALE },
          draggable: false,
          selectable: false,
        });
        edges.push({
          id: `edge-${n.data.id}`,
          source: parentId,
          target: n.data.id,
          style: { strokeOpacity: 0.3 },
        });
      }
    });

    return { nodes, edges };
  }, [data.node, cardId, onSelect, localize]);
}

function CenterMode({
  cardId,
  onSelect,
  onBack,
}: {
  cardId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { nodes, edges } = useCenterNodes(cardId, onSelect);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_e, node) => {
        if (node.type === "card") onSelect((node.data as CardNodeData).id);
      }}
    >
      <Background gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable className="!bg-background/80" />
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 z-10 text-xs px-3 py-1.5 rounded-full bg-background border border-border shadow-sm hover:bg-muted cursor-pointer"
      >
        ← back
      </button>
    </ReactFlow>
  );
}

// ─── Top-level view ───────────────────────────────────────────────────────────

export function DeckGraphView({ queryRef }: { queryRef: DeckGraphViewList_query$key }) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string) => {
    console.log("[DeckGraphView] handleSelect", id);
    setSelectedCardId(id);
  }, []);
  const handleBack = useCallback(() => setSelectedCardId(null), []);

  return (
    <div className="relative w-full h-full">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            loading…
          </div>
        }
      >
        {selectedCardId ? (
          <CenterMode
            key={selectedCardId}
            cardId={selectedCardId}
            onSelect={handleSelect}
            onBack={handleBack}
          />
        ) : (
          <ListMode queryRef={queryRef} onSelect={handleSelect} />
        )}
      </Suspense>
    </div>
  );
}
