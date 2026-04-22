/**
 * Card Recognition Web Worker
 *
 * 입력 이미지에서 "같은 카드를 위로 겹쳐 펼친 묶음(stack)"을 세그멘테이션해
 * 각 묶음의 장수를 카운트하고, 아래쪽(완전히 보이는) 카드 영역만 잘라
 * ORB 디스크립터 DB와 매칭한다.
 */

import type {
  WorkerInMessage,
  WorkerOutMessage,
  RecognizedCard,
} from "../lib/card-recognition-types";
import { parseOrbDb, type OrbDescriptorDb } from "../lib/orb-db-parser";

declare const self: DedicatedWorkerGlobalScope;

let cv: any = null;
let orbDb: OrbDescriptorDb | null = null;

const CARD_ASPECT = 88 / 63; // portrait height / width
const STACK_OFFSET_RATIO = 0.145; // 추가 카드 1장당 상단에 드러나는 비율 (card height 기준)

function post(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    post({ type: "init-progress", stage: "Loading OpenCV.js...", percent: 0 });

    await new Promise<void>((resolve, reject) => {
      (self as any).Module = {
        onRuntimeInitialized: () => resolve(),
      };
      fetch("/opencv/opencv.js")
        .then((r) => {
          if (!r.ok) throw new Error(`opencv.js fetch failed: ${r.status}`);
          return r.text();
        })
        .then((code) => {
          // Module worker는 importScripts를 지원하지 않아, UMD 스크립트를
          // 텍스트로 받아 worker 전역 스코프에 직접 실행시킨다. 이 과정에서
          // self.cv가 설정되고 WASM 준비 완료 시 onRuntimeInitialized가 호출된다.
          (0, eval)(code);
        })
        .catch(reject);
      // 11MB 스크립트 + WASM 컴파일에 여유를 준다.
      setTimeout(() => resolve(), 30000);
    });

    cv = (self as any).cv;
    if (!cv || !cv.Mat) {
      throw new Error("OpenCV.js failed to initialize");
    }

    post({ type: "init-progress", stage: "Loading descriptor database...", percent: 50 });

    const resp = await fetch("/orb-descriptors.bin");
    if (!resp.ok) throw new Error(`Failed to load descriptors: ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    orbDb = parseOrbDb(buffer);

    post({ type: "init-progress", stage: "Ready", percent: 100 });
    post({ type: "init-done" });
  } catch (err) {
    post({ type: "init-error", error: String(err) });
  }
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

interface Pt {
  x: number;
  y: number;
}

function orderPoints(pts: Pt[]): Pt[] {
  const sorted = [...pts];
  sorted.sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = sorted[0];
  const br = sorted[3];
  sorted.sort((a, b) => a.y - a.x - (b.y - b.x));
  const tr = sorted[0];
  const bl = sorted[3];
  return [tl, tr, br, bl];
}

function rotatedRectCorners(
  center: Pt,
  size: { width: number; height: number },
  angle: number,
): Pt[] {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = size.width / 2;
  const hh = size.height / 2;
  const local: Pt[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return local.map(({ x, y }) => ({
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos,
  }));
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── Stack detection ──────────────────────────────────────────────────────────

interface CardStack {
  mat: any; // rectified bottom-card image (200x279 RGBA)
  count: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

function estimateStackCount(stackH: number, cardH: number): number {
  if (stackH < cardH * 1.08) return 1;
  const offset = cardH * STACK_OFFSET_RATIO;
  const n = Math.round((stackH - cardH) / offset) + 1;
  return Math.max(1, Math.min(10, n));
}

function rectifyStackToPortrait(
  src: any,
  corners: Pt[],
): { mat: any; width: number; height: number } {
  const [TL, TR, BR, BL] = corners;
  const wEdge = dist(TL, TR);
  const hEdge = dist(TR, BR);

  let dw: number;
  let dh: number;
  let srcArr: number[];
  if (hEdge >= wEdge) {
    dw = Math.max(10, Math.round(wEdge));
    dh = Math.max(10, Math.round(hEdge));
    srcArr = [TL.x, TL.y, TR.x, TR.y, BR.x, BR.y, BL.x, BL.y];
  } else {
    // Rotate 90° CCW so the long side becomes vertical
    dw = Math.max(10, Math.round(hEdge));
    dh = Math.max(10, Math.round(wEdge));
    srcArr = [BL.x, BL.y, TL.x, TL.y, TR.x, TR.y, BR.x, BR.y];
  }

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, srcArr);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dw, 0, dw, dh, 0, dh]);
  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const warped = new cv.Mat();
  cv.warpPerspective(src, warped, M, new cv.Size(dw, dh));
  srcPts.delete();
  dstPts.delete();
  M.delete();
  return { mat: warped, width: dw, height: dh };
}

function detectCardStacks(src: any): CardStack[] {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 40, 140);

  // 세로로 길쭉한 커널로 팬 카드 사이 수평 틈을 닫는다.
  const minDim = Math.min(src.rows, src.cols);
  const kh = Math.max(15, Math.round(minDim * 0.035));
  const kw = Math.max(3, Math.round(kh * 0.2));
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kw, kh));
  const closed = new cv.Mat();
  cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const stacks: CardStack[] = [];
  const minArea = src.rows * src.cols * 0.004; // 0.4% of image

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area < minArea) continue;

    let rotated: { center: Pt; size: { width: number; height: number }; angle: number };
    try {
      rotated = cv.minAreaRect(contour);
    } catch {
      continue;
    }

    const corners = rotatedRectCorners(rotated.center, rotated.size, rotated.angle);
    const ordered = orderPoints(corners);

    const rectified = rectifyStackToPortrait(src, ordered);
    const stackW = rectified.width;
    const stackH = rectified.height;

    // Skip degenerate shapes
    if (stackW < 30 || stackH < 40) {
      rectified.mat.delete();
      continue;
    }

    const cardH = stackW * CARD_ASPECT;
    // 부채꼴로 너무 길거나, 너무 가늘어 카드가 아닐 가능성도 필터
    if (stackH < cardH * 0.85 || stackH > cardH * 4.0) {
      rectified.mat.delete();
      continue;
    }

    const count = estimateStackCount(stackH, cardH);

    // 아래쪽(완전히 보이는) 카드 영역만 자른다
    const bottomH = Math.min(stackH, Math.round(cardH));
    const bottomY = Math.max(0, stackH - bottomH);
    const bottomRoi = rectified.mat.roi(new cv.Rect(0, bottomY, stackW, bottomH));
    const normalized = new cv.Mat();
    cv.resize(bottomRoi, normalized, new cv.Size(200, 279));
    bottomRoi.delete();

    const bbox = cv.boundingRect(contour);
    stacks.push({
      mat: normalized,
      count,
      boundingBox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
    });

    rectified.mat.delete();
  }

  gray.delete();
  blurred.delete();
  edges.delete();
  kernel.delete();
  closed.delete();
  contours.delete();
  hierarchy.delete();

  // Fallback: treat whole image as a single card if nothing was detected
  if (stacks.length === 0) {
    const resized = new cv.Mat();
    cv.resize(src, resized, new cv.Size(200, 279));
    stacks.push({
      mat: resized,
      count: 1,
      boundingBox: { x: 0, y: 0, width: src.cols, height: src.rows },
    });
  }

  return stacks;
}

// ── ORB matching ─────────────────────────────────────────────────────────────

function matchCard(
  regionMat: any,
): { cardId: string; confidence: number; matchCount: number } | null {
  if (!orbDb) return null;

  const gray = new cv.Mat();
  if (regionMat.channels() === 4) {
    cv.cvtColor(regionMat, gray, cv.COLOR_RGBA2GRAY);
  } else if (regionMat.channels() === 3) {
    cv.cvtColor(regionMat, gray, cv.COLOR_RGB2GRAY);
  } else {
    regionMat.copyTo(gray);
  }

  const orb = new cv.ORB(500);
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();
  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  const queryCount = descriptors.rows;
  if (queryCount < 5) {
    gray.delete();
    keypoints.delete();
    descriptors.delete();
    orb.delete();
    return null;
  }

  let bestCardId = "";
  let bestMatchCount = 0;

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);

  for (const entry of orbDb.cards) {
    if (entry.numKeypoints < 5) continue;

    const refDesc = new cv.Mat(entry.numKeypoints, 32, cv.CV_8UC1);
    refDesc.data.set(entry.descriptors);

    const matches = new cv.DMatchVector();
    try {
      bf.match(descriptors, refDesc, matches);
    } catch {
      refDesc.delete();
      matches.delete();
      continue;
    }

    let good = 0;
    for (let i = 0; i < matches.size(); i++) {
      if (matches.get(i).distance < 50) good++;
    }

    if (good > bestMatchCount) {
      bestMatchCount = good;
      bestCardId = entry.cardId;
    }

    refDesc.delete();
    matches.delete();
  }

  gray.delete();
  keypoints.delete();
  descriptors.delete();
  orb.delete();
  bf.delete();

  if (bestMatchCount < 10) return null;

  return {
    cardId: bestCardId,
    confidence: Math.min(bestMatchCount / queryCount, 1),
    matchCount: bestMatchCount,
  };
}

// ── Recognize ────────────────────────────────────────────────────────────────

async function recognize(imageBitmap: ImageBitmap) {
  try {
    if (!cv || !cv.Mat) {
      throw new Error("OpenCV not initialized — worker never completed init");
    }
    if (!orbDb) {
      throw new Error("ORB descriptor DB not loaded");
    }
    post({ type: "recognize-progress", stage: "Preprocessing...", percent: 0 });

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const src = cv.matFromImageData(imageData);

    post({ type: "recognize-progress", stage: "Detecting stacks...", percent: 10 });

    const stacks = detectCardStacks(src);
    const total = stacks.length;

    post({ type: "recognize-progress", stage: `Found ${total} stack(s)`, percent: 20 });

    const results: RecognizedCard[] = [];

    for (let i = 0; i < stacks.length; i++) {
      const stack = stacks[i];
      const pct = 20 + Math.round((i / total) * 70);
      post({
        type: "recognize-progress",
        stage: `Matching stack ${i + 1}/${total}...`,
        percent: pct,
        partialResults: results,
      });

      const match = matchCard(stack.mat);
      if (match) {
        results.push({ ...match, count: stack.count, boundingBox: stack.boundingBox });
      }

      stack.mat.delete();
    }

    src.delete();

    post({ type: "recognize-done", results });
  } catch (err) {
    post({ type: "recognize-error", error: String(err) });
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      init();
      break;
    case "recognize":
      recognize(msg.imageData);
      break;
  }
};
