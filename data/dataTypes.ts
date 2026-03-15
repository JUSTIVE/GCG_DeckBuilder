import type z from "zod";
import type {
  CardColorSchema,
  CardKeywordSchema,
  CardPackageSchema,
  CardRaritySchema,
  CardTraitSchema,
  GundamSeriesSchema,
  ZoneSchema,
} from "./validator";

export type CardTrait = z.infer<typeof CardTraitSchema>;
export type CardColor = z.infer<typeof CardColorSchema>;
export type GundamSeries = z.infer<typeof GundamSeriesSchema>;
export type CardKeyword = z.infer<typeof CardKeywordSchema>;
export type CardRarity = z.infer<typeof CardRaritySchema>;

export type Zone = z.infer<typeof ZoneSchema>;
export type CardPackage = z.infer<typeof CardPackageSchema>;

export type LinkTrait = {
  trait: CardTrait;
};

export type LinkPilot = {
  pilot: string;
};

export type UnitLink = LinkTrait | LinkPilot;

export type PilotCard = {
  __typename: "PilotCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  package: CardPackage;
  keywords: CardKeyword[];
  AP: number;
  HP: number;
  description: string[];
};

export type UnitCard = {
  __typename: "UnitCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  package: CardPackage;
  keywords: CardKeyword[];
  zone: Zone[];
  AP: number;
  HP: number;
  links: UnitLink[];
  trait: CardTrait[];
  description: string[];
};

export type BaseCard = {
  __typename: "BaseCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  package: CardPackage;
  keywords: CardKeyword[];
  zone: Zone[];
  AP: number;
  HP: number;
  description: string[];
};

export type CommandCard = {
  __typename: "CommandCard";
  id: string;
  name: string;
  level: number;
  cost: number;
  series: GundamSeries;
  color: CardColor;
  rarity: CardRarity;
  package: CardPackage;
  description: string[];
  keywords: CardKeyword[];
};

export type ResourceCard = {
  __typename: "ResourceCard";
  id: string;
};
export type Card = ResourceCard | BaseCard | UnitCard | PilotCard | CommandCard;
