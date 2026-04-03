import { writeFile } from "node:fs/promises";

import descriptionModifier from "./descriptionmap.json";

const replaceList = {
  "】": "】 ",
  "  ": " ",
  "(Earth Federation)": "(지구 연방)",
  "(Neo Zeon)": "(네오 지온)",
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
  "If another friendly (Clan) Unit is in play,": "이 유닛 이외의, (클랜)의 아군의 유닛이 있다면,",
  "Choose 1 to 2 friendly (Clan) Units.": "(클랜)의 아군의 유닛 1~2개를 선택한다.",
  "They get AP+2 during this turn.": "이 턴 동안, 그 유닛들을 AP+2 한다.",
  "If you have a (Clan) Unit in play,": "(클랜)의 자신의 유닛이 있다면,",
  "Then, if it is your turn,": "그 후, 자신의 턴 이라면,",
  "It can't receive battle damage from enemy Units with 2 or less AP during this battle.":
    "이 배틀 동안, 그 유닛은 AP2 이하의 상대의 유닛으로부터 배틀 대미지를 받지 않는다.",
  "Return the remaining cards randomly to the bottom of your deck.":
    "남은 카드는 무작위로 덱의 밑으로 되돌린다.",
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
