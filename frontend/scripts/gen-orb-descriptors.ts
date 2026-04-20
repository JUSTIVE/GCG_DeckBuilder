/**
 * ORB 디스크립터 사전 추출 스크립트
 *
 * 실행: bun run scripts/gen-orb-descriptors.ts
 *
 * 634장의 카드 썸네일(public/cards/{id}-sm.webp)에서 ORB 피쳐를 추출해
 * public/orb-descriptors.bin으로 직렬화한다. 런타임에 Web Worker가 이
 * 바이너리를 로드해 BFMatcher로 사진 속 카드를 매칭한다.
 */

import { readdirSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname =
  typeof import.meta.dir === "string" ? import.meta.dir : dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = join(__dirname, "../public/cards");
const OUTPUT = join(__dirname, "../public/orb-descriptors.bin");

// Use project-local sharp (may differ from global install)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require(join(__dirname, "../node_modules/sharp"));

const MAX_FEATURES = 500;
const DESCRIPTOR_SIZE = 32; // ORB descriptor = 32 bytes
const CARD_ID_SIZE = 16; // padded card ID

// ── Load OpenCV ──────────────────────────────────────────────────────────────

async function loadCV() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cv = require(join(__dirname, "../node_modules/@techstark/opencv-js"));
  // WASM compiles asynchronously; poll until cv.Mat becomes a function
  const deadline = Date.now() + 30_000;
  while (typeof cv.Mat !== "function") {
    if (Date.now() > deadline) throw new Error("OpenCV WASM initialization timeout");
    await new Promise((r) => setTimeout(r, 200));
  }
  return cv;
}

// ── Image loading ────────────────────────────────────────────────────────────

async function loadGrayscale(cv: any, filepath: string): Promise<any> {
  const { data, info } = await (sharp as any)(filepath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mat = new cv.Mat(info.height, info.width, cv.CV_8UC1);
  mat.data.set(data);
  return mat;
}

// ── ORB extraction ───────────────────────────────────────────────────────────

function extractOrb(
  cv: any,
  grayMat: any,
): { keypoints: any; descriptors: Uint8Array; count: number } {
  const orb = new cv.ORB(MAX_FEATURES);
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();

  orb.detectAndCompute(grayMat, new cv.Mat(), keypoints, descriptors);

  const count = descriptors.rows;
  let descData = new Uint8Array(0);
  if (count > 0) {
    descData = new Uint8Array(descriptors.data.slice(0, count * DESCRIPTOR_SIZE));
  }

  descriptors.delete();
  keypoints.delete();
  orb.delete();

  return { keypoints: null, descriptors: descData, count };
}

// ── Binary serialization ─────────────────────────────────────────────────────

interface CardDescriptor {
  cardId: string;
  descriptors: Uint8Array;
  count: number;
}

function serialize(cards: CardDescriptor[]): Buffer {
  // Calculate total size
  const headerSize = 4 + 2 + 2 + 2 + 2 + 4; // magic + version + maxFeatures + descSize + cardCount + reserved
  let bodySize = 0;
  for (const card of cards) {
    bodySize += CARD_ID_SIZE + 2 + card.descriptors.byteLength;
  }

  const buf = Buffer.alloc(headerSize + bodySize);
  let offset = 0;

  // Header
  buf.writeUInt32LE(0x4f524264, offset); // "ORBd"
  offset += 4;
  buf.writeUInt16LE(1, offset); // version
  offset += 2;
  buf.writeUInt16LE(MAX_FEATURES, offset);
  offset += 2;
  buf.writeUInt16LE(DESCRIPTOR_SIZE, offset);
  offset += 2;
  buf.writeUInt16LE(cards.length, offset);
  offset += 2;
  buf.writeUInt32LE(0, offset); // reserved
  offset += 4;

  // Per card
  for (const card of cards) {
    // Card ID (null-padded 16 bytes)
    const idBuf = Buffer.alloc(CARD_ID_SIZE);
    idBuf.write(card.cardId, "utf-8");
    idBuf.copy(buf, offset);
    offset += CARD_ID_SIZE;

    // Keypoint count
    buf.writeUInt16LE(card.count, offset);
    offset += 2;

    // Descriptors
    card.descriptors.forEach((byte, i) => {
      buf[offset + i] = byte;
    });
    offset += card.descriptors.byteLength;
  }

  return buf;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading OpenCV...");
  const cv = await loadCV();
  console.log("OpenCV loaded.");

  const thumbFiles = readdirSync(CARDS_DIR).filter((f) => f.endsWith("-sm.webp"));
  console.log(`Found ${thumbFiles.length} thumbnails.`);

  const results: CardDescriptor[] = [];
  let processed = 0;

  for (const file of thumbFiles) {
    const cardId = basename(file, "-sm.webp");
    const filepath = join(CARDS_DIR, file);

    try {
      const gray = await loadGrayscale(cv, filepath);
      const { descriptors, count } = extractOrb(cv, gray);
      gray.delete();

      results.push({ cardId, descriptors, count });

      processed++;
      if (processed % 50 === 0) {
        console.log(`  ${processed}/${thumbFiles.length} (${cardId}: ${count} keypoints)`);
      }
    } catch (err) {
      console.error(`  SKIP ${cardId}: ${err}`);
    }
  }

  console.log(`Extracted descriptors from ${results.length} cards.`);

  const bin = serialize(results);
  writeFileSync(OUTPUT, bin);
  console.log(`Written ${OUTPUT} (${(bin.byteLength / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
