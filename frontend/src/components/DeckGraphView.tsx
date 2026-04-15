import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { graphql, useFragment, useLazyLoadQuery } from "react-relay";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
  type InternalNode,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DeckGraphViewList_query$key } from "@/__generated__/DeckGraphViewList_query.graphql";
import type { DeckGraphViewCenterQuery } from "@/__generated__/DeckGraphViewCenterQuery.graphql";
import { Card } from "@/components/Card";
import { useLocalize } from "@/lib/localize";
import { renderTrait } from "@/render/trait";
import { renderSeries } from "@/render/series";
import { useTranslation } from "react-i18next";

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CARD_W = 160;
const CARD_H = 223; // 160 * 1117/800
const GRID_COLS = 6;
const GRID_COL_GAP = 24;
const GRID_ROW_GAP = 40;

// Fractal radial layout.
//  • The selected card sits at (0, 0).
//  • Category nodes radiate outward at equal 2π/N angles.
//  • Each category's own cards radiate around THAT category on a semicircle
//    that faces away from the center — so no card ever sits "behind" its
//    category toward the original selected card.
const CATEGORY_RADIUS = 380;
// Distance from a category node to each of its branch cards.
const BRANCH_CARD_RADIUS = 340;
// Angular spread of the branch-card semicircle (radians, ≤ π).
const BRANCH_SPREAD = Math.PI;

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

// Invisible handles are only required so React Flow accepts source/target
// connections. FloatingEdge ignores their positions and computes intersection
// points from the node's bounding box instead.
const hiddenHandleStyle: React.CSSProperties = {
  opacity: 0,
  pointerEvents: "none",
  top: "50%",
  left: "50%",
  width: 1,
  height: 1,
  border: "none",
  minWidth: 0,
  minHeight: 0,
};

function CardNode({ data }: { data: CardNodeData }) {
  const scale = data.scale ?? 1;
  return (
    <div className="deck-graph-node-enter" style={{ width: CARD_W * scale, cursor: "pointer" }}>
      <Handle id="t" type="target" position={Position.Top} style={hiddenHandleStyle} />
      <Handle id="s" type="source" position={Position.Top} style={hiddenHandleStyle} />
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
    <div className="deck-graph-node-enter rounded-full bg-muted/90 backdrop-blur border border-border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm">
      <Handle id="t" type="target" position={Position.Top} style={hiddenHandleStyle} />
      <Handle id="s" type="source" position={Position.Top} style={hiddenHandleStyle} />
      {data.label}
    </div>
  );
}

// ─── Floating edge ────────────────────────────────────────────────────────────
// Computes the intersection of the line between the two nodes' centers and
// each node's bounding box, so the edge always attaches on the side that faces
// the other node (independent of Handle positions).

function getNodeIntersection(node: InternalNode, other: InternalNode) {
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const ow = other.measured?.width ?? 0;
  const oh = other.measured?.height ?? 0;
  const nx = (node.internals.positionAbsolute?.x ?? 0) + w / 2;
  const ny = (node.internals.positionAbsolute?.y ?? 0) + h / 2;
  const ox = (other.internals.positionAbsolute?.x ?? 0) + ow / 2;
  const oy = (other.internals.positionAbsolute?.y ?? 0) + oh / 2;
  const dx = ox - nx;
  const dy = oy - ny;
  if (dx === 0 && dy === 0) return { x: nx, y: ny };
  // Scale the direction vector so it lands exactly on the bounding box edge.
  const scale = 1 / Math.max((2 * Math.abs(dx)) / w, (2 * Math.abs(dy)) / h);
  return { x: nx + dx * scale, y: ny + dy * scale };
}

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;
  const s = getNodeIntersection(sourceNode, targetNode);
  const t = getNodeIntersection(targetNode, sourceNode);
  const [edgePath] = getStraightPath({
    sourceX: s.x,
    sourceY: s.y,
    targetX: t.x,
    targetY: t.y,
  });
  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />;
}

const edgeTypes: EdgeTypes = {
  floating: FloatingEdge,
};

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

type SelectOptions = { element: HTMLElement; cardRef: unknown };

function ListMode({
  queryRef,
  onSelect,
}: {
  queryRef: DeckGraphViewList_query$key;
  onSelect: (id: string, opts?: SelectOptions) => void;
}) {
  const { nodes, edges } = useListNodes(queryRef, (id) => onSelect(id));
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 600 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(e, node) => {
        if (node.type !== "card") return;
        const cardData = node.data as CardNodeData;
        const element = (e.target as HTMLElement | null)?.closest<HTMLElement>(".react-flow__node");
        onSelect(cardData.id, element ? { element, cardRef: cardData.cardRef } : undefined);
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
  const { t } = useTranslation("common");
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
        label: renderSeries(series.value),
        cards: series.cards.filter((c) => (c as { id?: string }).id !== cardId),
      });
    }

    if (node.__typename === "UnitCard" && "linkablePilots" in node) {
      const linkable = node.linkablePilots as readonly {
        id: string;
        pilot: { name: { ko: string; en: string } };
      }[];
      if (linkable.length > 0) {
        // LinkPilot units typically match 1–2 named pilots (and variants); show
        // those names as the label. LinkTrait units (e.g. G-스카이 Ez →
        // WHITE_BASE_TEAM) can match many pilots — concatenating every name is
        // unreadable, so fall back to the generic "linkable" label in that case.
        const label =
          linkable.length <= 2
            ? linkable.map((p) => localize(p.pilot.name)).join(", ")
            : t("deck.linkable");
        branches.push({
          key: "linkablePilots",
          label,
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
          label: t("deck.linkable"),
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

    branches.forEach((branch, bi) => {
      // Category angle from the origin.
      const catAngle = (bi / branches.length) * Math.PI * 2 - Math.PI / 2;
      const catX = Math.cos(catAngle) * CATEGORY_RADIUS;
      const catY = Math.sin(catAngle) * CATEGORY_RADIUS;

      const categoryId = `cat:${branch.key}`;
      nodes.push({
        id: categoryId,
        type: "category",
        position: { x: catX - 60, y: catY - 20 },
        data: { label: branch.label },
        draggable: false,
        selectable: false,
      });
      edges.push({
        id: `edge-center-${branch.key}`,
        source: `center:${cardId}`,
        target: categoryId,
        type: "floating",
        animated: false,
        style: { strokeDasharray: "4 4", strokeOpacity: 0.5 },
        markerEnd: { type: MarkerType.ArrowClosed },
      });

      // Arrange cards on a semicircle around the category that faces AWAY
      // from the center (i.e. excludes the arc pointing back to origin).
      const branchCards = branch.cards.slice(0, 12);
      const n = branchCards.length;
      branchCards.forEach((card, ci) => {
        const id = (card as { id?: string }).id;
        if (!id) return;
        // Single card: straight outward. Multiple: spread across semicircle.
        const offset = n === 1 ? 0 : (ci / (n - 1) - 0.5) * BRANCH_SPREAD;
        const cardAngle = catAngle + offset;
        const cx = catX + Math.cos(cardAngle) * BRANCH_CARD_RADIUS;
        const cy = catY + Math.sin(cardAngle) * BRANCH_CARD_RADIUS;
        const nodeId = `branch:${branch.key}:${id}`;
        nodes.push({
          id: nodeId,
          type: "card",
          position: { x: cx - BRANCH_CARD_W / 2, y: cy - BRANCH_CARD_H / 2 },
          data: { cardRef: card, onSelect, id, scale: BRANCH_CARD_SCALE },
          draggable: false,
          selectable: false,
        });
        edges.push({
          id: `edge-${nodeId}`,
          source: categoryId,
          target: nodeId,
          type: "floating",
          style: { strokeOpacity: 0.3 },
        });
      });
    });

    return { nodes, edges };
  }, [data.node, cardId, onSelect, localize, t]);
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
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const prevCardIdRef = useRef<string>(cardId);

  // Smoothly pan to the new center when cardId changes (but not on first mount —
  // the initial fitView handles that case).
  useEffect(() => {
    if (prevCardIdRef.current === cardId) return;
    prevCardIdRef.current = cardId;
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setCenter(0, 0, { duration: 500, zoom: inst.getZoom() });
  }, [cardId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.15, duration: 600 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      onInit={(inst) => {
        instanceRef.current = inst;
      }}
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

const TRANSITION_MS = 450;
const FLY_MS = 500;

type FlyingCard = {
  // Initial rect of the source list node, relative to the container.
  startX: number;
  startY: number;
  width: number;
  height: number;
  cardRef: unknown;
  // Flipped to true on the next frame so the CSS transition animates to center.
  atCenter: boolean;
};

export function DeckGraphView({ queryRef }: { queryRef: DeckGraphViewList_query$key }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // `mountedCenter` lets us keep the center view mounted during the fade-out
  // after back navigation, so the cross-fade works in both directions.
  const [mountedCenter, setMountedCenter] = useState<string | null>(null);
  // `mountedList` lets us keep the list view mounted while the center is
  // rendered on top, so list cards continue fading out during the transition.
  const [mountedList, setMountedList] = useState(true);
  const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);

  useEffect(() => {
    if (selectedCardId) {
      setMountedCenter(selectedCardId);
      setMountedList(true);
      const t = setTimeout(() => setMountedList(false), TRANSITION_MS + 50);
      return () => clearTimeout(t);
    } else {
      setMountedList(true);
      const t = setTimeout(() => setMountedCenter(null), TRANSITION_MS + 50);
      return () => clearTimeout(t);
    }
  }, [selectedCardId]);

  // Flip the ghost card to its target transform on the next frame so the
  // browser interpolates via CSS transition.
  useEffect(() => {
    if (!flyingCard || flyingCard.atCenter) return;
    const raf = requestAnimationFrame(() => {
      setFlyingCard((prev) => (prev ? { ...prev, atCenter: true } : prev));
    });
    return () => cancelAnimationFrame(raf);
  }, [flyingCard]);

  useEffect(() => {
    if (!flyingCard?.atCenter) return;
    const t = setTimeout(() => setFlyingCard(null), FLY_MS);
    return () => clearTimeout(t);
  }, [flyingCard?.atCenter]);

  const handleSelect = useCallback((id: string, opts?: SelectOptions) => {
    if (opts && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const nodeRect = opts.element.getBoundingClientRect();
      setFlyingCard({
        startX: nodeRect.left - containerRect.left,
        startY: nodeRect.top - containerRect.top,
        width: nodeRect.width,
        height: nodeRect.height,
        cardRef: opts.cardRef,
        atCenter: false,
      });
    }
    setSelectedCardId(id);
  }, []);
  const handleBack = useCallback(() => setSelectedCardId(null), []);

  const showCenter = selectedCardId != null;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <style>{`
        @keyframes deck-graph-node-in {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
        .deck-graph-node-enter {
          animation: deck-graph-node-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-origin: center;
        }
        /* Raise hovered nodes above siblings so they're never clipped. */
        .react-flow__node:hover {
          z-index: 10 !important;
        }
      `}</style>
      {mountedList && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity ease-in-out",
            showCenter ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          <Suspense fallback={null}>
            <ListMode queryRef={queryRef} onSelect={handleSelect} />
          </Suspense>
        </div>
      )}
      {mountedCenter && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity ease-in-out",
            showCenter ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                loading…
              </div>
            }
          >
            <CenterMode
              cardId={mountedCenter}
              onSelect={(id) => handleSelect(id)}
              onBack={handleBack}
            />
          </Suspense>
        </div>
      )}
      {flyingCard &&
        (() => {
          const containerRect = containerRef.current?.getBoundingClientRect();
          const cw = containerRect?.width ?? 0;
          const ch = containerRect?.height ?? 0;
          const targetX = cw / 2 - flyingCard.width / 2;
          const targetY = ch / 2 - flyingCard.height / 2;
          const dx = flyingCard.atCenter ? targetX - flyingCard.startX : 0;
          const dy = flyingCard.atCenter ? targetY - flyingCard.startY : 0;
          return (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                left: flyingCard.startX,
                top: flyingCard.startY,
                width: flyingCard.width,
                height: flyingCard.height,
                transform: `translate(${dx}px, ${dy}px)`,
                transition: `transform ${FLY_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <Card
                cardRef={flyingCard.cardRef as Parameters<typeof Card>[0]["cardRef"]}
                showDescription={false}
                onOpen={() => {}}
              />
            </div>
          );
        })()}
    </div>
  );
}
