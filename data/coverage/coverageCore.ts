import exacts from "./exacts.json";

// ── types ─────────────────────────────────────────────────────────────────────

export type LinkPilot = { __typename: "LinkPilot"; pilotName: { en: string; ko: string } | string };
export type LinkTrait = { __typename: "LinkTrait"; trait: string };

type DescriptionToken =
  | { type: "trigger"; keyword: string; qualifier?: { en: string; ko: string } }
  | { type: "ability"; keyword: string; n?: number }
  | { type: "prose"; en: string; ko: string };

type DescriptionLine = DescriptionToken[];

export type Card = {
  __typename: string;
  id: string;
  name?: string | { en: string; ko: string };
  description?: DescriptionLine[];
  link?: LinkPilot | LinkTrait;
  [key: string]: unknown;
};

export type FieldResult = {
  field: string;
  translated: boolean;
  detail?: string;
  values?: string[];          // all values (used for multi-line fields like description)
  untranslatedValues?: string[];
};

// ── translation detection ─────────────────────────────────────────────────────

const EN_REGEX = /[a-zA-Z]/;

function removeShortEnglishInParens(str: string): string {
  return str.replace(/\([A-Za-z]{2,4}\)/g, "");
}

export function isTranslated(value: string): boolean {
  return (
    (value !== "" &&
      !EN_REGEX.test(
        removeShortEnglishInParens(value)
          .replace(/\b(AP|HP)/gi, "")
          .replace(/\bLv\./gi, ""),
      )) ||
    (exacts as string[]).includes(value)
  );
}

const KO_KNOWN_EN = ["EX리소스", "(G-팀)", "AGE 디바이스", "AGE 시스템", "GFreD", "X-라운더", "CGS", "NT-1"];

function lineToKo(line: DescriptionLine): string {
  return line
    .filter((t): t is { type: "prose"; en: string; ko: string } => t.type === "prose")
    .map((t) => t.ko)
    .join(" ");
}

export function isDescriptionTranslated(description: DescriptionLine[]): boolean {
  return (
    description.length > 0 &&
    description.every((line) => {
      const ko = lineToKo(line);
      if (!ko) return true; // trigger/ability 전용 라인은 번역 불필요
      const cleaned = KO_KNOWN_EN.reduce((s, w) => s.replaceAll(w, ""), ko);
      return isTranslated(cleaned);
    })
  );
}

// ── card checker ──────────────────────────────────────────────────────────────

export function checkCard(card: Card): FieldResult[] {
  const results: FieldResult[] = [];

  if (card.name != null) {
    const name = typeof card.name === "object" ? card.name.ko : card.name;
    const ok = isTranslated(name);
    results.push({
      field: "name",
      translated: ok,
      detail: name,
      untranslatedValues: ok ? undefined : [name],
    });
  }

  if (card.description != null && card.description.length > 0) {
    const ok = isDescriptionTranslated(card.description);
    const badLines = card.description.filter((line) => {
      const ko = lineToKo(line);
      if (!ko) return false;
      const cleaned = KO_KNOWN_EN.reduce((s, w) => s.replaceAll(w, ""), ko);
      return !isTranslated(cleaned);
    });
    results.push({
      field: "description",
      translated: ok,
      detail: badLines.length > 0 ? `${badLines.length}줄 미번역` : `${card.description.length}줄 완료`,
      untranslatedValues: badLines.length > 0 ? badLines.map(lineToKo) : undefined,
    });
  }

  if (card.link?.__typename === "LinkPilot") {
    const raw = (card.link as LinkPilot).pilotName;
    const name = typeof raw === "object" && raw !== null ? raw.ko : raw;
    const ok = isTranslated(name);
    results.push({
      field: "link.pilotName",
      translated: ok,
      detail: name,
      untranslatedValues: ok ? undefined : [name],
    });
  }

  if (card.__typename === "CommandCard" && card.description != null) {
    let pilotName: string | null = null;
    outer: for (const line of card.description) {
      for (const token of line) {
        if (token.type === "prose" && token.ko) {
          const match = /\[([^\]]+)\]/.exec(token.ko);
          if (match?.[1]) { pilotName = match[1]; break outer; }
        }
      }
    }
    if (pilotName != null) {
      const ok = isTranslated(pilotName);
      results.push({
        field: "pilot.name",
        translated: ok,
        detail: pilotName,
        untranslatedValues: ok ? undefined : [pilotName],
      });
    }
  }

  return results;
}

// ── English checker ───────────────────────────────────────────────────────────

const JA_REGEX = /[\u3040-\u30FF\u4E00-\u9FFF]/;

export function isEnglishTranslated(value: string): boolean {
  return value !== "" && !JA_REGEX.test(value);
}

/** Check English translation coverage (raw.json source). */
export function checkCardEn(card: Card): FieldResult[] {
  const results: FieldResult[] = [];

  if (card.name != null) {
    const name = typeof card.name === "object" ? card.name.en : card.name;
    const ok = isEnglishTranslated(name);
    results.push({
      field: "name",
      translated: ok,
      detail: name,
      untranslatedValues: ok ? undefined : [name],
    });
  }

  if (card.description != null && card.description.length > 0) {
    const enLines = card.description.map((line) =>
      line.filter((t): t is { type: "prose"; en: string; ko: string } => t.type === "prose")
          .map((t) => t.en).join(" "),
    );
    const bad = enLines.filter((s) => s && !isEnglishTranslated(s));
    const ok = bad.length === 0;
    results.push({
      field: "description",
      translated: ok,
      detail: bad.length > 0 ? `${bad.length} lines untranslated` : `${enLines.length} lines done`,
      untranslatedValues: bad.length > 0 ? bad : undefined,
    });
  }

  if (card.link?.__typename === "LinkPilot") {
    const raw = (card.link as LinkPilot).pilotName;
    const name = typeof raw === "object" && raw !== null ? raw.en : raw;
    const ok = isEnglishTranslated(name);
    results.push({
      field: "link.pilotName",
      translated: ok,
      detail: name,
      untranslatedValues: ok ? undefined : [name],
    });
  }

  return results;
}
