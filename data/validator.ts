import { z } from "zod";

/* ENUMS */

export const CardColorSchema = z.enum(["BLUE", "GREEN", "RED", "YELLOW", "PURPLE"]);

export const ZoneSchema = z.enum(["SPACE", "EARTH"]);

export const CardRaritySchema = z.enum(["COMMON", "UNCOMMON", "RARE", "LEGENDARY_RARE", "P"]);

export const CardKeywordSchema = z.enum([
  "ACTION",
  "ACTIVATE_ACTION",
  "ACTIVATE_MAIN",
  "ATTACK",
  "BLOCKER",
  "BREACH",
  "BURST",
  "DEPLOY",
  "DESTROYED",
  "DURING_LINK",
  "DURING_PAIR",
  "FIRST_STRIKE",
  "HIGH_MANEUVER",
  "MAIN",
  "ONCE_PER_TURN",
  "END_OF_TURN",
  "PILOT",
  "REPAIR",
  "SUPPORT",
  "WHEN_LINKED",
  "WHEN_PAIRED",
]);

export const CardKindSchema = z.enum(["RESOURCE", "BASE", "UNIT", "PILOT", "COMMAND"]);

/* BASE INTERFACES */

export const NodeSchema = z.object({
  id: z.string(),
});

export const PlayableCardSchema = z.object({
  level: z.number().int(),
  cost: z.number().int(),
  name: z.string(),
  series: z.string(),
  color: CardColorSchema,
  rarity: CardRaritySchema,
  pack: z.string(),
  keywords: z.array(CardKeywordSchema),
});

/* PILOT */

export const PilotCardSchema = NodeSchema.merge(
  PlayableCardSchema.extend({
    AP: z.number().int(),
    HP: z.number().int(),
    description: z.array(z.string()),
  }),
);

/* UNIT LINK */

export const LinkTraitSchema = z.object({
  trait: z.string(),
});

export const LinkPilotSchema = z.object({
  pilot: z.lazy(() => PilotCardSchema),
});

export const UnitLinkSchema = z.union([LinkTraitSchema, LinkPilotSchema]);

/* UNIT */

export const UnitCardSchema = NodeSchema.merge(
  PlayableCardSchema.extend({
    zone: z.array(ZoneSchema),
    AP: z.number().int(),
    HP: z.number().int(),
    links: z.array(UnitLinkSchema),
    description: z.array(z.string()),
  }),
);

/* BASE */

export const BaseCardSchema = NodeSchema.merge(
  PlayableCardSchema.extend({
    AP: z.number().int(),
    HP: z.number().int(),
    zone: z.array(ZoneSchema),
    description: z.array(z.string()),
  }),
);

/* COMMAND */

export const CommandCardSchema = NodeSchema.merge(
  PlayableCardSchema.partial({
    color: true,
    rarity: true,
    pack: true,
    keywords: true,
  }),
);

/* RESOURCE */

export const ResourceSchema = NodeSchema.extend({
  name: z.string(),
});

/* UNION CARD */

export const CardSchema = z.union([
  ResourceSchema,
  BaseCardSchema,
  UnitCardSchema,
  PilotCardSchema,
  CommandCardSchema,
]);

/* PAGE INFO */

export const PageInfoSchema = z.object({
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
  startCursor: z.string().nullable(),
  endCursor: z.string().nullable(),
});

/* CONNECTION */

export const CardEdgeSchema = z.object({
  cursor: z.string(),
  node: CardSchema,
});

export const CardConnectionSchema = z.object({
  totalCount: z.number().int(),
  edges: z.array(CardEdgeSchema),
  pageInfo: PageInfoSchema,
});

/* FILTER */

export const CardFilterInputSchema = z.object({
  level: z.array(z.number().int()).optional(),
  cost: z.array(z.number().int()).optional(),
  pack: z.string().optional(),
  rarity: CardRaritySchema.optional(),
  keyword: z.array(CardKeywordSchema).optional(),
  zone: z.array(ZoneSchema).optional(),
  query: z.string().optional(),
  kind: CardKindSchema,
});
