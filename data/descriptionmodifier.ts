import { writeFile } from "node:fs/promises";

import descriptionModifier from "./descriptionmap.json";

const replaceList = {
  "(Zeon)": "(지온)",
  "(Coordinator)": "(코디네이터)",
  "(ZAFT)": "(자프트)",
  "this Unit gets AP+2 during this battle.": "이 배틀 동안, 이 유닛을 AP+2 한다.",
  "If you are attacking the enemy player,": "상대 플레이어를 공격하고 있다면,",
};

function applyReplacements(v: string): string {
  for (const [key, value] of Object.entries(replaceList)) {
    v = v.replaceAll(key, value);
  }
  return v;
}

const modifiedDescriptionModifier = Object.fromEntries(
  Object.entries(descriptionModifier).map(([k, v]) => [k, applyReplacements(v)]),
);

await writeFile("descriptionmap.json", JSON.stringify(modifiedDescriptionModifier, null, 2));
