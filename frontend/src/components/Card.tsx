import type { CardFragment$key } from "@/__generated__/CardFragment.graphql";
import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { UnitCard } from "./UnitCard";
import { PilotCard } from "./PilotCard";
import { BaseCard } from "./BaseCard";
import { CommandCard } from "./CommandCard";
import { ResourceCard } from "./ResourceCard";
import { CardDescription } from "./CardDescription";
import { COLOR_BORDER50 } from "src/render/color";
import { cn } from "src/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

const Fragment = graphql`
  fragment CardFragment on Card {
    __typename
    ... on UnitCard {
      id
      color {
        value
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
      limit
      blocked
      ...UnitCardFragment
    }
    ... on PilotCard {
      id
      color {
        value
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
      limit
      blocked
      ...PilotCardFragment
    }
    ... on BaseCard {
      id
      color {
        value
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
      limit
      blocked
      ...BaseCardFragment
    }
    ... on CommandCard {
      id
      color {
        value
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
      limit
      blocked
      ...CommandCardFragment
    }
    ... on Resource {
      id
      ...ResourceCardFragment
    }
  }
`;

type Props = {
  cardRef: CardFragment$key;
  showDescription: boolean;
  onAdd?: (cardId: string) => void;
  onRemove?: (cardId: string) => void;
  onOpen?: (cardId: string) => void;
  deckCardCount?: number;
  deckColors?: string[];
  deckFull?: boolean;
};

export function Card({
  cardRef,
  showDescription,
  onAdd,
  onRemove,
  onOpen,
  deckCardCount = 0,
  deckColors,
  deckFull = false,
}: Props) {
  const card = useFragment(Fragment, cardRef);

  const description =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard"
      ? card.description.map((l) => l.tokens as any)
      : [];

  const borderClass =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard"
      ? COLOR_BORDER50[card.color.value]
      : undefined;

  const cardEl = (() => {
    switch (card.__typename) {
      case "UnitCard":
        return <UnitCard unitCardRef={card} onOpen={onOpen} />;
      case "PilotCard":
        return <PilotCard pilotCardRef={card} onOpen={onOpen} />;
      case "BaseCard":
        return <BaseCard baseCardRef={card} onOpen={onOpen} />;
      case "CommandCard":
        return <CommandCard commandCardRef={card} onOpen={onOpen} />;
      case "Resource":
        return <ResourceCard resourceCardRef={card} onOpen={onOpen} />;
      default:
        return null;
    }
  })();

  const isPlayable =
    card.__typename === "UnitCard" ||
    card.__typename === "PilotCard" ||
    card.__typename === "BaseCard" ||
    card.__typename === "CommandCard";

  const cardId = isPlayable ? card.id : undefined;
  const cardLimit = isPlayable ? card.limit : Infinity;
  const blocked = isPlayable ? card.blocked : false;
  const colorBlocked =
    onAdd &&
    isPlayable &&
    deckColors !== undefined &&
    deckColors.length >= 2 &&
    !deckColors.includes(card.color.value);
  const atLimit = blocked || colorBlocked || deckCardCount >= cardLimit;
  const dimmed = onAdd && (deckFull ? deckCardCount === 0 : atLimit);

  return (
    <div className="flex flex-col">
      <div className={cn("relative", dimmed && "opacity-50")}>
        {cardEl}
        {(onAdd || onRemove) && cardId && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-2 z-10 flex items-center gap-2 rounded-full border border-border bg-background/90 backdrop-blur px-2 py-1 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (cardId) onRemove?.(cardId);
              }}
              disabled={!onRemove || deckCardCount <= 0}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <MinusIcon className="size-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
              {deckCardCount}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (cardId) onAdd?.(cardId);
              }}
              disabled={!onAdd || atLimit}
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
        )}
      </div>
      {showDescription && description.length > 0 && (
        <div className={cn("mt-2 rounded-xl bg-black px-3 py-3 text-white border", borderClass)}>
          <CardDescription lines={description} />
        </div>
      )}
    </div>
  );
}
