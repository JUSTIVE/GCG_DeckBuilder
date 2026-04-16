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
import { setPrintingPreference } from "@/lib/printingPreference";
import { useLocalize } from "@/lib/localize";
import { COLOR_BG, COLOR_BORDER, COLOR_SHADOW } from "src/render/color";
import { cn } from "@/lib/utils";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { CardListSearch } from "@/routes/$locale/cardlist";
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
        id
        name {
          en
          ko
        }
        level
        cost
        color {
          value
        }
        AP
        HP
        zone
        traits {
          value
        }
        relatedTraits {
          value
        }
        keywords {
          value
        }
        series {
          value
        }
        package
        printings {
          rarity
          imageUrl
          block
        }
        description {
          tokens {
            ... on TriggerToken {
              type
              keyword
              qualifier {
                en
                ko
              }
            }
            ... on AbilityToken {
              type
              keyword
              n
            }
            ... on ProseToken {
              type
              text {
                en
                ko
              }
            }
          }
        }
        links {
          __typename
          ... on LinkPilot {
            pilot {
              name {
                en
                ko
              }
            }
          }
          ... on LinkTrait {
            trait
          }
        }
      }
      ... on PilotCard {
        ...PilotCard_PilotCardBody
        id
        level
        cost
        color {
          value
        }
        traits {
          value
        }
        relatedTraits {
          value
        }
        keywords {
          value
        }
        series {
          value
        }
        package
        printings {
          rarity
          imageUrl
          block
        }
        description {
          tokens {
            ... on TriggerToken {
              type
              keyword
              qualifier {
                en
                ko
              }
            }
            ... on AbilityToken {
              type
              keyword
              n
            }
            ... on ProseToken {
              type
              text {
                en
                ko
              }
            }
          }
        }
        pilot {
          name {
            en
            ko
          }
          AP
          HP
        }
      }
      ... on BaseCard {
        ...BaseCard_BaseCardBody
        id
        name {
          en
          ko
        }
        level
        cost
        color {
          value
        }
        AP
        HP
        zone
        traits {
          value
        }
        relatedTraits {
          value
        }
        keywords {
          value
        }
        series {
          value
        }
        package
        printings {
          rarity
          imageUrl
          block
        }
        description {
          tokens {
            ... on TriggerToken {
              type
              keyword
              qualifier {
                en
                ko
              }
            }
            ... on AbilityToken {
              type
              keyword
              n
            }
            ... on ProseToken {
              type
              text {
                en
                ko
              }
            }
          }
        }
      }
      ... on CommandCard {
        ...CommandCard_CommandCardBody
        id
        name {
          en
          ko
        }
        level
        cost
        color {
          value
        }
        traits {
          value
        }
        relatedTraits {
          value
        }
        keywords {
          value
        }
        series {
          value
        }
        package
        printings {
          rarity
          imageUrl
          block
        }
        description {
          tokens {
            ... on TriggerToken {
              type
              keyword
              qualifier {
                en
                ko
              }
            }
            ... on AbilityToken {
              type
              keyword
              n
            }
            ... on ProseToken {
              type
              text {
                en
                ko
              }
            }
          }
        }
        commandPilot: pilot {
          name {
            en
            ko
          }
          AP
          HP
        }
      }
      ... on Resource {
        ...ResourceCard_ResourceCardBody_Fragment
        id
        name {
          en
          ko
        }
        rarity
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
  const [fetchKey, setFetchKey] = useState(0);
  const data = useLazyLoadQuery<CardByIdOverlayQuery>(Query, { id: cardId }, { fetchKey });
  const router = useRouter();
  const { locale = "ko" } = useParams({ strict: false });
  const localize = useLocalize();
  const { t } = useTranslation("common");
  const node = data.node;

  const [commitAddCardView] =
    useMutation<CardByIdOverlayAddCardViewMutation>(ADD_CARD_VIEW_MUTATION);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0 });
  const [gyroEnabled, setGyroEnabled] = useState(
    () => localStorage.getItem("gyroEnabled") !== "false",
  );
  const [gyroPermission, setGyroPermission] = useState<"unknown" | "granted" | "denied" | "na">(
    () => {
      if (typeof DeviceOrientationEvent === "undefined") return "na";
      if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") return "granted";
      return sessionStorage.getItem("gyroPermission") === "granted" ? "granted" : "unknown";
    },
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const gyroBase = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (!gyroEnabled || gyroPermission !== "granted") return;

    // Re-verify permission silently on session start (catches external revocation)
    const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === "function";
    if (needsPermission && !sessionStorage.getItem("gyroPermission")) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((result: string) => {
          if (result !== "granted") setGyroPermission("unknown");
        })
        .catch(() => setGyroPermission("unknown"));
      return;
    }

    gyroBase.current = null;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.beta == null || e.gamma == null) return;
      if (!gyroBase.current) {
        gyroBase.current = { beta: e.beta, gamma: e.gamma };
        return;
      }
      const rotX = Math.max(-15, Math.min(15, -(e.beta - gyroBase.current.beta) * 0.5));
      const rotY = Math.max(-15, Math.min(15, (e.gamma - gyroBase.current.gamma) * 0.5));
      setTilt({ rotX, rotY });
    }

    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      gyroBase.current = null;
      setTilt({ rotX: 0, rotY: 0 });
    };
  }, [gyroEnabled, gyroPermission, cardId]);

  function toggleGyro() {
    const next = !gyroEnabled;
    setGyroEnabled(next);
    localStorage.setItem("gyroEnabled", String(next));
    if (!next) setTilt({ rotX: 0, rotY: 0 });
  }

  async function requestGyroPermission() {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      const granted = result === "granted";
      if (granted) sessionStorage.setItem("gyroPermission", "granted");
      setGyroPermission(granted ? "granted" : "denied");
    } catch {
      setGyroPermission("denied");
    }
  }

  useEffect(() => {
    if (!node || node.__typename === "%other") return;
    commitAddCardView({ variables: { cardId } });
  }, [cardId]);
  useEffect(() => {
    if (!cardIds?.length) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = cardIds!.indexOf(cardId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= cardIds!.length) return;
      e.preventDefault();
      router.navigate({
        to: "/$locale/cardlist",
        params: { locale },
        search: (prev) => ({ ...prev, cardId: cardIds![nextIdx] }),
        replace: true,
        viewTransition: true,
      });
    }
    document.addEventListener("keydown", handleKey, { capture: true });
    return () => document.removeEventListener("keydown", handleKey, { capture: true });
  }, [cardIds, cardId, router]);

  if (!node || node.__typename === "%other") return null;

  function closeDialog() {
    if (onClose) {
      onClose();
      return;
    }
    router.navigate({
      to: "/$locale/cardlist",
      params: { locale },
      search: (prev) => ({ ...prev, cardId: undefined }),
      replace: true,
    });
  }

  function navigateWithFilter(filter: Partial<CardListSearch>) {
    router.navigate({ to: "/$locale/cardlist", params: { locale }, search: filter, replace: true });
  }

  function renderDetail() {
    if (!node || node.__typename === "%other") return null;
    if (node.__typename === "UnitCard")
      return <UnitCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "PilotCard")
      return <PilotCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "BaseCard")
      return <BaseCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "CommandCard")
      return <CommandCardDetail node={node} navigateWithFilter={navigateWithFilter} />;
    if (node.__typename === "Resource") {
      return (
        <div className="pointer-events-auto w-72 rounded-xl bg-black/75 px-4 py-5 text-white backdrop-blur-md flex flex-col gap-2">
          <h2 className="text-sm font-bold leading-tight">{localize(node.name)}</h2>
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
    return <KeywordPanel keywords={(node.keywords as { value: string }[]).map((k) => k.value)} />;
  }

  function renderPrintings() {
    if (!node || node.__typename === "%other" || node.__typename === "Resource") return null;
    if (!("printings" in node)) return null;
    const printings = (node.printings ?? []) as readonly {
      rarity: string;
      imageUrl: string;
      block: string;
    }[];
    if (printings.length <= 1) return null;
    const currentUrl = "imageUrl" in node ? (node.imageUrl as string | undefined) : undefined;
    return (
      <div className="flex flex-wrap justify-center gap-2 max-w-[18rem]">
        {printings.map((p) => {
          const active = p.imageUrl === currentUrl;
          // Extract the imageFile stem (e.g. "GD01-001_p1") from the URL.
          const m = new RegExp("/cards/(.+)\\.webp$").exec(p.imageUrl);
          const imageFile = m?.[1];
          return (
            <button
              key={p.imageUrl}
              type="button"
              onClick={() => {
                if (!imageFile) return;
                setPrintingPreference(cardId, imageFile);
                setFetchKey((k) => k + 1);
              }}
              className={cn(
                "relative w-12 overflow-hidden rounded border-2 transition-all cursor-pointer",
                active
                  ? "border-white ring-2 ring-white/40"
                  : "border-white/20 hover:border-white/60 opacity-80 hover:opacity-100",
              )}
              title={renderRarity(p.rarity)}
            >
              <img
                src={p.imageUrl.replace(/\.webp$/, "-sm.webp")}
                onError={(e) => {
                  const img = e.currentTarget;
                  // Fall back to the full-resolution webp if the -sm variant
                  // doesn't exist for this printing.
                  if (img.src !== p.imageUrl) img.src = p.imageUrl;
                }}
                alt={renderRarity(p.rarity)}
                className="w-full aspect-800/1117 object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-semibold leading-none text-white">
                {renderRarity(p.rarity)}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderThumbnail() {
    if (!node) return null;
    if (node.__typename === "UnitCard")
      return (
        <UnitCardBody
          unitCardRefs={node}
          cardBg={
            COLOR_BG[(node.color as { value: string } | null | undefined)?.value ?? ""] ??
            "bg-black"
          }
          isWhite={(node.color as { value: string } | null | undefined)?.value === "WHITE"}
        />
      );
    if (node.__typename === "PilotCard") return <PilotCardBody pilotCardRef={node} />;
    if (node.__typename === "BaseCard")
      return (
        <BaseCardBody
          baseCardRef={node}
          isWhite={(node.color as { value: string } | null | undefined)?.value === "WHITE"}
        />
      );
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
          <div
            className="flex items-center justify-center gap-4 p-6 min-h-full"
            onClick={closeDialog}
          >
            <div
              className="flex flex-col gap-4 items-center shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                ref={cardRef}
                className={cn(
                  "@container pointer-events-auto relative flex w-72 sm:w-80 shrink-0 flex-col aspect-800/1117 justify-between text-white overflow-hidden rounded-xl border-2 [contain:paint]",
                  node && "color" in node
                    ? COLOR_BORDER[
                        (node.color as { value: string } | null | undefined)?.value ?? ""
                      ]
                    : undefined,
                  node && "color" in node
                    ? COLOR_SHADOW[
                        (node.color as { value: string } | null | undefined)?.value ?? ""
                      ]
                    : undefined,
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
                {gyroEnabled && gyroPermission === "unknown" && (
                  <button
                    type="button"
                    onClick={requestGyroPermission}
                    className="absolute inset-0 flex items-end justify-center pb-4 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold"
                  >
                    {t("gyro.allow")}
                  </button>
                )}
              </div>
              {gyroPermission !== "na" && (
                <button
                  type="button"
                  onClick={toggleGyro}
                  className={cn(
                    "pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    gyroEnabled
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "bg-white/10 text-white/40 hover:bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      gyroEnabled ? "bg-white" : "bg-white/30",
                    )}
                  />
                  {t("gyro.label")}
                </button>
              )}
              {renderPrintings()}
              {renderDetail()}
            </div>
            <div onClick={(e) => e.stopPropagation()}>{renderKeywords()}</div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
