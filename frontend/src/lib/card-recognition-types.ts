export interface RecognizedCard {
  cardId: string;
  confidence: number;
  matchCount: number;
  count: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export type WorkerInMessage = { type: "init" } | { type: "recognize"; imageData: ImageBitmap };

export type WorkerOutMessage =
  | { type: "init-progress"; stage: string; percent: number }
  | { type: "init-done" }
  | { type: "init-error"; error: string }
  | {
      type: "recognize-progress";
      stage: string;
      percent: number;
      partialResults?: RecognizedCard[];
    }
  | { type: "recognize-done"; results: RecognizedCard[] }
  | { type: "recognize-error"; error: string };

export interface OrbDescriptorEntry {
  cardId: string;
  descriptors: Uint8Array; // flat buffer: N rows × 32 bytes per row
  numKeypoints: number;
}

export interface OrbDescriptorDb {
  version: number;
  maxFeatures: number;
  descriptorSize: number;
  cards: OrbDescriptorEntry[];
}

// Binary format constants
export const ORB_DB_MAGIC = 0x4f524264; // "ORBd"
export const ORB_DB_VERSION = 1;
export const ORB_DESCRIPTOR_SIZE = 32;
export const ORB_MAX_FEATURES = 500;
export const ORB_CARD_ID_SIZE = 16;
