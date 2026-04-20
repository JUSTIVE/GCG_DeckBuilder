/**
 * Card Recognition Web Worker
 *
 * OpenCV.js WASM를 로드하고, 사전 추출된 ORB 디스크립터 DB와 대조해
 * 사진 속 카드를 인식한다. 메인 스레드와 structured clone으로 통신.
 */

import type {
  WorkerInMessage,
  WorkerOutMessage,
  RecognizedCard,
} from "../lib/card-recognition-types";
import { parseOrbDb, type OrbDescriptorDb } from "../lib/orb-db-parser";

declare const self: DedicatedWorkerGlobalScope;
declare function importScripts(...urls: string[]): void;

let cv: any = null;
let orbDb: OrbDescriptorDb | null = null;

function post(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    post({ type: "init-progress", stage: "Loading OpenCV.js...", percent: 0 });

    // Load OpenCV.js WASM — the file sets a global `cv` via Module pattern
    await new Promise<void>((resolve, reject) => {
      (self as any).Module = {
        onRuntimeInitialized: () => resolve(),
      };
      try {
        importScripts("/opencv/opencv.js");
      } catch (e) {
        reject(e);
      }
      // If onRuntimeInitialized hasn't fired yet, give it time
      setTimeout(() => resolve(), 5000);
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

// ── Card region detection ────────────────────────────────────────────────────

interface CardRegion {
  mat: any; // rectified card image (cv.Mat)
  boundingBox: { x: number; y: number; width: number; height: number };
}

function detectCardRegions(src: any): CardRegion[] {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Blur to reduce noise
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // Edge detection
  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 50, 150);

  // Dilate to close gaps
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  const dilated = new cv.Mat();
  cv.dilate(edges, dilated, kernel);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const regions: CardRegion[] = [];
  const minArea = src.rows * src.cols * 0.01; // at least 1% of image
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area < minArea) continue;

    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    if (approx.rows === 4) {
      // Found a quadrilateral — extract perspective-corrected card
      const pts = [];
      for (let j = 0; j < 4; j++) {
        pts.push({ x: approx.intAt(j, 0), y: approx.intAt(j, 1) });
      }

      // Order points: top-left, top-right, bottom-right, bottom-left
      const ordered = orderPoints(pts);
      const dstW = 200;
      const dstH = 279;

      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        ordered[0].x,
        ordered[0].y,
        ordered[1].x,
        ordered[1].y,
        ordered[2].x,
        ordered[2].y,
        ordered[3].x,
        ordered[3].y,
      ]);
      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dstW, 0, dstW, dstH, 0, dstH]);

      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(dstW, dstH));

      const rect = cv.boundingRect(contour);
      regions.push({
        mat: warped,
        boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      });

      srcPts.delete();
      dstPts.delete();
      M.delete();
    }

    approx.delete();
  }

  // Cleanup
  gray.delete();
  blurred.delete();
  edges.delete();
  kernel.delete();
  dilated.delete();
  contours.delete();
  hierarchy.delete();

  // Fallback: if no cards detected, treat the whole image as one card
  if (regions.length === 0) {
    const resized = new cv.Mat();
    cv.resize(src, resized, new cv.Size(200, 279));
    regions.push({
      mat: resized,
      boundingBox: { x: 0, y: 0, width: src.cols, height: src.rows },
    });
  }

  return regions;
}

function orderPoints(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  // Sort by sum (x+y) for TL and BR, diff (y-x) for TR and BL
  const sorted = [...pts];
  sorted.sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = sorted[0];
  const br = sorted[3];

  sorted.sort((a, b) => a.y - a.x - (b.y - b.x));
  const tr = sorted[0];
  const bl = sorted[3];

  return [tl, tr, br, bl];
}

// ── ORB matching ─────────────────────────────────────────────────────────────

function matchCard(
  regionMat: any,
): { cardId: string; confidence: number; matchCount: number } | null {
  if (!orbDb) return null;

  // Convert region to grayscale
  const gray = new cv.Mat();
  if (regionMat.channels() === 4) {
    cv.cvtColor(regionMat, gray, cv.COLOR_RGBA2GRAY);
  } else if (regionMat.channels() === 3) {
    cv.cvtColor(regionMat, gray, cv.COLOR_RGB2GRAY);
  } else {
    regionMat.copyTo(gray);
  }

  // Extract ORB features from the query region
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

  // Match against each card in the database
  const bf = new cv.BFMatcher(cv.NORM_HAMMING, true); // cross-check

  for (const entry of orbDb.cards) {
    if (entry.numKeypoints < 5) continue;

    // Create Mat from stored descriptors
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

    // Count good matches (Hamming distance < 50)
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
    post({ type: "recognize-progress", stage: "Preprocessing...", percent: 0 });

    // Draw ImageBitmap to OffscreenCanvas to get pixel data
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create OpenCV Mat from pixel data
    const src = cv.matFromImageData(imageData);

    post({ type: "recognize-progress", stage: "Detecting cards...", percent: 10 });

    const regions = detectCardRegions(src);
    const total = regions.length;

    post({ type: "recognize-progress", stage: `Found ${total} card region(s)`, percent: 20 });

    const results: RecognizedCard[] = [];

    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const pct = 20 + Math.round((i / total) * 70);
      post({
        type: "recognize-progress",
        stage: `Matching card ${i + 1}/${total}...`,
        percent: pct,
        partialResults: results,
      });

      const match = matchCard(region.mat);
      if (match) {
        results.push({ ...match, boundingBox: region.boundingBox });
      }

      region.mat.delete();
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
