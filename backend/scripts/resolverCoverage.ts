import { styleText } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSchema, isObjectType, isUnionType } from "graphql";
import { resolvers } from "../src/resolvers";

// ── DB 감지: 리졸버 함수 소스에 ctx.db / ctx.loaders가 있으면 DB-backed ──────

function isDbBacked(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  const src = fn.toString();
  // ctx.db / ctx.loaders 직접 사용, 또는 ctx를 헬퍼에 넘기는 경우
  return /\bctx\b/.test(src);
}

// ── 스키마 로드 ────────────────────────────────────────────────────────────────

const schemaText = readFileSync(resolve(import.meta.dir, "../schema/schema.graphql"), "utf-8");
const schema = buildSchema(schemaText);

// ── 트리 상수 ─────────────────────────────────────────────────────────────────

const T = { branch: "├─ ", last: "└─ ", pipe: "│  ", indent: "   " };

// ── 상태 타입 ─────────────────────────────────────────────────────────────────

type Status = "db" | "memory" | "default" | "missing" | "resolveType";

function renderStatus(s: Status): string {
  if (s === "db")          return styleText("green",  "✓ db");
  if (s === "resolveType") return styleText("green",  "✓ resolveType");
  if (s === "memory")      return styleText("yellow", "· memory");
  if (s === "default")     return styleText("gray",   "· default");
  return                          styleText("red",    "✗ missing");
}

function isCovered(s: Status): boolean {
  return s !== "missing";
}

function isMigrated(s: Status): boolean {
  return s === "db" || s === "resolveType" || s === "default";
}

// ── 상태 판별 ─────────────────────────────────────────────────────────────────

const res = resolvers as Record<string, Record<string, unknown>>;

function fieldStatus(typeName: string, fieldName: string): Status {
  const typeRes = res[typeName];
  const fn = typeRes?.[fieldName];
  const hasResolver = !!fn;
  const isRequired = typeName === "Query" || typeName === "Mutation";

  if (hasResolver && isDbBacked(fn)) return "db";
  if (!typeRes && !isRequired) return "default";
  if (!hasResolver && isRequired) return "missing";
  if (!hasResolver) return "default";
  return "memory";
}

function unionStatus(typeName: string): Status {
  return res[typeName]?.["__resolveType"] ? "resolveType" : "missing";
}

// ── 출력 ─────────────────────────────────────────────────────────────────────

type Summary = { total: number; covered: number; migrated: number };

function renderType(typeName: string, fields: { name: string; status: Status }[]): Summary {
  const covered  = fields.filter((f) => isCovered(f.status)).length;
  const migrated = fields.filter((f) => isMigrated(f.status)).length;
  const total    = fields.length;

  const migratedPct = total === 0 ? 100 : Math.round((migrated / total) * 100);
  const migratedText = `${migrated}/${total} (${migratedPct}%)`;
  const migratedColored =
    migratedPct === 100 ? styleText("green",  migratedText) :
    migratedPct > 0     ? styleText("yellow", migratedText) :
                          styleText("gray",   migratedText);

  console.log(`\n${styleText("bold", typeName)}  ${migratedColored}`);

  fields.forEach((f, i) => {
    const connector = i === fields.length - 1 ? T.last : T.branch;
    const name = f.status === "missing" ? styleText("red", f.name) : f.name;
    console.log(`${connector}${renderStatus(f.status)}  ${name}`);
  });

  return { total, covered, migrated };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

const OBJECT_TYPES = [
  "Query", "Mutation",
  "UnitCard", "PilotCard", "BaseCard", "CommandCard", "Resource",
  "Deck", "DeckList",
  "UnitDeckCard", "PilotDeckCard", "BaseDeckCard", "CommandDeckCard", "ResourceDeckCard",
  "FilterSearchHistory", "CardViewHistory", "SearchHistoryList",
  "Trait", "Keyword", "Color", "Series",
  "TriggerToken", "AbilityToken", "ProseToken",
  "LinkTrait", "LinkPilot", "Pilot",
];

const UNION_TYPES = [
  "Card", "PlayableCard", "UnitLink", "DescriptionToken",
  "CardGrouping", "SearchHistory", "DeckCard", "AddCardToDeckResult",
];

console.log(styleText("bold", "\n📋 Resolver Migration Coverage\n"));
console.log(`${styleText("green", "✓ db")}      — DB 쿼리로 마이그레이션 완료`);
console.log(`${styleText("yellow", "· memory")}  — 리졸버 있음, 아직 인메모리 (serve.ts 로직)`);
console.log(`${styleText("gray", "· default")}  — 리졸버 없음, GraphQL 기본 동작 (obj.field)`);

let grandTotal = 0, grandMigrated = 0;
const summaries: { name: string; summary: Summary }[] = [];

for (const typeName of OBJECT_TYPES) {
  const type = schema.getType(typeName);
  if (!type || !isObjectType(type)) continue;

  const fields = Object.keys(type.getFields()).map((fieldName) => ({
    name: fieldName,
    status: fieldStatus(typeName, fieldName),
  }));

  const summary = renderType(typeName, fields);
  summaries.push({ name: typeName, summary });
  grandTotal    += summary.total;
  grandMigrated += summary.migrated;
}

// Unions
console.log(`\n${styleText("bold", "Unions")}`);
UNION_TYPES.forEach((typeName, i) => {
  const s = unionStatus(typeName);
  const connector = i === UNION_TYPES.length - 1 ? T.last : T.branch;
  console.log(`${connector}${renderStatus(s)}  ${typeName}`);
  grandTotal++;
  if (isMigrated(s)) grandMigrated++;
});

// ── 요약 ─────────────────────────────────────────────────────────────────────

const KEY_TYPES = ["Query", "Mutation", "UnitCard", "PilotCard", "BaseCard", "CommandCard", "Deck"];
const pct = Math.round((grandMigrated / grandTotal) * 100);
const pctText = `${grandMigrated}/${grandTotal} (${pct}%)`;

console.log(`\n${styleText("bold", "─".repeat(44))}`);
console.log(styleText("bold", "📊 Migration Summary"));
console.log(styleText("bold", "─".repeat(44)));

for (const { name, summary } of summaries) {
  if (!KEY_TYPES.includes(name)) continue;
  const p = Math.round((summary.migrated / summary.total) * 100);
  const t = `${summary.migrated}/${summary.total} (${p}%)`;
  const colored =
    p === 100 ? styleText("green",  t) :
    p > 0     ? styleText("yellow", t) :
                styleText("gray",   t);
  console.log(`  ${name.padEnd(20)} ${colored}`);
}

console.log(styleText("bold", "─".repeat(44)));
const totalColored =
  pct === 100 ? styleText("green",  pctText) :
  pct > 0     ? styleText("yellow", pctText) :
                styleText("gray",   pctText);
console.log(`  ${"TOTAL".padEnd(20)} ${totalColored}`);
console.log();
