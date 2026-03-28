import { styleText } from "node:util";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ── types ────────────────────────────────────────────────────────────────────

type LinkPilot = { __typename: "LinkPilot"; pilotName: string };
type LinkTrait = { __typename: "LinkTrait"; trait: string };
type UnitLink = LinkPilot | LinkTrait;

type UnitCard = {
  __typename: "UnitCard";
  id: string;
  name: string;
  description: string[];
  link?: UnitLink;
  [key: string]: unknown;
};

type OtherCard = {
  __typename: string;
  id: string;
  [key: string]: unknown;
};

type Card = UnitCard | OtherCard;

// ── translation detection ─────────────────────────────────────────────────────

const EN_REGEX = /[a-zA-Z]/;

const exceptions = ["OZ", "UN", "세츠나 F. 세이에이"];

const isTranslated = (value: string): boolean =>
  !EN_REGEX.test(value) || exceptions.includes(value);

const isNameTranslated = (name: string) => isTranslated(name);

const isDescriptionTranslated = (description: string[]): boolean =>
  description.length > 0 && description.every((line) => isTranslated(line));

const isPilotNameTranslated = (pilotName: string) => isTranslated(pilotName);

// ── field result ──────────────────────────────────────────────────────────────

type FieldResult = {
  field: string;
  translated: boolean;
  detail?: string;
};

function checkUnitCard(card: UnitCard): FieldResult[] {
  const results: FieldResult[] = [];

  // name
  results.push({
    field: "name",
    translated: isNameTranslated(card.name),
    detail: card.name,
  });

  // description (모든 줄이 번역되어야 함)
  const descTranslated = isDescriptionTranslated(card.description);
  const notTranslatedLines = card.description.filter((line) => !isTranslated(line));
  results.push({
    field: "description",
    translated: descTranslated,
    detail:
      notTranslatedLines.length > 0
        ? `${notTranslatedLines.length}줄 미번역`
        : `${card.description.length}줄 완료`,
  });

  // link (LinkPilot 일 때만 pilotName 검사)
  if (card.link) {
    if (card.link.__typename === "LinkPilot") {
      const pilotName = (card.link as LinkPilot).pilotName;
      results.push({
        field: "link.pilotName",
        translated: isPilotNameTranslated(pilotName),
        detail: pilotName,
      });
    }
    // LinkTrait 는 enum 값이라 번역 불필요 — 표시 생략
  }

  return results;
}

// ── summary counters ──────────────────────────────────────────────────────────

type Summary = { total: number; translated: number };

function addSummary(a: Summary, b: Summary): Summary {
  return {
    total: a.total + b.total,
    translated: a.translated + b.translated,
  };
}

// ── rendering helpers ─────────────────────────────────────────────────────────

const TREE_PIPE = "│  ";
const TREE_BRANCH = "├─ ";
const TREE_LAST = "└─ ";
const TREE_INDENT = "   ";

function renderPercent(summary: Summary): string {
  if (summary.total === 0) return styleText("gray", "N/A");
  const pct = Math.round((summary.translated / summary.total) * 100);
  const text = `${summary.translated}/${summary.total} (${pct}%)`;
  if (pct === 100) return styleText("green", text);
  if (pct >= 50) return styleText("yellow", text);
  return styleText("red", text);
}

function renderFieldLine(result: FieldResult, prefix: string, isLast: boolean): void {
  const connector = isLast ? TREE_LAST : TREE_BRANCH;
  const icon = result.translated ? styleText("green", "✓") : styleText("red", "✗");
  const fieldName = result.translated
    ? styleText("green", result.field)
    : styleText("red", result.field);
  const detail = result.detail ? styleText("gray", ` — ${result.detail}`) : "";
  console.log(`${prefix}${connector}${icon} ${fieldName}${detail}`);
}

function renderCardLine(
  card: Card,
  fields: FieldResult[],
  prefix: string,
  isLast: boolean,
): Summary {
  const connector = isLast ? TREE_LAST : TREE_BRANCH;
  const childPrefix = prefix + (isLast ? TREE_INDENT : TREE_PIPE);

  const cardSummary: Summary = {
    total: fields.length,
    translated: fields.filter((f) => f.translated).length,
  };

  const allDone = cardSummary.translated === cardSummary.total;
  const idText = allDone ? styleText("green", card.id) : styleText("yellow", card.id);

  const typename = styleText("gray", ` [${card.__typename}]`);
  const pct = renderPercent(cardSummary);

  console.log(`${prefix}${connector}${idText}${typename} ${pct}`);

  fields.forEach((field, i) => {
    renderFieldLine(field, childPrefix, i === fields.length - 1);
  });

  return cardSummary;
}

// ── main ──────────────────────────────────────────────────────────────────────

const DATA_DIR = join(import.meta.dir, "data");

const files = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

const packageSummaries: Array<{ name: string; summary: Summary }> = [];

console.log(styleText("bold", "\n📋 Translation Coverage Report\n"));

files.forEach((file, fileIdx) => {
  const isLastFile = fileIdx === files.length - 1;
  const filePath = join(DATA_DIR, file);
  const packageName = file.replace(".json", "");
  const cards: Card[] = JSON.parse(readFileSync(filePath, "utf-8"));

  // 패키지 단위 집계
  let packageSummary: Summary = { total: 0, translated: 0 };

  // 1depth: 패키지(파일)
  const fileConnector = isLastFile ? TREE_LAST : TREE_BRANCH;
  const unitCards = cards.filter((c) => c.__typename === "UnitCard") as UnitCard[];
  const unitCount = unitCards.length;

  // 먼저 전체 summary 계산 (표시용)
  let previewSummary: Summary = { total: 0, translated: 0 };
  for (const card of unitCards) {
    const fields = checkUnitCard(card);
    previewSummary = addSummary(previewSummary, {
      total: fields.length,
      translated: fields.filter((f) => f.translated).length,
    });
  }

  const packageLabel = styleText("bold", packageName);
  const cardCountLabel = styleText("gray", ` (UnitCard × ${unitCount})`);
  console.log(`${fileConnector}${packageLabel}${cardCountLabel} ${renderPercent(previewSummary)}`);

  const filePrefix = isLastFile ? TREE_INDENT : TREE_PIPE;

  if (unitCards.length === 0) {
    console.log(`${filePrefix}${TREE_LAST}${styleText("gray", "(번역 대상 카드 없음)")}`);
    packageSummaries.push({ name: packageName, summary: { total: 0, translated: 0 } });
    return;
  }

  // 2depth: 각 카드
  unitCards.forEach((card, cardIdx) => {
    const isLastCard = cardIdx === unitCards.length - 1;
    const fields = checkUnitCard(card);
    const cardSummary = renderCardLine(card, fields, filePrefix, isLastCard);
    packageSummary = addSummary(packageSummary, cardSummary);
  });

  packageSummaries.push({ name: packageName, summary: packageSummary });
});

// ── 전체 요약 ──────────────────────────────────────────────────────────────────

console.log();
console.log(styleText("bold", "─".repeat(48)));
console.log(styleText("bold", "📊 패키지별 요약"));
console.log(styleText("bold", "─".repeat(48)));

let grandTotal: Summary = { total: 0, translated: 0 };

packageSummaries.forEach(({ name, summary }) => {
  const label = name.padEnd(8);
  console.log(`  ${styleText("cyan", label)}  ${renderPercent(summary)}`);
  grandTotal = addSummary(grandTotal, summary);
});

console.log(styleText("bold", "─".repeat(48)));
console.log(`  ${"TOTAL".padEnd(8)}  ${renderPercent(grandTotal)}`);
console.log();
