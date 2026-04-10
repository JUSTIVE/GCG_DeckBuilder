import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { computeCoverage } from "@/lib/coverage";
import type { CoveragePackage, CoverageColor, CoverageCard } from "@/lib/coverage";
import { renderPackage } from "@/render/package";
import { COLOR_HEX } from "src/render/color";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function colorLabel(color: string): string {
  return i18n.t(`color.${color}`, { ns: "game", defaultValue: color });
}

function pct(translated: number, total: number): number {
  return total === 0 ? 100 : Math.round((translated / total) * 100);
}

function pctClass(p: number): string {
  return p === 100 ? "text-green-600" : p >= 50 ? "text-yellow-600" : "text-destructive";
}

function barClass(p: number): string {
  return p === 100 ? "bg-green-500" : p >= 50 ? "bg-yellow-500" : "bg-destructive";
}

function ProgressBar({ translated, total, className }: { translated: number; total: number; className?: string }) {
  const p = pct(translated, total);
  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      <div className="hidden sm:block h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0">
        <div className={cn("h-full rounded-full", barClass(p))} style={{ width: `${p}%` }} />
      </div>
      <span className={cn("text-xs tabular-nums font-medium", pctClass(p))}>{p}%</span>
    </div>
  );
}

// ── card row ──────────────────────────────────────────────────────────────────

function CardRow({ card }: { card: CoverageCard }) {
  const [open, setOpen] = useState(false);
  const done = card.translated === card.total;
  const badFields = card.fields.filter((f) => !f.translated);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/50 rounded-md"
      >
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0 border border-black/10"
          style={{ background: COLOR_HEX[card.color ?? ""] ?? "#ccc" }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs truncate">{card.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{card.id}</div>
        </div>
        {done ? (
          <span className="text-xs text-green-600 shrink-0">완료</span>
        ) : (
          <span className="text-xs text-destructive shrink-0">{badFields.length}개</span>
        )}
        <ChevronRightIcon className={cn("size-3 text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="ml-6 mb-1 flex flex-col gap-1.5 pr-2">
          {card.fields.map((f) => {
            const badSet = new Set(f.untranslatedValues ?? []);
            return (
              <div key={f.field} className="text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn("font-medium", f.translated ? "text-green-600" : "text-muted-foreground")}>{f.field}</span>
                  {!f.values && (
                    <span className="text-muted-foreground">{f.detail}</span>
                  )}
                </div>
                {f.values ? (
                  <div className="flex flex-col gap-0.5 ml-2">
                    {f.values.map((v: string, i: number) => (
                      <div key={i} className={cn("break-all", badSet.has(v) ? "text-destructive" : "text-green-600")}>{v}</div>
                    ))}
                  </div>
                ) : (
                  f.untranslatedValues?.map((v: string, i: number) => (
                    <div key={i} className="ml-2 text-destructive break-all">{v}</div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── color section ─────────────────────────────────────────────────────────────

function ColorSection({ color }: { color: CoverageColor }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md text-left"
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
          style={{ background: COLOR_HEX[color.color] ?? "#ccc" }}
        />
        <span className="text-sm font-medium flex-1 min-w-0 truncate">
          {colorLabel(color.color)}
        </span>
        <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">{i18n.t("deck.cardCount", { ns: "common", count: color.cards.length })}</span>
        <ProgressBar translated={color.translated} total={color.total} />
        <ChevronRightIcon className={cn("size-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="ml-3 border-l border-border pl-2 py-1 flex flex-col gap-0.5">
          {color.cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── package section ───────────────────────────────────────────────────────────

function PackageSection({ pkg }: { pkg: CoveragePackage }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 rounded-lg"
      >
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-mono text-xs text-muted-foreground shrink-0">{pkg.package}</span>
          <span className="text-sm font-medium truncate">{renderPackage(pkg.package)}</span>
        </div>
        <ProgressBar translated={pkg.translated} total={pkg.total} />
        <ChevronRightIcon className={cn("size-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 flex flex-col gap-0.5">
          {pkg.colors.map((color) => (
            <ColorSection key={color.color} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function InfoPage() {
  const { t } = useTranslation("common");
  const coverage = useMemo(() => computeCoverage(), []);
  const overall = pct(coverage.translated, coverage.total);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-lg font-bold mb-3">{t("nav.translationCoverage")}</h1>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barClass(overall))}
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>
          <span className={cn("text-sm font-semibold tabular-nums shrink-0", pctClass(overall))}>
            {overall}%
          </span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {coverage.translated}/{coverage.total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {coverage.packages.map((pkg) => (
          <PackageSection key={pkg.package} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
