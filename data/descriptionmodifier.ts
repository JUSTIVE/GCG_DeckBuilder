import { writeFile } from "node:fs/promises";

import descriptionModifier from "./descriptionmap.json";

const replaceList = {
  "】": "】 ",
  "  ": " ",
  "(Mafty)": "(마프티)",
  "(Earth Federation)": "(지구 연방)",
  "(Neo Zeon)": "(네오 지온)",
  "(Zeon)": "(지온)",
  "(Coordinator)": "(코디네이터)",
  "(White Base Team)": "(화이트베이스 부대)",
  "(ZAFT)": "(자프트)",
  "(Triple Ship Alliance)": "(삼척동맹)",
  "(Academy)": "(학원)",
  "(Tekkadan)": "(철화단)",
  "(Teiwaz)": "(테이와즈)",
  "(Vulture)": "(벌쳐)",
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
  "If you deploy this Unit from your trash,": "이 유닛을 트래시로부터 배치했다면,",
  "choose 1 of your Resources. Set it as active.":
    "자신의 리소스 1개를 선택한다. 그 리소스를 액티브로 한다.",
  "Choose 1 of your Resources. Set it as active.":
    "자신의 리소스 1개를 선택한다. 그 리소스를 액티브로 한다.",
  "Choose 1 friendly Link Unit.": "아군의 링크 유닛 1개를 선택한다.",
  "It gains <돌파 1> during this turn.": "이 턴 동안, 그 유닛은 <돌파 1>을 얻는다.",
  "This Unit gets AP+1 and HP+1.": "이 유닛을 AP+1, HP+1 한다.",
  "Set this Unit as active.": "이 유닛을 액티브로 한다.",
  "set this Unit as active.": "이 유닛을 액티브로 한다.",
  "when this Unit destroys an enemy Unit with battle damage,":
    "자신의 턴 동안, 이 유닛이 배틀 대미지로 상대의 유닛을 파괴했을 때,",
  "It recovers 3 HP.": "그 유닛을 3 회복한다.",
  "Choose 1 enemy Unit that is Lv.5 or lower.": "Lv.5 이하의 상대의 유닛 1개를 선택한다.",
  "It gets AP-2 during this turn.": "이 턴 동안, 그 유닛을 AP-2 한다.",
  "It can't attack during this turn.": "이 턴 동안, 그 유닛은 공격할 수 없다.",
  "Choose 1 enemy Unit that is Lv.4 or lower.": "Lv.4 이하의 상대의 유닛 1개를 선택한다.",
  "choose 1 enemy Unit that is Lv.4 or lower.": "Lv.4 이하의 상대의 유닛 1개를 선택한다.",
  "Then, choose 1 enemy Unit with 3 or less HP.": "그 후, HP3 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 enemy Unit with 2 or less AP.": "AP2 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 enemy Unit whose Lv. is equal to or lower than this Unit.":
    "이 유닛의 Lv. 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 friendly (자프트) Unit.": "(자프트)의 아군의 유닛 1개를 선택한다.",
  "Choose 1 rested enemy Unit.": "레스트의 상대의 유닛 1개를 선택한다.",
  "choose 1 rested enemy Unit.": "레스트의 상대의 유닛 1개를 선택한다.",
  "Choose 1 of your Units and 1 enemy Unit.": "자신의 유닛 1개와, 상대의 유닛 1개를 선택한다.",
  "Choose 1 of your Units.": "자신의 유닛 1개를 선택한다.",
  "If you do,": "그랬다면,",
  "If there are 7 or more cards in your trash,": "자신의 트래쉬에 카드가 7장 이상 있다면,",
  "You may discard 1.": "자신의 패 1장을 버릴 수 있다.",
  "look at the top 3 cards of your deck.": "자신의 덱을 위에서 3장 보고,",
  "Look at the top 3 cards of your deck.": "자신의 덱을 위에서 3장 보고,",
  "You may reveal 1 (벌쳐) Unit card among them and add it to your hand.":
    "그 중에 (벌쳐)의 유닛 카드 1장을 공개하고 패에 추가할 수 있다.",
  "If this Unit is damaged and Lv.5 or lower,": "이 유닛이 대미지를 받고 있고, Lv.5 이하라면,",
  "it gains <고기동> during this battle.": "이 배틀 동안, 이 유닛은 <고기동>을 얻는다.",
  "Choose 1 enemy Unit that is Lv.3 or lower.": "Lv.3 이하의 상대의 유닛 1개를 선택한다.",
  "Place the top 2 cards of your deck into your trash.":
    "자신의 덱을 위에서 2장, 자신의 트래쉬에 둔다.",
  "choose 1 enemy Unit with 2 or less AP.": "AP2 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 friendly (벌쳐) Unit.": "(벌쳐)의 아군의 유닛 1개를 선택한다.",
  "choose 1 friendly (벌쳐) Unit.": "(벌쳐)의 아군의 유닛 1개를 선택한다.",
  "During this turn, it may choose an active enemy Unit that is Lv.4 or lower as its attack target.":
    "이 턴 동안, 그 유닛은 액티브의 Lv.4 이하의 상대의 유닛을 공격 대상으로 선택할 수 있다.",
  "You may discard 1 Unit card.": "자신의 패의 유닛 카드 1장을 버릴 수 있다.",
  "return the card paired with this Unit to your hand.":
    "이 유닛에 세트되어 있는 카드를 패로 되돌린다.",
  "When this Unit receives enemy effect damage,": "이 유닛이 상대의 효과 대미지를 받았을 때,",
  "It gets AP+1 during this turn.": "이 턴 동안, 그 유닛을 AP+1 한다.",
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
