/**
 * 카드 이미지 썸네일 생성 스크립트
 * 실행: bun run scripts/gen-thumbnails.ts
 *
 * public/cards/{id}.webp → public/cards/{id}-sm.webp (200px wide)
 */
import sharp from "sharp";
import { readdirSync, existsSync } from "fs";
import { join, basename, extname } from "path";

const CARDS_DIR = join(import.meta.dir, "../public/cards");
const THUMB_WIDTH = 200;

const files = readdirSync(CARDS_DIR).filter(
  (f) => extname(f) === ".webp" && !f.endsWith("-sm.webp"),
);

let done = 0;
let skipped = 0;

await Promise.all(
  files.map(async (file) => {
    const id = basename(file, ".webp");
    const src = join(CARDS_DIR, file);
    const dst = join(CARDS_DIR, `${id}-sm.webp`);

    if (existsSync(dst)) {
      skipped++;
      return;
    }

    await sharp(src).resize({ width: THUMB_WIDTH }).webp({ quality: 80 }).toFile(dst);
    done++;
    if (done % 50 === 0) process.stdout.write(`  ${done}/${files.length}\n`);
  }),
);

console.log(`Done: ${done} generated, ${skipped} already existed.`);
