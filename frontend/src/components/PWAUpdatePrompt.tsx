import { useRegisterSW } from "virtual:pwa-register/react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { RefreshCwIcon, XIcon } from "lucide-react";

export function PWAUpdatePrompt() {
  const { t } = useTranslation("common");
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      // Periodically check for a new SW (every 30 min) so long-lived PWAs
      // pick up updates without needing a tab close/reopen.
      if (reg) {
        setInterval(
          () => {
            reg.update().catch(() => {});
          },
          30 * 60 * 1000,
        );
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50",
        // Sit above iOS PWA home indicator safe area.
        "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        "flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg",
      )}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm pl-1">{t("pwa.updateAvailable")}</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold hover:brightness-110 cursor-pointer"
      >
        <RefreshCwIcon className="size-3.5" />
        {t("pwa.update")}
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label={t("action.close")}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent cursor-pointer"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
