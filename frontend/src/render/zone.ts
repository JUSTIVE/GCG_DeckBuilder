import i18n from "@/i18n";

export const renderZone = (zone: string): string =>
  i18n.t(`zone.${zone}`, { ns: "game", defaultValue: zone });
