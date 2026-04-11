import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import i18n, { LOCALE_MAP, URL_LOCALES, DEFAULT_LOCALE, type UrlLocale } from "@/i18n";

export const Route = createFileRoute("/$locale")({
  params: {
    parse: ({ locale }) => ({ locale: locale as UrlLocale }),
    stringify: ({ locale }) => ({ locale }),
  },
  beforeLoad: ({ params }) => {
    if (!URL_LOCALES.includes(params.locale as UrlLocale)) {
      throw redirect({ to: "/$locale", params: { locale: DEFAULT_LOCALE }, replace: true });
    }
    const i18nLocale = LOCALE_MAP[params.locale as UrlLocale];
    if (i18nLocale && i18n.language !== i18nLocale) {
      i18n.changeLanguage(i18nLocale);
    }
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  return <Outlet />;
}
