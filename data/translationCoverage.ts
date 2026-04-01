import { styleText } from "node:util";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── types ────────────────────────────────────────────────────────────────────

type LinkPilot = { __typename: "LinkPilot"; pilotName: string };
type LinkTrait = { __typename: "LinkTrait"; trait: string };
type UnitLink = LinkPilot | LinkTrait;

type Card = {
  __typename: string;
  id: string;
  name?: string;
  description?: string[];
  link?: UnitLink;
  [key: string]: unknown;
};

// ── translation detection ─────────────────────────────────────────────────────

const EN_REGEX = /[a-zA-Z]/;

const exceptions = [
  "OZ",
  "UN",
  "세츠나 F. 세이에이",
  "M1 아스트레이",
  "G-스카이 Ez",
  "자쿠 I 스나이퍼 타입",
  "G-파이터",
  "갈루스 K",
  "건담 Mk-II (티탄즈)",
  "사이코 건담 (MA 모드)",
  "레이더 건담 (MA 모드)",
  "건담 AGE-1 노멀",
  "G-에그제스",
  "건담 AGE-1 스말로",
  "건담 AGE-1 타이터스",
  "키케로가 (MA 모드) (GQ)",
  "오르테가 (GQ)",
  "가이아 (GQ)",
  "겔구그 스가이 기 (GQ)",
  "릭 돔 오르테가 기 (GQ)",
  "가자 D (소데츠키)",
  "M.A.V. 전술",
  "제다스 M",
  "건담 NT-1",
  "건담 NT-1 풀 아머",
  "짐 스나이퍼 II",
  "멧사라 (MA 모드)",
  "건담 AGE-2 노멀",
  "자쿠 Ⅱ FZ",
  "G-바운서",
  "가자 C 하만 칸 기",
  "건담 아슈타론 (MA 형태)",
  "가자 C",
  "건캐논 (GQ)",
  "건담 X",
  "건담 Mk-II (에우고)",
  "AGE 디바이스",
  "즈고크 E",
  "건담 AGE-1 플랫",
  "자쿠 (포 스네이크 아이즈 사양) [YETI] (GQ)",
  "GFreD",
  "육전용 제간 A형 (맨 헌터 사양)",
  "구스타프 칼 Type-00",
  "멧사 Type-F02 마인레이어",
  "멧사 Type-F01",
  "멧사 (Type-F 네이키드) (지휘관 기)",
  "겔구그 (GQ)",
  "릭 돔 가이아 기 (GQ)",
  "이지스 건담 (MA 모드)",
  "건담 (MA 형태)",
  "AEU 헬리온",
  "AEU 이넥트 (데모 컬러)",
  "G-디펜서",
  "GX 비트",
  "제다스 R",
  "GN 아머 (Type-E)",
  "건담 X 디바이더",
  "멧사 Type-F02",
  "샤리아 불 (GQ)",
];

const isTranslated = (value: string): boolean =>
  (value !== "" && !EN_REGEX.test(value)) || exceptions.includes(value);

const isDescriptionTranslated = (description: string[]): boolean =>
  description.length > 0 && description.every((line) => isTranslated(line));

// ── field result ──────────────────────────────────────────────────────────────

type FieldResult = {
  field: string;
  translated: boolean;
  detail?: string;
};

function checkCard(card: Card): FieldResult[] {
  const results: FieldResult[] = [];

  if (card.name != null) {
    results.push({
      field: "name",
      translated: isTranslated(card.name),
      detail: card.name,
    });
  }

  if (card.description != null) {
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
  }

  if (card.link?.__typename === "LinkPilot") {
    const pilotName = (card.link as LinkPilot).pilotName;
    results.push({
      field: "link.pilotName",
      translated: isTranslated(pilotName),
      detail: pilotName,
    });
  }

  if (
    card.__typename === "CommandCard" &&
    (card as any).pilot != null &&
    card.description != null
  ) {
    let pilotName: string | null = null;
    for (const line of card.description) {
      const match = /【파일럿】\[([^\]]+)\]/.exec(line);
      if (match?.[1]) {
        pilotName = match[1];
        break;
      }
    }
    if (pilotName != null) {
      results.push({
        field: "pilot.name",
        translated: isTranslated(pilotName),
        detail: pilotName,
      });
    }
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

const CARD_TYPES = ["UnitCard", "BaseCard", "PilotCard", "CommandCard"];

const MAPPED_FILE = join(import.meta.dir, "processed.json");

console.log(styleText("bold", "\n📋 Translation Coverage Report\n"));

const allCards: Card[] = JSON.parse(readFileSync(MAPPED_FILE, "utf-8"));
const cards = allCards.filter((c) => CARD_TYPES.includes(c.__typename));

// 패키지별로 그룹화
const cardsByPackage = new Map<string, Card[]>();
for (const card of cards) {
  const packageName = (card as any).package || "UNKNOWN";
  if (!cardsByPackage.has(packageName)) {
    cardsByPackage.set(packageName, []);
  }
  cardsByPackage.get(packageName)!.push(card);
}

// 패키지 정렬
const sortedPackages = Array.from(cardsByPackage.keys()).sort();
const packageSummaries: Array<{ name: string; summary: Summary }> = [];

// 패키지별 처리
sortedPackages.forEach((packageName, pkgIdx) => {
  const isLastPackage = pkgIdx === sortedPackages.length - 1;
  const packageCards = cardsByPackage.get(packageName)!;

  let packageSummary: Summary = { total: 0, translated: 0 };

  // 패키지 summary 미리 계산
  let previewSummary: Summary = { total: 0, translated: 0 };
  for (const card of packageCards) {
    const fields = checkCard(card);
    previewSummary = addSummary(previewSummary, {
      total: fields.length,
      translated: fields.filter((f) => f.translated).length,
    });
  }

  // 패키지 헤더 출력
  const packageConnector = isLastPackage ? TREE_LAST : TREE_BRANCH;
  const packageLabel = styleText("bold", packageName);
  const cardCountLabel = styleText("gray", ` (${packageCards.length}장)`);
  console.log(
    `${packageConnector}${packageLabel}${cardCountLabel} ${renderPercent(previewSummary)}`,
  );

  const packagePrefix = isLastPackage ? TREE_INDENT : TREE_PIPE;

  // 각 카드 처리
  packageCards.forEach((card, cardIdx) => {
    const isLastCard = cardIdx === packageCards.length - 1;
    const fields = checkCard(card);
    const cardSummary = renderCardLine(card, fields, packagePrefix, isLastCard);
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
