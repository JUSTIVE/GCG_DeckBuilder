import type z from "zod";
import type {
  BaseCardSchema,
  CardColorSchema,
  CardKeywordSchema,
  CardPackageSchema,
  CardSchema,
  CardTraitSchema,
  CommandCardSchema,
  GundamSeriesSchema,
  LinkPilotSchema,
  LinkTraitSchema,
  PilotCardSchema,
  ResourceSchema,
  UnitCardSchema,
  UnitLinkSchema,
  ZoneSchema,
  PlayableCardSchema,
} from "./1.validator";

export type CardTrait = z.infer<typeof CardTraitSchema>;
export type CardColor = z.infer<typeof CardColorSchema>;
export type GundamSeries = z.infer<typeof GundamSeriesSchema>;
export type CardKeyword = z.infer<typeof CardKeywordSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type CardPackage = z.infer<typeof CardPackageSchema>;
export type LinkTrait = z.infer<typeof LinkTraitSchema>;
export type LinkPilot = z.infer<typeof LinkPilotSchema>;
export type UnitLink = z.infer<typeof UnitLinkSchema>;
export type PilotCard = z.infer<typeof PilotCardSchema>;
export type UnitCard = z.infer<typeof UnitCardSchema>;
export type BaseCard = z.infer<typeof BaseCardSchema>;
export type CommandCard = z.infer<typeof CommandCardSchema>;
export type ResourceCard = z.infer<typeof ResourceSchema>;
export type Card = z.infer<typeof CardSchema>;
export type PlayableCard = z.infer<typeof PlayableCardSchema>;
