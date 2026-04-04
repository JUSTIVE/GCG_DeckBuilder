export const KEYWORD_DESCRIPTIONS: Record<
  string,
  { name: string; description: string }
> = {
  ACTIVATE_MAIN: {
    name: "【기동･메인】",
    description:
      "자신의 메인 페이지에 발동할 수 있는 효과. 「:」이 있는 경우 「:」 앞의 조건과 행동을 만족하면 발동할 수 있다. ※ 어느 유닛이 공격하는 동안은 발동할 수 없다.",
  },
  ACTIVATE_ACTION: {
    name: "【기동･액션】",
    description:
      "액션 스텝에 발동할 수 있는 효과. 「:」이 있는 경우 「:」 앞의 조건과 행동을 만족하면 발동할 수 있다.",
  },
  MAIN: {
    name: "【메인】",
    description:
      "커맨드 카드의 키워드. 이 카드는 자신의 메인 페이지에 패에서 플레이할 수 있다.",
  },
  ACTION: {
    name: "【액션】",
    description:
      "커맨드 카드의 키워드. 이 카드는 액션 스텝에 패에서 플레이할 수 있다. ※【파일럿】을 갖는 경우, 액션 스텝에 파일럿으로서 세트할 수는 없다.",
  },
  BURST: {
    name: "【버스트】",
    description: "실드가 파괴되어 앞면으로 되었을 때 발동할 수 있는 효과.",
  },
  DEPLOY: {
    name: "【배치 시】",
    description:
      "유닛 혹은 베이스가 새롭게 배틀 에어리어에 놓였을 때 발동하는 효과.",
  },
  ATTACK: {
    name: "【공격 시】",
    description: "유닛이 공격했을 때 발동하는 효과.",
  },
  DESTROYED: {
    name: "【파괴 시】",
    description:
      "유닛 혹은 베이스가 파괴되어, 배틀 에어리어(베이스의 경우 실드 에어리어)에서 트래시에 놓였을 때 발동하는 효과.",
  },
  WHEN_PAIRED: {
    name: "【세트 시】",
    description: "유닛에 파일럿이 세트되었을 때 발동하는 효과.",
  },
  DURING_PAIR: {
    name: "【세트 중】",
    description: "유닛에 파일럿이 세트되어 있는 동안 상시 발동되는 효과.",
  },
  PILOT: {
    name: "【파일럿】",
    description:
      "주로【세트 시】혹은【세트 중】뒤에 붙는, 효과 발동을 위한 파일럿 조건.",
  },
  WHEN_LINKED: {
    name: "【링크 시】",
    description:
      "유닛의 링크 조건에 맞는 파일럿이 세트되었을 때 발동하는 효과.",
  },
  DURING_LINK: {
    name: "【링크 중】",
    description:
      "유닛의 링크 조건에 맞는 파일럿이 세트되어 있는 동안 발동하는 효과.",
  },
  ONCE_PER_TURN: {
    name: "【턴 1회】",
    description: "그 턴 중 1번만 발동할 수 있음을 나타내는 키워드.",
  },
  END_OF_TURN: {
    name: "【내 턴이 끝날 때】",
    description: "자신의 턴 종료 시에 발동하는 효과.",
  },
  REPAIR: {
    name: "<리페어 X>",
    description: "자신의 턴 종료 시 X만큼 회복한다.",
  },
  BREACH: {
    name: "<돌파 X>",
    description:
      "자신의 턴 동안, 이 유닛이 배틀 대미지로 상대 유닛을 파괴했을 때, 그 유닛의 소유자의 실드 에어리어에 X 대미지를 준다.",
  },
  SUPPORT: {
    name: "<원호 X>",
    description:
      "이 유닛을 레스트시키는 것으로, 다른 유닛을 1기 고른다. 이 턴 동안, 그 유닛을 AP +X 한다.",
  },
  BLOCKER: {
    name: "<블로커>",
    description:
      "블록 스텝에 이 유닛을 레스트시키는 것으로, 공격 대상을 이 유닛으로 변경한다.",
  },
  FIRST_STRIKE: {
    name: "<선제공격>",
    description:
      "이 유닛이 공격한 배틀 중, 상대 유닛 혹은 베이스보다 먼저 대미지를 준다.",
  },
  HIGH_MANEUVER: {
    name: "<고기동>",
    description:
      "이 유닛이 공격한 배틀 중, 상대 유닛의<블로커> 효과를 받지 않는다.",
  },
  SUPPRESSION: {
    name: "<제압>",
    description:
      "공격으로 실드에 주는 대미지는, 선두부터 2개에 동시에 부여된다.",
  },
};
