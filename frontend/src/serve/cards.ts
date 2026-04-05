import allCardsRaw from "../../../data/3.processed.json";

export type RawCard = (typeof allCardsRaw)[number];
export type AnyRecord = Record<string, unknown>;

export const allCards = allCardsRaw as RawCard[];

/** O(1) card lookup for Query.node */
export const cardById = new Map<string, RawCard>(
  allCards
    .filter((c): c is Extract<RawCard, { id: string }> => "id" in c && !!c.id)
    .map((c) => [c.id, c]),
);

/** O(1) pilot lookup for LinkPilot.pilot resolution, keyed by pilot name. */
export const pilotByName = new Map<string, AnyRecord>(
  allCards
    .filter(
      (c): c is RawCard & { name: string } =>
        c.__typename === "PilotCard" && "name" in c && typeof c.name === "string",
    )
    .map((c) => [(c as AnyRecord)["name"] as string, c as AnyRecord]),
);

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

export function cardSearchTokens(card: AnyRecord): {
  id: string[];
  name: string[];
  description: string[];
  traits: string[];
  links: string[];
} {
  const id: string[] = [];
  const name: string[] = [];
  const description: string[] = [];
  const traits: string[] = [];
  const links: string[] = [];

  if (typeof card["id"] === "string") id.push(card["id"]);
  if (typeof card["name"] === "string") name.push(card["name"]);
  if (Array.isArray(card["description"])) {
    for (const line of card["description"] as unknown[])
      if (typeof line === "string") description.push(line);
  }
  if (Array.isArray(card["trait"])) {
    for (const t of card["trait"] as unknown[])
      if (typeof t === "string") traits.push(t);
  }
  const link = card["link"];
  if (link != null && typeof link === "object") {
    const l = link as AnyRecord;
    if (typeof l["trait"] === "string") links.push(l["trait"] as string);
    if (typeof l["pilotName"] === "string") links.push(l["pilotName"] as string);
  }
  return { id, name, description, traits, links };
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
