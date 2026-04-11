import { useTranslation } from "react-i18next";

export type LocalizedString = { [lang: string]: string } & { en: string; ko: string };

/**
 * Returns the localized value for the current language, falling back to ko → en.
 */
export function localize(name: LocalizedString | null | undefined, lang: string): string {
  if (!name) return "";
  return name[lang] ?? name.ko ?? name.en ?? "";
}

/**
 * Hook that returns a bound localize() for the current i18n language.
 * Subscribes to language changes, so components re-render on locale switch.
 */
export function useLocalize() {
  const { i18n } = useTranslation();
  return (name: LocalizedString | null | undefined) => localize(name, i18n.language);
}
