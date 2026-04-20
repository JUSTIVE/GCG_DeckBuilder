import type { OrbDescriptorDb, OrbDescriptorEntry } from "./card-recognition-types";
import { ORB_DB_MAGIC, ORB_DESCRIPTOR_SIZE, ORB_CARD_ID_SIZE } from "./card-recognition-types";

const textDecoder = new TextDecoder("utf-8");

export function parseOrbDb(buffer: ArrayBuffer): OrbDescriptorDb {
  const view = new DataView(buffer);
  let offset = 0;

  const magic = view.getUint32(offset, true);
  offset += 4;
  if (magic !== ORB_DB_MAGIC) {
    throw new Error(`Invalid ORB DB magic: 0x${magic.toString(16)}`);
  }

  const version = view.getUint16(offset, true);
  offset += 2;
  const maxFeatures = view.getUint16(offset, true);
  offset += 2;
  const descriptorSize = view.getUint16(offset, true);
  offset += 2;
  if (descriptorSize !== ORB_DESCRIPTOR_SIZE) {
    throw new Error(`Unexpected descriptor size: ${descriptorSize}`);
  }

  const cardCount = view.getUint16(offset, true);
  offset += 2;
  // 4 bytes reserved
  offset += 4;

  const cards: OrbDescriptorEntry[] = [];

  for (let i = 0; i < cardCount; i++) {
    const idBytes = new Uint8Array(buffer, offset, ORB_CARD_ID_SIZE);
    offset += ORB_CARD_ID_SIZE;

    const nullIdx = idBytes.indexOf(0);
    const cardId = textDecoder.decode(nullIdx >= 0 ? idBytes.subarray(0, nullIdx) : idBytes);

    const numKeypoints = view.getUint16(offset, true);
    offset += 2;

    const descLen = numKeypoints * ORB_DESCRIPTOR_SIZE;
    const descriptors = new Uint8Array(buffer, offset, descLen);
    offset += descLen;

    cards.push({ cardId, descriptors, numKeypoints });
  }

  return { version, maxFeatures, descriptorSize, cards };
}
