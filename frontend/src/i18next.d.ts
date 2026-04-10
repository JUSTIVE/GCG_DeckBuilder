import type enGame from "./locales/en/game.json";
import type enCommon from "./locales/en/common.json";
import type enFilters from "./locales/en/filters.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      game: typeof enGame;
      common: typeof enCommon;
      filters: typeof enFilters;
    };
  }
}
