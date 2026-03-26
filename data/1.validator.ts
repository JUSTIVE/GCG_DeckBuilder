import { z } from "zod";
import raw from "./raw.json";
/* ENUMS */

export const CardColorSchema = z.enum(["BLUE", "GREEN", "RED", "YELLOW", "PURPLE", "WHITE"]);

export const ZoneSchema = z.enum(["SPACE", "EARTH"]);

export const CardKeywordSchema = z.enum([
  "ACTION",
  "ACTIVATE_ACTION",
  "ACTIVATE_MAIN",
  "ATTACK",
  "BLOCKER",
  "BREACH",
  "BURST",
  "SUPPRESSION",
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

export const CardRaritySchema = z.enum([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "LEGENDARY_RARE",
  "COMMON_PLUS",
  "UNCOMMON_PLUS",
  "RARE_PLUS",
  "LEGENDARY_RARE_PLUS",
  "COMMON_PLUS_PLUS",
  "LEGENDARY_RARE_PLUS_PLUS",
  "P",
]);

export const CardPackageSchema = z.enum([
  "GD01",
  "GD02",
  "GD03",
  "ST01",
  "ST02",
  "ST03",
  "ST04",
  "ST05",
  "ST06",
  "ST07",
  "ST08",
  "ST09",
  "OTHER_PRODUCT_CARD",
  "EDITION_BETA",
  "BASIC_CARDS",
  "PROMOTION_CARD",
]);

export const CardTraitSchema = z.enum([
  "ACADEMY",
  "OZ",
  "NEO_ZEON",
  "ZEON",
  "EARTH_ALLIANCE",
  "EARTH_FEDERATION",
  "MAGANAC_CORPS",
  "ZAFT",
  "OPERATION_METEOR",
  "NEWTYPE",
  "COORDINATOR",
  "CYBER_NEWTYPE",
  "STRONGHOLD",
  "WARSHIP",
  "TRIPLE_SHIP_ALLIANCE",
  "CIVILIAN",
  "WHITE_BASE_TEAM",
  "G_TEAM",
  "VANADIS_INSTITUTE",
  "ORB",
  "TEKKADAN",
  "TEIWAZ",
  "GJALLARHORN",
  "GUNDAM_FRAME",
  "ALAYA_VIJNANA",
  "TITANS",
  "VULTURE",
  "AEUG",
  "CLAN",
  "AGE_SYSTEM",
  "WHITE_FANG",
  "SIDE_6",
  "NEW_UNE",
  "UE",
  "VAGAN",
  "BIOLOGICAL_CPU",
  "ASUNO_FAMILY",
  "X_ROUNDER",
  "SUPERPOWER_BLOC",
  "CB",
  "INNOVADE",
  "GN_DRIVE",
  "SUPER_SOLDIER",
  "MAFTY",
  "SRA",
  "OLD_UNE",
  "JUPITRIS",
  "CYCLOPS_TEAM",
  "UN",
  "MINERVA_SQUAD",
]);

export const GundamSeriesSchema = z.enum([
  "MOBILE_SUIT_GUNDAM",
  "MOBILE_SUIT_Z_GUNDAM",
  "MOBILE_SUIT_GUNDAM_CHARS_COUNTERATTACK",
  "MOBILE_SUIT_GUNDAM_0080_WAR_IN_THE_POCKET",
  "MOBILE_SUIT_GUNDAM_WING",
  "AFTER_WAR_GUNDAM_X",
  "MOBILE_SUIT_GUNDAM_SEED",
  "MOBILE_SUIT_GUNDAM_SEED_DESTINY",
  "MOBILE_SUIT_GUNDAM_00",
  "MOBILE_SUIT_GUNDAM_UNICORN",
  "MOBILE_SUIT_GUNDAM_AGE",
  "MOBILE_SUIT_GUNDAM_IRON_BLOODED_ORPHANS",
  "MOBILE_SUIT_GUNDAM_HATHAWAYS_FLASH",
  "MOBILE_SUIT_GUNDAM_THE_WITCH_FROM_MERCURY",
  "MOBILE_SUIT_GUNDAM_GQUUUUUUX",
]);

export const CardKindSchema = z.enum(["RESOURCE", "BASE", "UNIT", "PILOT", "COMMAND"]);

/* BASE INTERFACES */

export const NodeSchema = z.object({
  id: z.string(),
});

export const PlayableCardSchema = z.object({
  level: z.number().int().catch(0),
  cost: z.number().int().catch(0),
  name: z.string(),
  series: GundamSeriesSchema,
  color: CardColorSchema,
  package: CardPackageSchema,
  keywords: z.array(CardKeywordSchema),
  trait: z.array(CardTraitSchema),
  description: z.array(z.string()),
  rarity: CardRaritySchema.optional(),
});

/* UNIT LINK */

export const LinkTraitSchema = z.object({
  __typename: z.literal("LinkTrait"),
  trait: CardTraitSchema,
});

export const LinkPilotSchema = z.object({
  __typename: z.literal("LinkPilot"),
  pilotName: z.string(),
});

export const UnitLinkSchema = z.discriminatedUnion("__typename", [
  LinkTraitSchema,
  LinkPilotSchema,
]);

/* UNIT */

export const UnitCardSchema = NodeSchema.merge(
  PlayableCardSchema.safeExtend({
    __typename: z.literal("UnitCard"),
    zone: z.array(ZoneSchema),
    AP: z.number().int().catch(0),
    HP: z.number().int().catch(0),
    link: UnitLinkSchema.optional(),
  }),
);

/* BASE */

export const BaseCardSchema = NodeSchema.merge(
  PlayableCardSchema.safeExtend({
    __typename: z.literal("BaseCard"),
    AP: z.number().int().catch(0),
    HP: z.number().int().catch(0),
    zone: z.array(ZoneSchema),
  }),
);

/* COMMAND */

export const CommandCardSchema = NodeSchema.merge(
  PlayableCardSchema.safeExtend({
    __typename: z.literal("CommandCard"),
    pilot: z
      .object({
        name: z.string(),
        AP: z.number().int().catch(0),
        HP: z.number().int().catch(0),
      })
      .optional(),
  }),
);

/* PILOT */
export const PilotCardSchema = NodeSchema.merge(
  PlayableCardSchema.extend({
    __typename: z.literal("PilotCard"),
    AP: z.number().int().catch(0),
    HP: z.number().int().catch(0),
  }),
);

/* RESOURCE */

export const ResourceSchema = NodeSchema.safeExtend({
  __typename: z.literal("ResourceCard"),
  name: z.string(),
});

/* UNION CARD */

export const CardSchema = z.discriminatedUnion("__typename", [
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
  package: CardPackageSchema.optional(),
  rarity: CardRaritySchema.optional(),
  keyword: z.array(CardKeywordSchema).optional(),
  zone: z.array(ZoneSchema).optional(),
  query: z.string().optional(),
  kind: CardKindSchema,
});

raw.forEach((item) => {
  try {
    const res = CardSchema.parse(item);
    // console.log(res);
  } catch (e) {
    console.log(`${item.id} failed`, e);
  }
});
