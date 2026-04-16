import raw from "./raw.json";
import { writeFile } from "node:fs/promises";
import effects from "./effects.json";
import pilotnames from "./pilotnames.json";
import unitnames from "./unitnames.json";
import basenames from "./basenames.json";
import commandnames from "./commandnames.json";
import descriptions from "./descriptionmap.json";

const pilotNameEntries = Object.entries(pilotnames);
const effectEntries = Object.entries(effects);
const allEntries = [...effectEntries, ...pilotNameEntries];

function maps(target: string, kvMap: [string, string][]): string {
  return kvMap.reduce((acc, [k, v]) => acc.replaceAll(k, v), target);
}

// ─── Name mappers (unchanged) ─────────────────────────────────────────────────

const pilotNameMapper = (raw: unknown[]) =>
  raw
    .map((x) => {
      if (x.name == null || typeof x.name === "object") return x;
      const enName = x.name as string;
      const koName = maps(enName, pilotNameEntries);
      if (x.__typename === "PilotCard") {
        return { ...x, name: { en: enName, ko: koName } };
      }
      return { ...x, name: koName };
    })
    .map((x) => {
      if (x?.link?.pilotName == null) return x;
      const enName = x.link.pilotName as string;
      const koName = maps(enName, pilotNameEntries);
      return {
        ...x,
        link: { ...x.link, pilotName: { en: enName, ko: koName } },
      };
    });

const unitNameMapper = (raw: unknown[]) =>
  raw.map((x) => {
    if (x.__typename !== "UnitCard" || x.name == null || typeof x.name === "object") return x;
    const en = x.name as string;
    return { ...x, name: { en, ko: unitnames[en] ?? en } };
  });

const baseNameMapper = (raw: unknown[]) =>
  raw.map((x) => {
    if (x.__typename !== "BaseCard" || x.name == null || typeof x.name === "object") return x;
    const en = x.name as string;
    return { ...x, name: { en, ko: basenames[en] ?? en } };
  });

const commandNameMapper = (raw: unknown[]) =>
  raw.map((x) => {
    if (x.__typename !== "CommandCard" || x.name == null || typeof x.name === "object") return x;
    const en = x.name as string;
    return { ...x, name: { en, ko: commandnames[en] ?? en } };
  });

// ─── Description tokenizer ───────────────────────────────────────────────────

// EN trigger text → CardKeyword (startsWith 매칭)
const EN_TRIGGER_MAP: Array<[string, string]> = [
  ["Activate: Main", "ACTIVATE_MAIN"],
  ["Activate: Action", "ACTIVATE_ACTION"],
  ["Activate･Main", "ACTIVATE_MAIN"],
  ["Activate･Action", "ACTIVATE_ACTION"],
  ["During Pair", "DURING_PAIR"],
  ["When Paired", "WHEN_PAIRED"],
  ["During Link", "DURING_LINK"],
  ["When Linked", "WHEN_LINKED"],
  ["Attack", "ATTACK"],
  ["Deploy", "DEPLOY"],
  ["Destroyed", "DESTROYED"],
  ["On Attack", "ATTACK"],
  ["On Deploy", "DEPLOY"],
  ["On Destroyed", "DESTROYED"],
  ["On Pair", "WHEN_PAIRED"],
  ["On Link", "WHEN_LINKED"],
  ["Burst", "BURST"],
  ["Main", "MAIN"],
  ["Action", "ACTION"],
  ["Pilot", "PILOT"],
  ["Once per Turn", "ONCE_PER_TURN"],
  ["Once Per Turn", "ONCE_PER_TURN"],
  ["End of Turn", "END_OF_TURN"],
];

// EN ability text → CardKeyword (startsWith 매칭)
const EN_ABILITY_MAP: Array<[string, string]> = [
  ["High-Maneuver", "HIGH_MANEUVER"],
  ["High Maneuver", "HIGH_MANEUVER"],
  ["First Strike", "FIRST_STRIKE"],
  ["Suppression", "SUPPRESSION"],
  ["Blocker", "BLOCKER"],
  ["Repair", "REPAIR"],
  ["Breach", "BREACH"],
  ["Support", "SUPPORT"],
];

// KO trigger prefix → qualifier 추출용
const KO_TRIGGER_PREFIXES: string[] = [
  "기동･메인",
  "기동･액션",
  "버스트",
  "공격 시",
  "배치 시",
  "파괴 시",
  "링크 시",
  "링크 중",
  "세트 시",
  "세트 중",
  "파일럿",
  "턴 1회",
  "내 턴이 끝날 때",
  "메인",
  "액션",
];

type RawToken =
  | { kind: "trigger"; text: string }
  | { kind: "ability"; text: string }
  | { kind: "prose"; text: string };

function tokenizeRaw(line: string): RawToken[] {
  const tokens: RawToken[] = [];
  const regex = /【([^】]*)】|<([^>]+)>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: "prose", text: line.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ kind: "trigger", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: "ability", text: match[2] });
    }
    last = regex.lastIndex;
  }
  if (last < line.length) {
    tokens.push({ kind: "prose", text: line.slice(last) });
  }
  return tokens;
}

function matchPrefix<T>(text: string, map: Array<[string, T]>): { value: T; suffix: string } | null {
  for (const [prefix, value] of map) {
    if (text === prefix || text.startsWith(prefix)) {
      return { value, suffix: text.slice(prefix.length) };
    }
  }
  return null;
}

function getKoQualifier(koText: string): string | undefined {
  for (const prefix of KO_TRIGGER_PREFIXES) {
    if (koText === prefix || koText.startsWith(prefix)) {
      return koText.slice(prefix.length) || undefined;
    }
  }
  return undefined;
}

/** EN line을 KO line으로 변환 (기존 effects + descriptionmap 파이프라인) */
function getKoLine(enLine: string): string {
  const intermediate = maps(enLine, allEntries);
  return (descriptions as Record<string, string>)[intermediate] ?? intermediate;
}

/** EN 라인과 KO 라인을 토크나이징하여 DescriptionToken[] 생성 */
function buildDescriptionLine(enLine: string, koLine: string): object[] {
  const enTokens = tokenizeRaw(enLine);
  // KO 라인에서 트리거/어빌리티 사이의 공백 전용 prose 토큰 제거 (인덱스 정렬 유지)
  const koTokens = tokenizeRaw(koLine).filter(
    (t) => !(t.kind === "prose" && !t.text.trim()),
  );

  const result: object[] = [];
  for (let i = 0; i < enTokens.length; i++) {
    const enTok = enTokens[i]!;
    const koTok = koTokens[i];

    if (enTok.kind === "trigger") {
      const parsed = matchPrefix(enTok.text, EN_TRIGGER_MAP);
      const keyword = parsed?.value ?? enTok.text;
      const enQualifier = parsed?.suffix || undefined;
      const koQualifier =
        koTok?.kind === "trigger" ? getKoQualifier(koTok.text) : undefined;
      const qualifier =
        enQualifier && koQualifier ? { en: enQualifier, ko: koQualifier } : undefined;
      result.push({
        type: "trigger",
        keyword,
        ...(qualifier ? { qualifier } : {}),
      });
      continue;
    }

    if (enTok.kind === "ability") {
      const parsed = matchPrefix(enTok.text, EN_ABILITY_MAP);
      const keyword = parsed?.value ?? enTok.text;
      const nStr = parsed?.suffix.trim();
      const n = nStr ? parseInt(nStr, 10) : undefined;
      result.push({
        type: "ability",
        keyword,
        ...(n !== undefined && !isNaN(n) ? { n } : {}),
      });
      continue;
    }

    // prose — 빈 토큰 제거
    const en = enTok.text.trim();
    const ko = (koTok?.kind === "prose" ? koTok.text : "").trim();
    if (en || ko) {
      result.push({ type: "prose", en, ko });
    }
  }

  return result;
}

const descriptionTokenMapper = (cards: unknown[]) =>
  cards.map((x: any) => {
    if (x.description == null) return x;
    return {
      ...x,
      description: x.description.map((enLine: string) =>
        buildDescriptionLine(enLine, getKoLine(enLine)),
      ),
    };
  });

// ─── Printing grouper ────────────────────────────────────────────────────────

function groupPrintings(cards: unknown[]): unknown[] {
  const grouped = new Map<string, unknown[]>();
  for (const card of cards) {
    const id = (card as any).id as string;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(card);
  }

  return [...grouped.values()].map((group) => {
    // imageFile === id 인 베이스 카드 우선, 없으면 첫 번째
    const base = (group.find((c: any) => c.imageFile === c.id) ?? group[0]) as object;
    const printings = group.map((c: any) => ({ rarity: c.rarity, imageFile: c.imageFile, block: c.block }));
    return { ...base, printings };
  });
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

await writeFile(
  "../data/2.mapped.json",
  JSON.stringify(
    groupPrintings(
      descriptionTokenMapper(
        pilotNameMapper(commandNameMapper(baseNameMapper(unitNameMapper(raw)))),
      ),
    ),
    null,
    2,
  ),
  "utf-8",
);
