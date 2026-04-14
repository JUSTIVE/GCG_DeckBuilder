import allCardsRaw from "../../../data/3.processed.json";
import koGame from "../locales/ko/game.json";

const KO_KEYWORDS: Record<string, string> = koGame.keyword;
const KO_SERIES: Record<string, string> = koGame.series;

export type RawCard = (typeof allCardsRaw)[number];
export type AnyRecord = Record<string, unknown>;

export const allCards = allCardsRaw as RawCard[];

/** O(1) card lookup for Query.node */
export const cardById = new Map<string, RawCard>(
  allCards
    .filter((c): c is Extract<RawCard, { id: string }> => "id" in c && !!c.id)
    .map((c) => [c.id, c]),
);

/** O(1) pilot lookup for LinkPilot.pilot resolution, keyed by Korean pilot name. */
export const pilotByName = new Map<string, AnyRecord>(
  allCards
    .filter((c) => c.__typename === "PilotCard" && "name" in c)
    .map((c) => {
      const name = (c as AnyRecord)["name"];
      const key =
        typeof name === "object" && name !== null ? (name as { ko: string }).ko : (name as string);
      return [key, c as AnyRecord];
    }),
);

// ─── CardGrouping factories ───────────────────────────────────────────────────

export const traitId = (v: string) => btoa(`Trait:${v}`);
export const keywordId = (v: string) => btoa(`Keyword:${v}`);
export const colorId = (v: string) => btoa(`Color:${v}`);
export const seriesId = (v: string) => btoa(`Series:${v}`);

export const makeTrait = (v: string) => ({ __typename: "Trait", id: traitId(v), value: v });
export const makeKeyword = (v: string) => ({ __typename: "Keyword", id: keywordId(v), value: v });
export const makeColor = (v: string) => ({ __typename: "Color", id: colorId(v), value: v });
export const makeSeries = (v: string) => ({ __typename: "Series", id: seriesId(v), value: v });

// ─── FZF-style search ─────────────────────────────────────────────────────────

export function fzfScore(pattern: string, target: string): number {
  if (!pattern) return 0;
  const p = pattern.toLowerCase();
  const t = target.toLowerCase();
  let score = 0;
  let pi = 0;
  let consecutive = 0;
  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) {
      pi++;
      consecutive++;
      score += consecutive * 2;
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "_") score += 3;
    } else {
      consecutive = 0;
    }
  }
  return pi === p.length ? score : -1;
}

export function bestFzfScore(pattern: string, targets: string[]): number {
  return targets.reduce<number>((best, t) => {
    const s = fzfScore(pattern, t);
    return s > best ? s : best;
  }, -1);
}

/**
 * Structured token score — for keywords and series where exact/contains
 * matching is more meaningful than fuzzy subsequence matching.
 * Exact match → 500, target contains full pattern → fzf+50, otherwise fzf.
 */
export function bestExactScore(pattern: string, targets: string[]): number {
  const p = pattern.toLowerCase().trim();
  let best = -1;
  for (const t of targets) {
    const tl = t.toLowerCase();
    if (tl === p) return 500;
    if (tl.includes(p)) {
      best = Math.max(best, fzfScore(pattern, t) + 50);
      continue;
    }
    const s = fzfScore(pattern, t);
    if (s >= 0) best = Math.max(best, s);
  }
  return best;
}

export function cardSearchTokens(card: AnyRecord): {
  id: string[];
  name: string[];
  description: string[];
  traits: string[];
  links: string[];
  keywords: string[];
  series: string[];
} {
  const id: string[] = [];
  const name: string[] = [];
  const description: string[] = [];
  const traits: string[] = [];
  const links: string[] = [];
  const keywords: string[] = [];
  const series: string[] = [];

  if (typeof card["id"] === "string") id.push(card["id"]);
  const rawName = card["name"];
  if (typeof rawName === "string") {
    name.push(rawName);
  } else if (rawName !== null && typeof rawName === "object") {
    const n = rawName as { en?: string; ko?: string };
    if (n.en) name.push(n.en);
    if (n.ko) name.push(n.ko);
  }
  if (Array.isArray(card["description"])) {
    for (const line of card["description"] as Array<
      Array<{ type: string; en?: string; ko?: string }>
    >) {
      if (!Array.isArray(line)) continue;
      const ko = line
        .filter((t) => t.type === "prose" && t.ko)
        .map((t) => t.ko!)
        .join(" ");
      if (ko) description.push(ko);
      const en = line
        .filter((t) => t.type === "prose" && t.en)
        .map((t) => t.en!)
        .join(" ");
      if (en) description.push(en);
    }
  }
  if (Array.isArray(card["trait"])) {
    for (const t of card["trait"] as unknown[]) if (typeof t === "string") traits.push(t);
  }
  const link = card["link"];
  if (link != null && typeof link === "object") {
    const l = link as AnyRecord;
    if (typeof l["trait"] === "string") links.push(l["trait"] as string);
    const rawPilotName = l["pilotName"];
    if (typeof rawPilotName === "string") {
      links.push(rawPilotName);
    } else if (rawPilotName !== null && typeof rawPilotName === "object") {
      const pn = rawPilotName as { en?: string; ko?: string };
      if (pn.en) links.push(pn.en);
      if (pn.ko) links.push(pn.ko);
    }
  }
  if (Array.isArray(card["keywords"])) {
    for (const kw of card["keywords"] as unknown[]) {
      if (typeof kw !== "string") continue;
      keywords.push(kw);
      const ko = KO_KEYWORDS[kw];
      if (ko) keywords.push(ko);
    }
  }
  const rawSeries = card["series"];
  if (typeof rawSeries === "string") {
    series.push(rawSeries);
    const ko = KO_SERIES[rawSeries];
    if (ko) series.push(ko);
  }
  return { id, name, description, traits, links, keywords, series };
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

export const encodeCursor = (index: number): string => btoa(`cursor:${index}`);

export function decodeCursor(cursor: string): number {
  try {
    const match = atob(cursor).match(/^cursor:(\d+)$/);
    if (match?.[1]) return parseInt(match[1], 10);
  } catch {
    /* ignore malformed cursors */
  }
  return -1;
}
