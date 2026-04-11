/**
 * Single source of truth for all game enum values and their TypeScript types.
 *
 * Add/remove values here — route validation, filters, and card parsers all
 * derive from these arrays automatically.
 */

export const ALL_KEYWORDS = [
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
  "SUPPRESSION",
  "MAIN",
  "ONCE_PER_TURN",
  "PILOT",
  "REPAIR",
  "SUPPORT",
  "WHEN_LINKED",
  "WHEN_PAIRED",
] as const;

export const ALL_KINDS = ["UNIT", "PILOT", "BASE", "COMMAND"] as const;
export const ALL_ZONES = ["SPACE", "EARTH"] as const;
export const ALL_COLORS = ["BLUE", "GREEN", "RED", "YELLOW", "PURPLE", "WHITE"] as const;

export const ALL_TRAITS = [
  "EARTH_FEDERATION",
  "ZEON",
  "NEO_ZEON",
  "OZ",
  "ACADEMY",
  "EARTH_ALLIANCE",
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
] as const;

export const ALL_PACKAGES = [
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
] as const;

export const ALL_SERIES = [
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
] as const;

export const ALL_SORTS = [
  "NAME_ASC",
  "NAME_DESC",
  "COST_ASC",
  "COST_DESC",
  "LEVEL_ASC",
  "LEVEL_DESC",
  "AP_ASC",
  "AP_DESC",
  "HP_ASC",
  "HP_DESC",
] as const;

export type CardKeyword = (typeof ALL_KEYWORDS)[number];
export type CardTrait = (typeof ALL_TRAITS)[number];
export type CardSeries = (typeof ALL_SERIES)[number];

/**
 * Keyword display categories.
 * Triggers = colored text chips; Abilities = hex chips.
 * Used by CardDescription to parse Korean card text → keyword enum.
 */
export const TRIGGER_KEYWORD_SET = new Set<CardKeyword>([
  "ACTIVATE_MAIN",
  "ACTIVATE_ACTION",
  "MAIN",
  "ACTION",
  "BURST",
  "ATTACK",
  "DEPLOY",
  "DESTROYED",
  "WHEN_LINKED",
  "DURING_LINK",
  "WHEN_PAIRED",
  "DURING_PAIR",
  "PILOT",
  "ONCE_PER_TURN",
]);

export const ABILITY_KEYWORD_SET = new Set<CardKeyword>([
  "BLOCKER",
  "HIGH_MANEUVER",
  "FIRST_STRIKE",
  "SUPPRESSION",
  "BREACH",
  "REPAIR",
  "SUPPORT",
]);
