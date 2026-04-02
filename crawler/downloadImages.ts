import { writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import pLimit from "p-limit";
import processed from "../data/processed.json";

const BASE = "https://www.gundam-gcg.com/en/images/cards/card";
const OUT_DIR = join(import.meta.dir, "../frontend/public/cards");

const ids: string[] = (processed as { id: string }[]).map((c) => c.id);

const limit = pLimit(5);

let completed = 0;
let skipped = 0;
let failed = 0;
const total = ids.length;

async function downloadImage(id: string) {
  const outPath = join(OUT_DIR, `${id}.webp`);

  // 이미 있으면 스킵
  try {
    await access(outPath);
    skipped++;
    return;
  } catch {}

  const url = `${BASE}/${id}.webp`;
  const res = await fetch(url);

  if (!res.ok) {
    failed++;
    process.stdout.write(`\r[${completed + skipped + failed}/${total}] FAIL: ${id} (${res.status})    `);
    return;
  }

  const buf = await res.arrayBuffer();
  await writeFile(outPath, Buffer.from(buf));
  completed++;
}

await Promise.all(
  ids.map((id) =>
    limit(async () => {
      await downloadImage(id);
      const done = completed + skipped + failed;
      const pct = ((done / total) * 100).toFixed(1);
      process.stdout.write(`\r[${done}/${total}] ${pct}%  new:${completed}  skip:${skipped}  fail:${failed}   `);
    }),
  ),
);

console.log(`\n완료: ${completed}개 다운로드, ${skipped}개 스킵, ${failed}개 실패`);
