type CardTrait =
  | "ACADEMY"
  | "OZ"
  | "NEO_ZEON"
  | "ZEON"
  | "EARTH_ALLIANCE"
  | "EARTH_FEDERATION"
  | "MAGANAC_CORPS"
  | "ZAFT"
  | "OPERATION_METEOR"
  | "NEWTYPE"
  | "COORDINATOR"
  | "CYBER_NEWTYPE"
  | "STRONGHOLD"
  | "WARSHIP"
  | "TRIPLE_SHIP_ALLIANCE"
  | "CIVILIAN"
  | "WHITE_BASE_TEAM"
  | "G_TEAM"
  | "VANADIS_INSTITUTE"
  | "ORB"
  | "TEKKADAN"
  | "TEIWAZ"
  | "GJALLARHORN"
  | "GUNDAM_FRAME"
  | "ALAYA_VIJNANA"
  | "TITANS"
  | "VULTURE"
  | "AEUG"
  | "CLAN"
  | "AGE_SYSTEM"
  | "WHITE_FANG"
  | "SIDE_6"
  | "NEW_UNE"
  | "UE"
  | "VAGAN"
  | "BIOLOGICAL_CPU"
  | "ASUNO_FAMILY"
  | "X_ROUNDER"
  | "SUPERPOWER_BLOC"
  | "CB"
  | "INNOVADE"
  | "GN_DRIVE"
  | "SUPER_SOLDIER"
  | "MAFTY"
  | "SRA"
  | "OLD_UNE"
  | "JUPITRIS"
  | "CYCLOPS_TEAM"
  | "UN"
  | "MINERVA_SQUAD";

type CardColor = "BLUE" | "GREEN" | "RED" | "YELLOW" | "PURPLE";

type GundamSeries =
  | "MOBILE_SUIT_GUNDAM"
  | "MOBILE_SUIT_Z_GUNDAM"
  | "MOBILE_SUIT_GUNDAM_CHARS_COUNTERATTACK"
  | "MOBILE_SUIT_GUNDAM_0080_WAR_IN_THE_POCKET"
  | "MOBILE_SUIT_GUNDAM_WING"
  | "AFTER_WAR_GUNDAM_X"
  | "MOBILE_SUIT_GUNDAM_SEED"
  | "MOBILE_SUIT_GUNDAM_SEED_DESTINY"
  | "MOBILE_SUIT_GUNDAM_00"
  | "MOBILE_SUIT_GUNDAM_UNICORN"
  | "MOBILE_SUIT_GUNDAM_AGE"
  | "MOBILE_SUIT_GUNDAM_IRON_BLOODED_ORPHANS"
  | "MOBILE_SUIT_GUNDAM_HATHAWAYS_FLASH"
  | "MOBILE_SUIT_GUNDAM_THE_WITCH_FROM_MERCURY"
  | "MOBILE_SUIT_GUNDAM_GQUUUUUUX";

type CardKeyword =
  | "ACTION"
  | "ACTIVATE_ACTION"
  | "ACTIVATE_MAIN"
  | "ATTACK"
  | "BLOCKER"
  | "BREACH"
  | "BURST"
  | "DEPLOY"
  | "DESTROYED"
  | "DURING_LINK"
  | "DURING_PAIR"
  | "FIRST_STRIKE"
  | "HIGH_MANEUVER"
  | "MAIN"
  | "ONCE_PER_TURN"
  | "PILOT"
  | "REPAIR"
  | "SUPPORT"
  | "WHEN_LINKED"
  | "WHEN_PAIRED";

type CardRarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY_RARE" | "P";

type Zone = "SPACE" | "EARTH";
type CardPackage =
  | "GD01"
  | "GD02"
  | "GD03"
  | "ST01"
  | "ST02"
  | "ST03"
  | "ST04"
  | "ST05"
  | "ST06"
  | "ST07"
  | "ST08"
  | "ST09"
  | "OTHER_PRODUCT_CARD"
  | "EDITION_BETA"
  | "BASIC_CARDS"
  | "PROMOTION_CARD";

type LinkTrait = {
  trait: CardTrait;
};

type LinkPilot = {
  pilot: string;
};

type UnitLink = LinkTrait | LinkPilot;

type PilotCard = {
  __typename: "PilotCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  pack: CardPackage;
  keywords: CardKeyword[];
  AP: number;
  HP: number;
  description: string[];
};

type UnitCard = {
  __typename: "UnitCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  pack: CardPackage;
  keywords: CardKeyword[];
  zone: Zone[];
  AP: number;
  HP: number;
  links: UnitLink[];
  trait: CardTrait[];
  description: string[];
};

type BaseCard = {
  __typename: "BaseCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  pack: CardPackage;
  keywords: CardKeyword[];
  zone: Zone[];
  AP: number;
  HP: number;
  description: string[];
};

type CommandCard = {
  __typename: "CommandCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  pack: CardPackage;
  description: string[];
  keywords: CardKeyword[];
};

type ResourceCard = {
  id: string;
};
export type Card = ResourceCard | BaseCard | UnitCard | PilotCard | CommandCard;
