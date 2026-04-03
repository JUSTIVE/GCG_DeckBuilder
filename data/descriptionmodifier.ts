import { writeFile } from "node:fs/promises";

import descriptionModifier from "./descriptionmap.json";

const replaceList: {
  "(Zeon)": "(지온)";
};

function applyReplacements(v: string): string {
  for (const [key, value] of Object.entries(replaceList)) {
    v = v.replaceAll(key, value);
  }
  return v;
}

const modifiedDescriptionModifier = Object.fromEntries(
  Object.fromEntries(descriptionModifier).map(([k, v]) => [k, applyReplacements(v)]),
);

await writeFile("descriptionmap.json", JSON.stringify(modifiedDescriptionModifier, null, 2));
