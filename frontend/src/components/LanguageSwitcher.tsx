import { Link, useParams, useRouterState } from "@tanstack/react-router";
import type { UrlLocale } from "@/i18n";

const LABELS: Record<UrlLocale, string> = {
  ko: "한",
  en: "EN",
  jp: "JP",
};

const VISIBLE_LOCALES: UrlLocale[] = ["ko", "en"];

export function LanguageSwitcher() {
  const { locale = "ko" } = useParams({ strict: false });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function buildPath(nextLocale: UrlLocale) {
    // Replace /ko/... → /en/...
    return pathname.replace(/^\/(ko|en|jp)/, `/${nextLocale}`) as any;
  }

  return (
    <div className="flex items-center gap-0.5">
      {VISIBLE_LOCALES.map((loc) => (
        <Link
          key={loc}
          to={buildPath(loc)}
          className={
            locale === loc
              ? "px-2 py-1 text-xs font-bold text-foreground"
              : "px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          }
        >
          {LABELS[loc]}
        </Link>
      ))}
    </div>
  );
}
