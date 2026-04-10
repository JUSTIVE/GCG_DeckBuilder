import i18n from "@/i18n";

export const renderKeyword = (keyword: string): string =>
  i18n.t(`keyword.${keyword}`, { ns: "game", defaultValue: keyword });
