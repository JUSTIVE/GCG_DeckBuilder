import type { DescriptionLine } from "@/components/CardDescription";

type KeywordEntry = {
  name: DescriptionLine;
  description: DescriptionLine;
};

function prose(ko: string, en: string): DescriptionLine {
  return [{ type: "prose", en, ko }];
}

export const KEYWORD_DESCRIPTIONS: Record<string, KeywordEntry> = {
  ACTIVATE_MAIN: {
    name: [{ type: "trigger", keyword: "ACTIVATE_MAIN" }],
    description: prose(
      "자신의 메인 페이지에 발동할 수 있는 효과. 「:」이 있는 경우 「:」 앞의 조건과 행동을 만족하면 발동할 수 있다. ※ 어느 유닛이 공격하는 동안은 발동할 수 없다.",
      "An effect that can be activated during your Main Phase. If it has ':', you must meet the condition and perform the action before ':' to activate it. Cannot be activated while any unit is attacking.",
    ),
  },
  ACTIVATE_ACTION: {
    name: [{ type: "trigger", keyword: "ACTIVATE_ACTION" }],
    description: prose(
      "액션 스텝에 발동할 수 있는 효과. 「:」이 있는 경우 「:」 앞의 조건과 행동을 만족하면 발동할 수 있다.",
      "An effect that can be activated during an Action Step. If it has ':', you must meet the condition and perform the action before ':' to activate it.",
    ),
  },
  MAIN: {
    name: [{ type: "trigger", keyword: "MAIN" }],
    description: prose(
      "커맨드 카드의 키워드. 이 카드는 자신의 메인 페이지에 패에서 플레이할 수 있다.",
      "A Command card keyword. This card can be played from your hand during your Main Phase.",
    ),
  },
  ACTION: {
    name: [{ type: "trigger", keyword: "ACTION" }],
    description: prose(
      "커맨드 카드의 키워드. 이 카드는 액션 스텝에 패에서 플레이할 수 있다. ※【파일럿】을 갖는 경우, 액션 스텝에 파일럿으로서 세트할 수는 없다.",
      "A Command card keyword. This card can be played from your hand during an Action Step. If it has [PILOT], it cannot be Set as a Pilot during an Action Step.",
    ),
  },
  BURST: {
    name: [{ type: "trigger", keyword: "BURST" }],
    description: prose(
      "실드가 파괴되어 앞면으로 되었을 때 발동할 수 있는 효과.",
      "An effect that can be activated when a Shield is destroyed and turned face-up.",
    ),
  },
  DEPLOY: {
    name: [{ type: "trigger", keyword: "DEPLOY" }],
    description: prose(
      "유닛 혹은 베이스가 새롭게 배틀 에어리어에 놓였을 때 발동하는 효과.",
      "An effect that activates when a Unit or Base is newly placed in the Battle Area.",
    ),
  },
  ATTACK: {
    name: [{ type: "trigger", keyword: "ATTACK" }],
    description: prose(
      "유닛이 공격했을 때 발동하는 효과.",
      "An effect that activates when a Unit attacks.",
    ),
  },
  DESTROYED: {
    name: [{ type: "trigger", keyword: "DESTROYED" }],
    description: prose(
      "유닛 혹은 베이스가 파괴되어, 배틀 에어리어(베이스의 경우 실드 에어리어)에서 트래시에 놓였을 때 발동하는 효과.",
      "An effect that activates when a Unit or Base is destroyed and sent from the Battle Area (or Shield Area for Bases) to the Trash.",
    ),
  },
  WHEN_PAIRED: {
    name: [{ type: "trigger", keyword: "WHEN_PAIRED" }],
    description: prose(
      "유닛에 파일럿이 세트되었을 때 발동하는 효과.",
      "An effect that activates when a Pilot is Set on a Unit.",
    ),
  },
  DURING_PAIR: {
    name: [{ type: "trigger", keyword: "DURING_PAIR" }],
    description: prose(
      "유닛에 파일럿이 세트되어 있는 동안 상시 발동되는 효과.",
      "An effect that is continuously active while a Pilot is Set on a Unit.",
    ),
  },
  PILOT: {
    name: [{ type: "trigger", keyword: "PILOT" }],
    description: prose(
      "주로【세트 시】혹은【세트 중】뒤에 붙는, 효과 발동을 위한 파일럿 조건.",
      "A Pilot condition mainly attached after [When Set] or [While Set], indicating which Pilot is required to activate the effect.",
    ),
  },
  WHEN_LINKED: {
    name: [{ type: "trigger", keyword: "WHEN_LINKED" }],
    description: prose(
      "유닛의 링크 조건에 맞는 파일럿이 세트되었을 때 발동하는 효과.",
      "An effect that activates when a Pilot matching the Unit's Link condition is Set.",
    ),
  },
  DURING_LINK: {
    name: [{ type: "trigger", keyword: "DURING_LINK" }],
    description: prose(
      "유닛의 링크 조건에 맞는 파일럿이 세트되어 있는 동안 발동하는 효과.",
      "An effect that activates while a Pilot matching the Unit's Link condition is Set.",
    ),
  },
  ONCE_PER_TURN: {
    name: [{ type: "trigger", keyword: "ONCE_PER_TURN" }],
    description: prose(
      "그 턴 중 1번만 발동할 수 있음을 나타내는 키워드.",
      "A keyword indicating this effect can only be activated once per turn.",
    ),
  },
  END_OF_TURN: {
    name: [{ type: "trigger", keyword: "END_OF_TURN" }],
    description: prose(
      "자신의 턴 종료 시에 발동하는 효과.",
      "An effect that activates at the end of your turn.",
    ),
  },
  REPAIR: {
    name: [
      { type: "ability", keyword: "REPAIR" },
      { type: "prose", en: " X", ko: " X" },
    ],
    description: prose(
      "자신의 턴 종료 시 X만큼 회복한다.",
      "At the end of your turn, recover X HP.",
    ),
  },
  BREACH: {
    name: [
      { type: "ability", keyword: "BREACH" },
      { type: "prose", en: " X", ko: " X" },
    ],
    description: prose(
      "자신의 턴 동안, 이 유닛이 배틀 대미지로 상대 유닛을 파괴했을 때, 그 유닛의 소유자의 실드 에어리어에 X 대미지를 준다.",
      "During your turn, when this unit destroys an opposing unit with Battle Damage, deal X damage to that unit owner's Shield Area.",
    ),
  },
  SUPPORT: {
    name: [
      { type: "ability", keyword: "SUPPORT" },
      { type: "prose", en: " X", ko: " X" },
    ],
    description: prose(
      "이 유닛을 레스트시키는 것으로, 다른 유닛을 1기 고른다. 이 턴 동안, 그 유닛을 AP +X 한다.",
      "By Resting this unit, choose 1 other friendly unit. Until the end of this turn, that unit gains AP +X.",
    ),
  },
  BLOCKER: {
    name: [{ type: "ability", keyword: "BLOCKER" }],
    description: prose(
      "블록 스텝에 이 유닛을 레스트시키는 것으로, 공격 대상을 이 유닛으로 변경한다.",
      "During a Block Step, by Resting this unit, change the attack target to this unit.",
    ),
  },
  FIRST_STRIKE: {
    name: [{ type: "ability", keyword: "FIRST_STRIKE" }],
    description: prose(
      "이 유닛이 공격한 배틀 중, 상대 유닛 혹은 베이스보다 먼저 대미지를 준다.",
      "During a battle in which this unit attacks, deal damage to the opposing unit or Base before they can retaliate.",
    ),
  },
  HIGH_MANEUVER: {
    name: [{ type: "ability", keyword: "HIGH_MANEUVER" }],
    description: prose(
      "이 유닛이 공격한 배틀 중, 상대 유닛의<블로커> 효과를 받지 않는다.",
      "During a battle in which this unit attacks, opposing units cannot activate [BLOCKER].",
    ),
  },
  SUPPRESSION: {
    name: [{ type: "ability", keyword: "SUPPRESSION" }],
    description: prose(
      "공격으로 실드에 주는 대미지는, 선두부터 2개에 동시에 부여된다.",
      "When dealing Shield damage through an attack, simultaneously deal damage to the top 2 Shields.",
    ),
  },
};
