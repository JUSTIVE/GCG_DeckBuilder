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
import { forceCollide, forceSimulation, forceX, forceY } from "d3-force";
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
//  • Each category's own cards radiate on a semicircle around THAT category.
//  • Adjacent branches would overlap at full spread (π), so we STAGGER the
//    per-branch radius (inner/outer ring, alternating by index) — that way
//    cards can keep their wide spread without colliding with neighbours.
const CATEGORY_RADIUS_INNER = 340;
const CATEGORY_RADIUS_OUTER = 640;
// Distance from a category node to each of its branch cards.
const BRANCH_CARD_RADIUS = 320;
// Angular spread of the branch-card arc (radians, ≤ π).
const BRANCH_SPREAD = Math.PI;
// Deterministic jitter amplitudes so cards don't sit on a perfect arc. Kept
// small enough that jitter doesn't overlap the gap the dynamic radius gives us.
const JITTER_RADIUS = 24;
const JITTER_ANGLE = 0.05; // ±radians (~3°)

// Cheap deterministic hash → [-1, 1) so the same card id always jitters the
// same way (no flicker on re-render).
function hashUnit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000 - 0.5;
}

// ─── Collision resolution (d3-force) ─────────────────────────────────────────
// Runs a synchronous d3-force simulation that combines:
//  • forceCollide — bounding-circle collision avoidance (anti-overlap)
//  • forceX / forceY — soft tether to the initial radial position so nodes
//    don't drift far from where we wanted to place them
// The center card is pinned (fx/fy) so everything else orbits around it.

type CollidableNode = Node & {
  width: number;
  height: number;
  pinned?: boolean;
};

type SimNode = {
  id: string;
  x: number;
  y: number;
  // Target position (forceX/forceY tether); the original placement.
  tx: number;
  ty: number;
  r: number;
  fx?: number;
  fy?: number;
};

function resolveCollisions(nodes: CollidableNode[]) {
  const simNodes: SimNode[] = nodes.map((n) => {
    const cx = n.position.x + n.width / 2;
    const cy = n.position.y + n.height / 2;
    // Use the half-diagonal as the collision radius — a bit loose but keeps
    // rectangles from clipping each other regardless of orientation.
    const r = Math.hypot(n.width, n.height) / 2 + 4;
    const base: SimNode = { id: n.id, x: cx, y: cy, tx: cx, ty: cy, r };
    if (n.pinned) {
      base.fx = cx;
      base.fy = cy;
    }
    return base;
  });

  forceSimulation(simNodes as never)
    .force("collide", forceCollide<SimNode>((d) => d.r).iterations(3))
    .force("x", forceX<SimNode>((d) => d.tx).strength(0.15))
    .force("y", forceY<SimNode>((d) => d.ty).strength(0.15))
    .stop()
    .tick(120);

  // Write positions back to React Flow nodes (top-left corner, not center).
  simNodes.forEach((sim, i) => {
    const n = nodes[i];
    n.position.x = sim.x - n.width / 2;
    n.position.y = sim.y - n.height / 2;
  });
}

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
  // When set, the node renders +/- deck controls alongside the card.
  controls?: {
    count: number;
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
  };
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
  const controls = data.controls;
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
      {controls && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-3 flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 shadow-md"
          style={{ pointerEvents: "auto" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              controls.onRemove(data.id);
            }}
            disabled={controls.count <= 0}
            className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
            {controls.count}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              controls.onAdd(data.id);
            }}
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-110 cursor-pointer"
          >
            +
          </button>
        </div>
      )}
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
      zoomOnDoubleClick={false}
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
  centerControls: CardNodeData["controls"],
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

    const collidable: CollidableNode[] = [];
    const edges: Edge[] = [];

    // Center card (pinned — other nodes move around it).
    collidable.push({
      id: `center:${cardId}`,
      type: "card",
      position: { x: -CARD_W / 2, y: -CARD_H / 2 },
      data: { cardRef: node, onSelect, id: cardId, controls: centerControls },
      draggable: false,
      selectable: false,
      width: CARD_W,
      height: CARD_H,
      pinned: true,
    });

    const BRANCH_CARD_SCALE = 0.7;
    const BRANCH_CARD_W = CARD_W * BRANCH_CARD_SCALE;
    const BRANCH_CARD_H = CARD_H * BRANCH_CARD_SCALE;
    // Rough visual footprint of a CategoryNode pill (text varies in width).
    const CATEGORY_W = 160;
    const CATEGORY_H = 44;

    // When there are ≤2 branches they never collide, so keep them all on the
    // inner ring. Otherwise alternate inner/outer rings by branch index so
    // each branch can keep a full-π spread without overlapping its neighbours.
    const useStagger = branches.length >= 3;

    branches.forEach((branch, bi) => {
      // Category angle from the origin.
      const catAngle = (bi / branches.length) * Math.PI * 2 - Math.PI / 2;
      const catRadius = useStagger && bi % 2 === 1 ? CATEGORY_RADIUS_OUTER : CATEGORY_RADIUS_INNER;
      const catX = Math.cos(catAngle) * catRadius;
      const catY = Math.sin(catAngle) * catRadius;

      const categoryId = `cat:${branch.key}`;
      collidable.push({
        id: categoryId,
        type: "category",
        position: { x: catX - CATEGORY_W / 2, y: catY - CATEGORY_H / 2 },
        data: { label: branch.label },
        draggable: false,
        selectable: false,
        width: CATEGORY_W,
        height: CATEGORY_H,
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
      // from the centre. The arc radius is computed from the card count so
      // cards never overlap along the arc (angular gap ≥ card width / radius).
      // Deterministic per-card jitter breaks up the perfect arc for organic
      // look — jitter amplitude stays smaller than the gap so it doesn't
      // re-introduce overlap.
      const branchCards = branch.cards.slice(0, 12);
      const n = branchCards.length;
      const desiredArcLength = Math.max(n - 1, 0) * (BRANCH_CARD_W + 24);
      const minRadius = desiredArcLength / BRANCH_SPREAD;
      const branchRadius = Math.max(BRANCH_CARD_RADIUS, minRadius);
      branchCards.forEach((card, ci) => {
        const id = (card as { id?: string }).id;
        if (!id) return;
        const base = n === 1 ? 0 : (ci / (n - 1) - 0.5) * BRANCH_SPREAD;
        const jitterKey = `${branch.key}:${id}`;
        const offset = base + hashUnit(`${jitterKey}:a`) * 2 * JITTER_ANGLE;
        const radius = branchRadius + hashUnit(`${jitterKey}:r`) * 2 * JITTER_RADIUS;
        const cardAngle = catAngle + offset;
        const cx = catX + Math.cos(cardAngle) * radius;
        const cy = catY + Math.sin(cardAngle) * radius;
        const nodeId = `branch:${branch.key}:${id}`;
        collidable.push({
          id: nodeId,
          type: "card",
          position: { x: cx - BRANCH_CARD_W / 2, y: cy - BRANCH_CARD_H / 2 },
          data: { cardRef: card, onSelect, id, scale: BRANCH_CARD_SCALE },
          draggable: false,
          selectable: false,
          width: BRANCH_CARD_W,
          height: BRANCH_CARD_H,
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

    resolveCollisions(collidable);

    // Strip the collision-only fields before handing the nodes to React Flow.
    const nodes: Node[] = collidable.map(({ width: _w, height: _h, pinned: _p, ...n }) => n);

    return { nodes, edges };
  }, [data.node, cardId, onSelect, localize, t, centerControls]);
}

function CenterMode({
  cardId,
  onSelect,
  onBack,
  centerControls,
}: {
  cardId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  centerControls: CardNodeData["controls"];
}) {
  const { nodes, edges } = useCenterNodes(cardId, onSelect, centerControls);
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
      zoomOnDoubleClick={false}
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

export function DeckGraphView({
  queryRef,
  deckCardCounts,
  onAdd,
  onRemove,
}: {
  queryRef: DeckGraphViewList_query$key;
  deckCardCounts: Record<string, number>;
  onAdd: (cardId: string) => void;
  onRemove: (cardId: string) => void;
}) {
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
              centerControls={{
                count: deckCardCounts[mountedCenter] ?? 0,
                onAdd,
                onRemove,
              }}
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
