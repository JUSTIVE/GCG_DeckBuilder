import i18n from "@/i18n";

export const renderTrait = (trait: string): string =>
  i18n.t(`trait.${trait}`, { ns: "game", defaultValue: trait });
