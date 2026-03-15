import raw from "./raw.json";
import { writeFile } from "node:fs/promises";

const mapped = raw.map((x) => {
  if (x.description == null) return x;
  return {
    ...x,
    description: x.description.map((x) =>
      x
        .replaceAll("<Repair", "<리페어")
        .replaceAll("【During Pair】", "【세트 중】")
        .replaceAll("<Blocker>", "<블로커>")
        .replaceAll(
          "(Rest this Unit to change the attack target to it.)",
          "(레스트 하는 것으로 어택 대상을 이 유닛으로 한다.)",
        )
        .replaceAll(
          "(At the end of your turn, this Unit recovers the specified number of HP.)",
          "(자신의 턴 종료 시, 이 유닛을 지정된 수 회복한다.)",
        )
        .replaceAll("【Burst】Add this card to your hand.", "【버스트】 이 카드를 패에 추가한다.")
        .replaceAll("【Burst】Deploy this card.", "【Burst】 이 카드를 배치한다.")
        .replaceAll("【Burst】", "【버스트】")
        .replaceAll("【Attack】", "【어택 시】")
        .replaceAll("【Main】", "【메인】")
        .replaceAll("【Pilot】", "【파일럿】")
        .replaceAll(
          "【Deploy】Add 1 of your Shields to your hand.",
          "【Deploy】 자신의 실드 1장을 패에 추가한다.",
        )
        .replaceAll("【Deploy】", "【배치 시】")
        .replaceAll("【Activate･Main】", "【기동･메인】")
        .replaceAll("【Once per Turn】", "【턴 1회】")
        .replaceAll("<Breach", "<돌파")
        .replaceAll(
          "(When this Unit's attack destroys an enemy Unit, deal the specified amount of damage to the first card in that opponent's shield area.)",
          "(어택으로 상대의 유닛을 파괴했을 때, 그 상대의 실드 에리어의 가장 위의 카드 1장에 지정된 수의 대미지를 준다.)",
        )
        .replaceAll("【During Link】", "【링크 중】")
        .replaceAll("【Action】", "【액션】")
        .replaceAll("<High-Maneuver>", "<고기동>")
        .replaceAll("(This Unit can't be blocked.)", "(이 유닛은 블록당하지 않는다.)")
        .replaceAll("<Support", "<원호")
        .replaceAll(
          "(Rest this Unit. 1 other friendly Unit gets AP+(specified amount) during this turn.)",
          "(레스트하는 것으로 이 턴 동안 다른 아군의 유닛 1개를 AP+(지정된 수)한다.)",
        )
        .replaceAll("【Destroyed】", "【파괴 시】")
        .replaceAll("【When Paired】", "【세트 시】")
        .replaceAll("【When Linked】", "【링크 시】")
        .replaceAll("<Suppression>", "<제압>")
        .replaceAll(
          "(Damage to Shields by an attack is dealt to the first 2 cards simultaneously.)",
          "(어택으로 실드에 주는 대미지는, 선두부터 2개에 동시에 부여된다.)",
        )
        .replaceAll("<First Strike>", "<선제 공격>")
        .replaceAll(
          "(While this Unit is attacking, it deals damage before the enemy Unit.)",
          "(어택 중의 이 유닛은, 상대보다 먼저 대미지를 준다.)",
        )
        .replaceAll("At the end of your turn", "자신의 턴 종료 시,"),
    ),
  };
});

await writeFile("../data/mapped.json", JSON.stringify(mapped, null, 2), "utf-8");
