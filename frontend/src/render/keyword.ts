export const renderKeyword = (keyword: string) => {
  switch (keyword) {
    case "ACTION":
      return "액션";
    case "ACTIVATE_ACTION":
      return "기동 - 액션";
    case "ACTIVATE_MAIN":
      return "기동 - 메인";
    case "ATTACK":
      return "공격시";
    case "BLOCKER":
      return "블로커";
    case "BREACH":
      return "돌파";
    case "BURST":
      return "버스트";
    case "DEPLOY":
      return "배포시";
    case "DESTROYED":
      return "파괴시";
    case "DURING_LINK":
      return "링크 중";
    case "DURING_PAIR":
      return "페어 중";
    case "FIRST_STRIKE":
      return "선제공격";
    case "HIGH_MANEUVER":
      return "고기동";
    case "SUPPRESSION":
      return "제압";
    case "MAIN":
      return "메인";
    case "ONCE_PER_TURN":
      return "턴에 1회";
    case "END_OF_TURN":
      return "내 턴이 끝날 때";
    case "PILOT":
      return "파일럿";
    case "REPAIR":
      return "리페어";
    case "SUPPORT":
      return "원호";
    case "WHEN_LINKED":
      return "링크시";
    case "WHEN_PAIRED":
      return "페어시";
    default:
      return "";
  }
};
