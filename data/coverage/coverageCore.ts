import exacts from "./exacts.json";

// ── types ─────────────────────────────────────────────────────────────────────

export type LinkPilot = { __typename: "LinkPilot"; pilotName: string };
export type LinkTrait = { __typename: "LinkTrait"; trait: string };

export type Card = {
  __typename: string;
  id: string;
  name?: string;
  description?: string[];
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

export function isDescriptionTranslated(description: string[]): boolean {
  return (
    description.length > 0 &&
    description.every((line) =>
      isTranslated(
        line
          .replaceAll("EX리소스", "")
          .replaceAll("(G-팀)", "")
          .replaceAll("AGE 디바이스", "")
          .replaceAll("AGE 시스템", "")
          .replaceAll("GFreD", "")
          .replaceAll("X-라운더", "")
          .replaceAll("CGS", ""),
      ),
    )
  );
}

// ── card checker ──────────────────────────────────────────────────────────────

export function checkCard(card: Card): FieldResult[] {
  const results: FieldResult[] = [];

  if (card.name != null) {
    const ok = isTranslated(card.name);
    results.push({
      field: "name",
      translated: ok,
      detail: card.name,
      untranslatedValues: ok ? undefined : [card.name],
    });
  }

  if (card.description != null && card.description.length > 0) {
    const ok = isDescriptionTranslated(card.description);
    const bad = card.description.filter((line) => !isTranslated(line));
    results.push({
      field: "description",
      translated: ok,
      detail: bad.length > 0 ? `${bad.length}줄 미번역` : `${card.description.length}줄 완료`,
      values: card.description,
      untranslatedValues: bad.length > 0 ? bad : undefined,
    });
  }

  if (card.link?.__typename === "LinkPilot") {
    const name = (card.link as LinkPilot).pilotName;
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
    for (const line of card.description) {
      const match = /【파일럿】\[([^\]]+)\]/.exec(line);
      if (match?.[1]) { pilotName = match[1]; break; }
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
