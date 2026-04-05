import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { CardByIdOverlayQuery } from "@/__generated__/CardByIdOverlayQuery.graphql";
import type { CardByIdOverlayAddCardViewMutation } from "@/__generated__/CardByIdOverlayAddCardViewMutation.graphql";
import { useEffect, useRef, useState } from "react";
import { UnitCardBody } from "./UnitCard";
import { PilotCardBody } from "./PilotCard";
import { BaseCardBody } from "./BaseCard";
import { CommandCardBody } from "./CommandCard";
import { ResourceCardBody } from "./ResourceCard";
import { renderRarity } from "@/render/rarity";
import { COLOR_BG, COLOR_BORDER, COLOR_SHADOW } from "src/render/color";
import { cn } from "@/lib/utils";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "@tanstack/react-router";
import type { CardListSearch } from "@/routes/cardlist";
import { KeywordPanel } from "./CardOverlay/KeywordPanel";
import { UnitCardDetail } from "./CardOverlay/UnitCardDetail";
import { PilotCardDetail } from "./CardOverlay/PilotCardDetail";
import { BaseCardDetail } from "./CardOverlay/BaseCardDetail";
import { CommandCardDetail } from "./CardOverlay/CommandCardDetail";

const ADD_CARD_VIEW_MUTATION = graphql`
  mutation CardByIdOverlayAddCardViewMutation($cardId: ID!) {
    addCardView(cardId: $cardId) {
      ...SearchHistoryPanel_list
    }
  }
`;

const Query = graphql`
  query CardByIdOverlayQuery($id: ID!) {
    node(id: $id) {
      id
      __typename
      ... on UnitCard {
        ...UnitCard_UnitCardBody
        id name level cost color AP HP description zone traits relatedTraits keywords series package
        links {
          __typename
          ... on LinkPilot { pilot { name } }
          ... on LinkTrait { trait }
        }
      }
      ... on PilotCard {
        ...PilotCard_PilotCardBody
        id level cost color traits relatedTraits keywords description series package
        pilot { name AP HP }
      }
      ... on BaseCard {
        ...BaseCard_BaseCardBody
        id name level cost color AP HP description zone traits relatedTraits keywords series package
      }
      ... on CommandCard {
        ...CommandCard_CommandCardBody
        id name level cost color traits relatedTraits keywords description series package
        commandPilot: pilot { name AP HP }
      }
      ... on Resource {
        ...ResourceCard_ResourceCardBody_Fragment
        id name rarity
      }
    }
  }
`;

export function CardByIdOverlay({
  cardId,
  onClose,
  cardIds,
}: {
  cardId: string;
  onClose?: () => void;
  cardIds?: string[];
}) {
  const data = useLazyLoadQuery<CardByIdOverlayQuery>(Query, { id: cardId });
  const router = useRouter();
  const node = data.node;

  const [commitAddCardView] = useMutation<CardByIdOverlayAddCardViewMutation>(ADD_CARD_VIEW_MUTATION);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!node || node.__typename === "%other") return;
    commitAddCardView({ variables: { cardId } });
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cardIds?.length) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = cardIds!.indexOf(cardId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= cardIds!.length) return;
      e.preventDefault();
      router.navigate({ to: "/cardlist", search: (prev) => ({ ...prev, cardId: cardIds![nextIdx] }), replace: true, viewTransition: true });
    }
    document.addEventListener("keydown", handleKey, { capture: true });
    return () => document.removeEventListener("keydown", handleKey, { capture: true });
  }, [cardIds, cardId, router]);

  if (!node || node.__typename === "%other") return null;

  function closeDialog() {
    if (onClose) { onClose(); return; }
    router.navigate({ to: "/cardlist", search: (prev) => ({ ...prev, cardId: undefined }), replace: true });
  }

  function navigateWithFilter(filter: Partial<CardListSearch>) {
    router.navigate({ to: "/cardlist", search: filter, replace: true });
  }

  function renderDetail() {
    if (!node || node.__typename === "%other") return null;
    if (node.__typename === "UnitCard") return <UnitCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "PilotCard") return <PilotCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "BaseCard") return <BaseCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "CommandCard") return <CommandCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "Resource") {
      return (
        <div className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-2">
          <h2 className="text-sm font-bold leading-tight">{node.name}</h2>
          <div className="text-xs text-white/60">{node.id}</div>
          <div className="text-xs text-white/60">{renderRarity(node.rarity ?? "")}</div>
        </div>
      );
    }
    return null;
  }

  function renderKeywords() {
    if (!node || node.__typename === "%other" || node.__typename === "Resource") return null;
    if (!("keywords" in node) || !node.keywords?.length) return null;
    return <KeywordPanel keywords={node.keywords as string[]} />;
  }

  function renderThumbnail() {
    if (!node) return null;
    if (node.__typename === "UnitCard") return <UnitCardBody unitCardRefs={node} cardBg={COLOR_BG[node.color ?? ""] ?? "bg-black"} isWhite={node.color === "WHITE"} />;
    if (node.__typename === "PilotCard") return <PilotCardBody pilotCardRef={node} />;
    if (node.__typename === "BaseCard") return <BaseCardBody baseCardRef={node} isWhite={node.color === "WHITE"} />;
    if (node.__typename === "CommandCard") return <CommandCardBody commandCardRef={node} />;
    if (node.__typename === "Resource") return <ResourceCardBody resourceCardRef={node} />;
    return null;
  }

  return (
    <Dialog.Root open={true} onOpenChange={closeDialog}>
      <Dialog.Portal>
        <Dialog.Backdrop
          onClick={closeDialog}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <Dialog.Popup className="fixed inset-0 z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden outline-none transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <div className="flex items-center justify-center gap-4 p-6 min-h-full" onClick={closeDialog}>
            <div className="flex flex-col gap-4 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <div
                ref={cardRef}
                className={cn(
                  "@container pointer-events-auto relative flex w-72 sm:w-80 shrink-0 flex-col aspect-800/1117 justify-between text-white overflow-hidden rounded-xl border-2",
                  node && "color" in node ? COLOR_BORDER[node.color as string] : undefined,
                  node && "color" in node ? COLOR_SHADOW[node.color as string] : undefined,
                )}
                style={{
                  transform: `perspective(800px) rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                onMouseMove={(e) => {
                  const rect = cardRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  setTilt({ rotX: -y * 15, rotY: x * 15 });
                }}
                onMouseLeave={() => setTilt({ rotX: 0, rotY: 0 })}
              >
                {renderThumbnail()}
              </div>
              {renderDetail()}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {renderKeywords()}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
