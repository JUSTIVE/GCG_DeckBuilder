import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enGame from "./locales/en/game.json";
import enCommon from "./locales/en/common.json";
import enFilters from "./locales/en/filters.json";
import enRules from "./locales/en/rules.json";

import koGame from "./locales/ko/game.json";
import koCommon from "./locales/ko/common.json";
import koFilters from "./locales/ko/filters.json";
import koRules from "./locales/ko/rules.json";

import jaGame from "./locales/ja/game.json";
import jaCommon from "./locales/ja/common.json";
import jaFilters from "./locales/ja/filters.json";
import jaRules from "./locales/ja/rules.json";

// URL segment → i18next locale. "jp" in URL maps to "ja" internally.
export const LOCALE_MAP = { ko: "ko", en: "en", jp: "ja" } as const;
export type UrlLocale = keyof typeof LOCALE_MAP;
export const URL_LOCALES = Object.keys(LOCALE_MAP) as UrlLocale[];
export const DEFAULT_LOCALE: UrlLocale = "ko";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { game: enGame, common: enCommon, filters: enFilters, rules: enRules },
      ko: { game: koGame, common: koCommon, filters: koFilters, rules: koRules },
      ja: { game: jaGame, common: jaCommon, filters: jaFilters, rules: jaRules },
    },
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "game", "filters", "rules"],
    interpolation: { escapeValue: false },
    detection: {
      // URL locale param takes precedence; localStorage as persistent cache
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18n-locale",
    },
  });

export default i18n;
