import allCardsRaw from "../../../data/3.processed.json";
import { checkCard } from "../../../data/coverage/coverageCore";
import type { FieldResult } from "../../../data/coverage/coverageCore";
export type { FieldResult } from "../../../data/coverage/coverageCore";

export type CoverageCard = {
  id: string;
  name?: string;
  color?: string;
  fields: FieldResult[];
  translated: number;
  total: number;
};

export type CoverageColor = {
  color: string;
  cards: CoverageCard[];
  translated: number;
  total: number;
};

export type CoveragePackage = {
  package: string;
  colors: CoverageColor[];
  translated: number;
  total: number;
};

export type CoverageData = {
  packages: CoveragePackage[];
  translated: number;
  total: number;
};

// ── compute ───────────────────────────────────────────────────────────────────

const COLOR_ORDER = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "WHITE"];
const CARD_TYPES = new Set(["UnitCard", "BaseCard", "PilotCard", "CommandCard"]);

let cached: CoverageData | null = null;

export function computeCoverage(): CoverageData {
  if (cached) return cached;

  const cards = (allCardsRaw as any[]).filter((c) => CARD_TYPES.has(c.__typename));

  const byPackage = new Map<string, any[]>();
  for (const card of cards) {
    const pkg = (card.package as string) || "UNKNOWN";
    if (!byPackage.has(pkg)) byPackage.set(pkg, []);
    byPackage.get(pkg)!.push(card);
  }

  const packages: CoveragePackage[] = [];
  let grandTotal = 0;
  let grandTranslated = 0;

  for (const [pkg, pkgCards] of [...byPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const byColor = new Map<string, any[]>();
    for (const card of pkgCards) {
      const color = (card.color as string) ?? "UNKNOWN";
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color)!.push(card);
    }

    const orderedColors = [
      ...COLOR_ORDER.filter((c) => byColor.has(c)),
      ...Array.from(byColor.keys()).filter((c) => !COLOR_ORDER.includes(c)).sort(),
    ];

    const colors: CoverageColor[] = [];
    let pkgTotal = 0;
    let pkgTranslated = 0;

    for (const color of orderedColors) {
      const colorCards = byColor.get(color)!.slice().sort((a: any, b: any) => a.id.localeCompare(b.id));
      let colorTotal = 0;
      let colorTranslated = 0;
      const coverageCards: CoverageCard[] = [];

      for (const card of colorCards) {
        const fields = checkCard(card);
        const t = fields.filter((f) => f.translated).length;
        colorTotal += fields.length;
        colorTranslated += t;
        coverageCards.push({ id: card.id, name: card.name ?? card.pilot?.name, color: card.color, fields, translated: t, total: fields.length });
      }

      colors.push({ color, cards: coverageCards, translated: colorTranslated, total: colorTotal });
      pkgTotal += colorTotal;
      pkgTranslated += colorTranslated;
    }

    packages.push({ package: pkg, colors, translated: pkgTranslated, total: pkgTotal });
    grandTotal += pkgTotal;
    grandTranslated += pkgTranslated;
  }

  cached = { packages, translated: grandTranslated, total: grandTotal };
  return cached;
}
