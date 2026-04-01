/**
 * 3.process.ts — mapped.json + limited.json + banned.json → processed.json
 *
 * Each card gains a `limit` field:
 *   4  = default (no restriction)
 *   1–3 = limited (entry in limited.json)
 *   0  = banned (entry in banned.json)
 */

import { writeFile } from "node:fs/promises";
import mapped from "./mapped.json";
import limited from "./limited.json" with { type: "json" };
import banned from "./banned.json" with { type: "json" };

const DEFAULT_LIMIT = 4;

const bannedSet = new Set<string>(banned as string[]);
const limitedMap = limited as Record<string, number>;

const processed = (mapped as Array<Record<string, unknown>>).map((card) => {
  const id = card["id"] as string | undefined;
  if (!id) return { ...card, limit: DEFAULT_LIMIT };

  if (bannedSet.has(id)) return { ...card, limit: 0 };
  if (id in limitedMap) return { ...card, limit: limitedMap[id] };
  return { ...card, limit: DEFAULT_LIMIT };
});

await writeFile("processed.json", JSON.stringify(processed, null, 2), "utf-8");

const byLimit = Object.groupBy(processed, (c) => c["limit"] as number);
console.log("✓ processed.json written");
console.log(`  total  : ${processed.length}`);
console.log(`  banned : ${byLimit[0]?.length ?? 0}`);
console.log(`  limited: ${Object.entries(byLimit).filter(([k]) => Number(k) > 0 && Number(k) < DEFAULT_LIMIT).reduce((s, [, v]) => s + (v?.length ?? 0), 0)}`);
console.log(`  normal : ${byLimit[DEFAULT_LIMIT]?.length ?? 0}`);
