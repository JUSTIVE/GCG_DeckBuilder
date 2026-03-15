import type { Card } from "./dataTypes";

export const ST07: Record<string, Card> = {
  "ST05-014": {
    __typename: "CommandCard",
    id: "ST05-014",
    name: "치명의 일격",
    level: 4,
    cost: 2,
    color: "PURPLE",
    rarity: "COMMON",
    series: "MOBILE_SUIT_GUNDAM_00",
    pack: "ST07",
    keywords: ["BURST", "MAIN"],
    description: [
      "[버스트] 적 유닛 1개를 선택합니다. 그 유닛에 1데미지를 입힙니다.",
      "[메인] 레벨 3 이하의 적 유닛 1개를 선택합니다. 그 유닛을 파괴합니다.",
    ],
  },
  "ST07-001": {
    __typename: "UnitCard",
    id: "ST07-001",
    name: "건담 엑시아",
    level: 5,
    cost: 4,
    color: "PURPLE",
    rarity: "LEGENDARY_RARE",
    zone: ["SPACE", "EARTH"],
    trait: ["CB", "GN_DRIVE"],
    links: [
      {
        pilot: "ST07-009",
      },
    ],
    series: "MOBILE_SUIT_GUNDAM_00",
    pack: "ST07",
  },
  "ST07-009": {
    id: "ST07-009",
    __typename: "PilotCard",
    name: "세츠나 F. 세이에이",
    level: 4,
    cost: 1,
    color: "PURPLE",
    description: [
      "[버스트] 이 카드를 손패에 추가합니다.",
      "[공격 시] 이 유닛은 이번 턴에 AP+1 를 얻습니다. 만약 트래시에 7장 이상의 (CB) 카드가 있다면, 대신 플레이어의 모든 (CB) 유닛이 AP+1를 얻습니다.",
    ],
    keywords: ["BURST", "ATTACK"],
    AP: 2,
    HP: 1,
    series: "MOBILE_SUIT_GUNDAM_00",
    pack: "ST07",
  },
  "ST07-015": {
    id: "ST07-015",
    __typename: "BaseCard",
    AP: 0,
    HP: 5,
    color: "PURPLE",
    cost: 1,
    level: 2,
    description: [
      "[버스트] 이 카드를 배포합니다.",
      "[배포 시] 실드 1장을 손패로 가져옵니다.",						"만약 레스팅된 아군 (CB) 유닛이 있다면, 이 베이스는 레벨 3 이이하의 "
    ]
  }
};
