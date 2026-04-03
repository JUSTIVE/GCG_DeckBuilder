import { writeFile } from "node:fs/promises";

import descriptionModifier from "./descriptionmap.json";

const replaceList = {
  "】": "】 ",
  "  ": " ",
  "(Zeon)": "(지온)",
  "(Coordinator)": "(코디네이터)",
  "(ZAFT)": "(자프트)",
  "(Triple Ship Alliance)": "(삼척동맹)",
  "this Unit gets AP+2 during this battle.": "이 배틀 동안, 이 유닛을 AP+2 한다.",
  "If you are attacking the enemy player,": "상대 플레이어를 공격하고 있다면,",
  "Choose 1 enemy Unit with 5 or less HP.": "HP5 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 to 2 enemy Units with 3 or less HP.": "HP3 이하의 상대의 유닛 1~2개를 선택한다.",
  "Rest them": "그 카드들을 레스트로 한다",
  "Draw 2": "자신은 2장 드로우 한다",
  "Place 1 EX Resource": "자신은 EX리소스 1개를 얻는다",
  "Return it to its owner's hand.": "그 유닛을 주인의 패로 되돌린다.",
  "Choose 1 friendly Unit with <블로커>.": "<블로커>를 가진 아군의 유닛 1개를 선택한다.",
  "It gets AP+3 during this turn.": "이 턴 동안, 그 유닛을 AP+3 한다.",
  "It gets AP-3 during this turn.": "이 턴 동안, 그 유닛을 AP-3 한다.",
  "Choose 1 damaged enemy Unit.": "대미지를 받은 상대의 유닛 1개를 선택한다.",
  "Rest this Base：": "이 베이스를 레스트로 한다: ",
  "Choose 1 friendly Unit.": "아군의 유닛 1개를 선택한다.",
  "It gets AP+2 during this turn.": "이 턴 동안, 그 유닛을 AP+2 한다.",
  "It recovers 1 HP.": "그 유닛을 1 회복한다.",
  "Choose 1 enemy Unit with 2 or less HP.": "HP2 이하의 상대의 유닛 1개를 선택한다.",
  "It gets AP-1 during this turn.": "이 턴 동안, 그 유닛을 AP-1 한다.",
  "Add it to your hand.": "그 카드를 패에 추가한다.",
  "Choose 1 enemy Unit that is Lv.2 or lower.": "Lv.2 이하의 상대의 유닛 1개를 선택한다.",
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
