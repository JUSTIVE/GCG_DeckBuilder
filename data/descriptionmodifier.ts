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
  "(AEUG)": "(에우고)",
  "(New UNE)": "(신지구연방군)",
  "(Vagan)": "(베이건)",
  "(Gjallarhorn)": "(걀라르호른)",
  "(Clan)": "(클랜)",
  "(Titans)": "(티탄즈)",
  "(Jupitris)": "(주피트리스)",
  "(Operation Meteor)": "(오퍼레이션 메테오)",
  "(Superpower Bloc)": "(초대국군)",
  "(X-Rounder)": "(X-라운더)",
  "(CB)": "(솔레스탈 비잉)",
  "(G Team)": "(G-팀)",
  "(Maganac Corps)": "(마그아낙 부대)",
  "(Cyclops Team)": "(사이클롭스 부대)",
  "AGE System": "AGE 시스템",
  "[Hy-Gogg]": "[하이-곡그]",
  "Pilot】": "파일럿】",
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
    "이 유닛이 배틀 대미지로 상대의 유닛을 파괴했을 때,",
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
  "if you do,": "그랬다면,",
  "If there are 7 or more cards in your trash,": "자신의 트래쉬에 카드가 7장 이상 있다면,",
  "You may discard 1.": "자신의 패 1장을 버릴 수 있다.",
  "look at the top 3 cards of your deck.": "자신의 덱을 위에서 3장 보고,",
  "Look at the top 3 cards of your deck.": "자신의 덱을 위에서 3장 보고,",
  "look at the top 5 cards of your deck.": "자신의 덱을 위에서 5장 보고,",
  "Look at the top 5 cards of your deck.": "자신의 덱을 위에서 5장 보고,",
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
  "choose 1 enemy Unit with <블로커>.": "<블로커>를 가진 상대의 유닛 1개를 선택한다.",
  "Choose 1 enemy Unit with <블로커>.": "<블로커>를 가진 상대의 유닛 1개를 선택한다.",
  "If this is a blue Unit,": "이 유닛이 청색이라면,",
  "If this is a purple Unit,": "이 유닛이 자색이라면,",
  "If this is a red Unit,": "이 유닛이 적색이라면,",
  "If this is a green Unit,": "이 유닛이 녹색이라면,",

  "If this Unit is blue,": "이 유닛이 청색이라면,",
  "If this Unit is red,": "이 유닛이 적색이라면,",
  "If this Unit is green,": "이 유닛이 녹색이라면,",
  "If this Unit is purple,": "이 유닛이 자색이라면,",
  "choose 1 enemy Unit whose Lv. is equal to or lower than this Unit.":
    "이 유닛의 Lv. 이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 friendly damaged Unit.": "대미지를 받고 있는 아군의 유닛 1개를 선택한다.",
  "It recovers 2 HP.": "그 유닛을 2 회복한다.",
  "Choose 1 to 2 enemy Units that are Lv.2 or lower.": "Lv.2 이하의 상대의 유닛 1~2개를 선택한다.",
  "choose 1 friendly blue Unit.": "청색의 아군의 유닛 1개를 선택한다.",
  "choose 1 friendly purple Unit.": "자색의 아군의 유닛 1개를 선택한다.",
  "choose 1 friendly red Unit.": "적색의 아군의 유닛 1개를 선택한다.",
  "choose 1 friendly green Unit.": "녹색의 아군의 유닛 1개를 선택한다.",
  "Then, choose 1 rested enemy Unit that is Lv.4 or lower.":
    "레스트의 Lv.4 이하의 상대의 유닛 1개를 선택한다.",
  "This Unit gets AP+3.": "이 유닛을 AP+3 한다.",
  "This Unit gets AP+2.": "이 유닛을 AP+2 한다.",
  "This Unit gets AP+1.": "이 유닛을 AP+1 한다.",
  "this Unit gets AP+3.": "이 유닛을 AP+3 한다.",
  "this Unit gets AP+2.": "이 유닛을 AP+2 한다.",
  "this Unit gets AP+1.": "이 유닛을 AP+1 한다.",
  "this Unit gains <선제 공격>.": "이 유닛은 <선제 공격>을 얻는다.",
  "This Unit gains <선제 공격>.": "이 유닛은 <선제 공격>을 얻는다.",
  "While you are Lv.7 or higher,": "자신의 레벨이 Lv.7 이상인 동안,",
  "while you are Lv.7 or higher,": "자신의 레벨이 Lv.7 이상인 동안,",
  "this Unit gains <돌파 5>": "이 유닛은 <돌파 5>를 얻는다.",
  "This Unit gains <돌파 5>": "이 유닛은 <돌파 5>를 얻는다.",
  "this Unit gains <돌파 3>": "이 유닛은 <돌파 3>를 얻는다.",
  "This Unit gains <돌파 3>": "이 유닛은 <돌파 3>를 얻는다.",
  "if you are Lv.7 or higher,": "자신이 Lv.7 이상이라면,",
  "If you are Lv.7 or higher,": "자신이 Lv.7 이상이라면,",
  "It gains <돌파 2> during this turn.": "이 턴 동안, 그 유닛은 <돌파 2>를 얻는다.",
  "This Unit gains <제압> during this turn.": "이 턴 동안, 이 유닛은 <제압>을 얻는다.",
  "If there are 3 or less enemy Shields,": "상대의 실드가 3개 이하라면,",
  "During your opponent's turn,": "상대의 턴 동안,",
  "when one of your Units is rested by one of your opponent's effects,":
    "자신의 유닛이 상대의 효과로 레스트가 되었을 때,",
  "choose 1 enemy Unit with 4 or less HP.": "HP4 이하의 상대의 유닛 1개를 선택한다.",
  "draw 1.": "자신은 1장 드로우 한다.",
  "this Unit gains <블로커>.": "이 유닛은 <블로커>를 얻는다.",
  "It gains <고기동> during this turn.": "이 턴 동안, 그 유닛은 <고기동>을 얻는다.",
  "It gains <블로커> during this turn.": "이 턴 동안, 그 유닛은 <블로커>를 얻는다.",
  "it gains <리페어 3>.": "이 유닛은 <리페어 3>을 얻는다.",
  "Choose 1 enemy Unit that is Lv.5 or higher.": "Lv.5 이상의 상대의 유닛 1개를 선택한다.",
  "If you have another (신지구연방군) Unit in play,":
    "이 유닛 이외의, (신지구연방군)의 자신의 유닛이 있다면,",
  "Choose 1 of your other (신지구연방군) Units.":
    "이 유닛 이외의, (신지구연방군)의 자신의 유닛 1개를 선택한다.",
  "It can't receive battle damage from enemy Units with 2 or less HP during this turn.":
    "이 턴 동안, 그 유닛은 HP2 이하의 상대의 유닛으로부터 배틀 대미지를 받지 않는다.",
  "Choose 1 of your (신지구연방군) Units.": "(신지구연방군)의 자신의 유닛 1개를 선택한다.",
  "deploy 1 rested [Daughtress]((신지구연방군)･AP0･HP1) Unit token.":
    "[도트레스]((신지구연방군)･AP0･HP1)의 유닛 토큰 1개를 레스트로 배치한다.",
  "If this Unit has 5 or more AP and it is attacking an enemy Unit,":
    "이 유닛이 AP5 이상이고, 상대의 유닛에 공격하고 있다면,",
  "Choose 1 enemy Unit token.": "상대의 유닛 토큰 1개를 선택한다.",
  "Destroy this and choose 1 enemy Unit that is Lv.5 or lower.":
    "이 유닛을 파괴하고 Lv.5 이하의 상대의 유닛 1개를 선택한다.",
  "Rest this Unit：": "이 유닛을 레스트로 한다:",
  "If there are 4 or more (걀라르호른) cards in your trash,":
    "자신의 트래쉬에 (걀라르호른)의 카드가 4장 이상 있다면,",
  "Then,": "그 후,",
  "if a friendly (걀라르호른) Unit is in play,": "(걀라르호른)의 아군의 유닛이 있다면,",
  "This Base can't receive enemy effect damage.":
    "이 베이스는 상대로부터 효과 대미지를 받지 않는다.",
  "Choose 1 of your (에우고) Units/Bases.": "(에우고)의 자신의, 유닛 1개/베이스 1개를 선택한다.",
  "Choose 1 damaged friendly Unit.": "대미지를 받고 있는 아군의 유닛 1개를 선택한다.",
  "Pay its cost to deploy it.": "그 유닛의 코스트를 지불하고 배치한다.",
  "You may choose 1 (베이건) Unit card that is Lv.2 or lower from your trash.":
    "자신의 트래쉬의 Lv.2 이하의 (베이건)의 유닛 카드 1장을 선택할 수 있다.",
  "Choose 6 purple Unit cards from your trash.":
    "자신의 트래쉬에서 자색의 유닛 카드 6장을 선택한다.",
  "Exile them from the game.": "그 카드들을 게임에서 제외한다.",
  "Choose 1 purple Pilot card from your trash.":
    "자신의 트래쉬에서 자색의 파일럿 카드 1장을 선택한다.",
  "If a friendly (테이와즈) Link Unit is in play,": "(테이와즈)의 아군의 링크 유닛이 있다면,",
  "Choose 1 of your (New UNE) Units.": "(신지구연방군)의 자신의 유닛 1개를 선택한다.",
  "when this Unit destroys an enemy Unit paired with a (Newtype) Pilot with battle damage,":
    "이 유닛이 배틀 대미지로 (뉴타입)의 파일럿이 세트 되어있는 상대의 유닛을 파괴했을 때,",
  "Deal 1 damage to all enemy Units other than Link Units.":
    "링크 유닛 이외의, 상대의 유닛 전부에 1 대미지를 준다.",
  "Choose 1 friendly (Clan) Unit.": "(클랜)의 아군의 유닛 1개를 선택한다.",
  "you may discard 1 red card.": "자신의 패의 적색 카드 1장을 버릴 수 있다.",
  "Choose 1 of your other (지온) Link Units.":
    "이 유닛 이외의, (지온)의 자신의 링크 유닛 1개를 선택한다.",
  "While you have another Unit with <고기동> in play,":
    "이 유닛 이외의, <고기동>을 가진 자신의 유닛이 있는 동안,",
  "Choose 1 (Asuno Family) Pilot card from your trash.":
    "자신의 트래쉬에서 (아스노 일가)의 파일럿 카드 1장을 선택한다.",
  "If you have an (AGE System) Unit in play,": "(AGE 시스템)의 자신의 유닛이 있다면,",
  "If you have an (에우고) Link Unit in play,": "(에우고)의 자신의 링크 유닛이 있다면,",
  "place 1 EX Resource.": "자신은 EX리소스 1개를 얻는다.",
  "deal 1 damage to all enemy Units that are Lv.3 or lower.":
    "Lv.3 이하의 상대의 유닛 전부에 1 대미지를 준다.",
  "if you have 2 or more (삼척동맹) Units in play,": "(삼척동맹)의 자신의 유닛 2장 이상이 있다면, ",
  "Choose 1 friendly Base and 1 enemy Unit with 3 or less HP.":
    "아군의 베이스 1개와, HP3이하의 상대의 유닛 1개를 선택한다.",
  "Choose 1 rested friendly Base. Set it as active.":
    "레스트의 아군의 베이스 1개를 선택한다. 그 베이스를 액티브로 한다.",
  "all enemy Units get AP-1 during this turn.": "이 턴 동안, 상대의 유닛 전부를 AP-1 한다.",
  "Choose 1 rested enemy Unit that is Lv.4 or lower.":
    "레스트의 Lv.4 이하의 상대의 유닛 1개를 선택한다.",
  "If a friendly white Base is in play,": "백색의 아군의 베이스가 있다면,",
  "Return the card paired with this Unit to your hand.":
    "이 유닛에 세트되어있는 카드를 패로 되돌린다.",
  "Choose 1 enemy Unit with no paired Pilot.":
    "파일럿이 세트되어 있지 않은 상대의 유닛 1개를 선택한다.",
  "This card in your trash gets cost -1.": "트래쉬의 이 카드를 코스트-1 한다.",
  "Choose 1 to 3 enemy Units with 3 or less HP.": "HP3 이하의 상대의 유닛 1~3개를 선택한다.",
  "Return them to their owners' hands.": "그 유닛들을 주인의 패로 되돌린다.",
  "Choose 1 (걀라르호른) Command card from your trash.":
    "자신의 트래쉬의 (걀라르호른)의 커맨드 카드 1장을 선택한다.",
  "Look at the top 3 cards of your deck and return 1 to the top.":
    "자신의 덱을 위에서 3장 보고, 그 중에 카드 1장을 위에 둔다.",
  "Return the remaining cards to the bottom of your deck.": "남은 카드는 무작위로 밑으로 되돌린다.",
  "if you have a (뉴타입) Pilot in play,": "(뉴타입)의 자신의 파일럿이 있다면,",
  "Choose 1 of your Unit tokens.": "자신의 유닛 토큰 1개를 선택한다.",
  "It can't receive battle damage from enemy Units during this battle.":
    "이 배틀 동안, 그 토큰은 상대의 유닛으로부터 배틀 대미지를 받지 않는다.",
  "During this battle, your shield area cards can't receive damage from enemy Units that are Lv.3 or lower.":
    "이 배틀 동안, 자신의 실드 에리어의 카드는, Lv.3 이하의 상대의 유닛으로부터 대미지를 받지 않는다.",
  "choose 1 friendly Unit token.": "아군의 유닛 토큰 1개를 선택한다.",
  "During this turn, it may choose an active enemy Unit with 5 or less AP as its attack target.":
    "이 턴 동안, 그 토큰은 액티브의 Lv.5 이하의 상대의 유닛을 공격 대상으로 선택할 수 있다.",
  "all friendly green (지구 연방) Units get AP+1.":
    "녹색의 (지구 연방)의 자신의 유닛 전부를 AP+1 한다.",
  "Choose 1 active friendly Base.": "액티브의 아군의 베이스 1개를 선택한다.",
  "Rest it.": "그 카드를 레스트로 한다.",
  "It can't choose the enemy player as its attack target during this turn.":
    "이 턴 동안, 이 유닛은 상대 플레이어를 공격 대상으로 선택할 수 없다.",
  "you may pair 1 (에우고) Pilot card from your hand with this Unit.":
    "자신의 패의 (에우고)의 파일럿 카드 1장을 이 유닛에 세트할 수 있다.",
  "While a friendly white Base is in play,": "백색의 아군의 베이스가 있는 동안,",
  "this Unit gains <리페어 1>.": "이 유닛은 <리페어 1>을 얻는다.",
  "While there are 4 or more Command cards in your trash,":
    "자신의 트래쉬에 커맨드 카드가 4장 이상 있는 동안,",
  "It gets AP-2 during this battle.": "그 유닛을 AP-2 한다.",
  "While you have another (걀라르호른) Unit in play,":
    "이 유닛 이외의, (걀라르호른)의 자신의 유닛이 있는 동안,",
  "While you have another (초대국군) Unit in play,":
    "이 유닛 이외의, (초대국군)의 자신의 유닛이 있는 동안,",
  "If you have another (삼척동맹) Unit in play,":
    "이 유닛 이외의 (삼척동맹)의 자신의 유닛이 있다면,",
  "If it is your opponent's turn,": "상대의 턴 이라면,",
  "choose 1 of your (걀라르호른) Units. Set it as active.":
    "(걀라르호른)의 자신의 유닛 1개를 선택한다. 그 유닛을 액티브로 한다.",
  "Choose 1 (에우고) Base card from your trash.":
    "자신의 트래쉬의 (에우고)의 베이스 카드 1장을 선택한다.",
  "While there is a friendly white Base in play,": "백색의 아군의 베이스가 있는 동안,",
  "It gets AP-3 during this battle.": "이 배틀 동안, 그 유닛을 AP-3 한다.",
  "If you have a (걀라르호른) Link Unit in play,": "(걀라르호른)의 자신의 링크 유닛이 있다면,",
  "This card's name is also treated as [샤아 아즈나블]":
    "이 카드의 카드명은 [샤아 아즈나블]이라고도 취급한다.",
  "If this is an (에우고) Unit,": "이 유닛이 (에우고)라면,",
  "discard 1.": "자신은 패 1장을 버린다.",
  "Choose 1 enemy Unit with 4 or less HP battling a friendly Unit with <블로커>.":
    "<블로커>를 가진 아군의 유닛과 배틀하고 있는, HP4 이하의 적 유닛 1개를 선택한다.",
  "During this turn, if a friendly (초대국군)/(UN) Unit destroys an enemy Unit with battle damage,":
    "이 턴 동안, (초대국군)/(UN)의 아군의 유닛이 배틀 대미지로 상대의 유닛을 파괴했다면,",
  "choose 1 rested friendly (초대국군)/(UN) Unit. Set it as active.":
    "(초대국군)/(UN)의 레스트의 아군의 유닛 1개를 선택한다. 그 유닛을 액티브로 한다.",
  'if there are 2 or more cards with "Awakened Potential" in their card name in your trash,':
    '자신의 트래쉬에, 카드명에 "능력의 각성"을 포함하는 카드가 2장 이상 있다면,',
  "you may choose 1 friendly Unit.": "아군의 유닛 1개를 선택할 수 있다.",
  "While you have 2 or more (초대국군)/(UN) Units in play,":
    "(초대국군)/(UN)의 자신의 유닛이 2개 이상 있는 한,",
  "this card in your hand gets cost -1.": "패의 이 카드를 코스트-1 한다.",
  "This Unit can only attack during a turn when one of your (초대국군)/(UN) Units is deployed.":
    "이 유닛은, (초대국군)/(UN)의 자신의 유닛이 배치된 턴에만 공격할 수 있다.",
  "When you rest your Base with one of your Units' effects, you may rest this Unit instead.":
    "자신의 유닛의 효과로 자신의 베이스가 레스트로 했을 때, 대신에 이 유닛을 레스트로 할 수 있다.",
  "When this rested Unit is set as active by an effect,":
    "레스트의 이 유닛이 효과로 액티브가 되었을 때,",
  "choose 1 enemy Unit with 3 or less HP.": "HP3 이하의 상대의 유닛 1개를 선택한다.",
  "when your (삼척동맹) Unit deals battle damage to an enemy Unit,":
    "(삼척동맹)의 자신의 유닛이 상대의 유닛에 배틀 대미지를 주었을 때,",
  "you may return the enemy Unit to its owner's hand.":
    "그 상대의 유닛을 주인의 패로 되돌릴 수 있다.",
  "enemy Units choose this rested Unit as their attack target if possible when attacking.":
    "상대의 유닛은 공격할 때, 가능하면 레스트의 이 유닛을 공격해야 한다.",
  "If there are 6 or more (걀라르호른) cards in your trash,":
    "자신의 트래쉬에 (걀라르호른)의 카드가 6장 이상 있다면,",
  "choose 1 enemy Unit battling this Unit.": "이 유닛과 배틀하고 있는 상대의 유닛 1개를 선택한다.",
  "At the end of the turn when this Unit is paired with a Pilot,":
    "이 유닛에 파일럿이 세트된 턴의 종료 시,",
  "set it as active.": "이 카드를 액티브로 한다.",
  "While this Unit is rested,": "이 유닛이 레스트인 동안,",
  "friendly Shields can't receive battle damage from enemy Units.":
    "아군의 실드는 상대의 유닛으로부터 배틀 대미지를 받지 않는다.",
  "For each (에우고) Unit card in your trash,": "자신의 트래쉬에 (에우고)의 카드 1장마다,",
  "it gets AP-1 during this turn.": "이 턴 동안, 그 유닛을 AP-1 한다.",
  "you may choose 1 (베이건) Unit card that is Lv.4 or lower from your trash.":
    "자신의 트래시의 Lv.4 이하의 (베이건)의 유닛 카드 1장을 선택할 수 있다.",
  "when one of your friendly (철화단)/(테이와즈) Units receives effect damage,":
    "(철화단)/(테이와즈)의 아군의 유닛이 효과 대미지를 받았을 때,",
  "you may rest this Base.": "이 베이스를 레스트 할 수 있다.",
  "place the top card of your deck into your trash.":
    "자신의 덱을 위에서 1장, 자신의 트래시에 둔다.",
  "If 1 to 4 enemy Units are in play,": "상대의 유닛이 1~4개 있다면,",
  "If 5 or more are in play,": "5개 이상 있다면,",
  "deploy 1 [Graze Custom]((철화단)･AP2･HP2) Unit token.":
    "[그레이즈 커스텀]((철화단)･AP2･HP2)의 유닛 토큰 1개를 배치한다.",
  "deploy 1 [Gundam Barbatos 4th Form]((철화단)･AP4･HP4) Unit token.":
    "[건담 발바토스 제4 형태]((철화단)･AP4･HP4)의 유닛 토큰 1개를 배치한다.",
  "Deal 2 damage to them.": "그 유닛들에 2 대미지를 준다.",
  "Choose 1 friendly (베이건) Unit and 1 enemy Unit.":
    "(베이건)의 아군의 유닛 1개와, 상대의 유닛 1개를 선택한다.",
  "Choose 1 active enemy Unit that is Lv.2 or lower.":
    "액티브의 Lv.2 이하의 상대의 유닛 1개를 선택한다.",
  "If there are 10 or more cards in your trash,": "자신의 트래시에 카드가 10장 이상 있다면,",
  "You may choose 1 of your Units.": "자신의 유닛 1개를 선택할 수 있다.",
  "You may choose 1 (베이건) card from your trash.":
    "자신의 트래시의 (베이건)의 카드 1장을 선택할 수 있다.",
  "When this Unit deals battle damage to an enemy Unit that is Lv.5 or lower,":
    "이 유닛이 Lv.5 이하의 상대의 유닛에 배틀 대미지를 주었을 때,",
  "choose 1 enemy Unit with 4 or less AP.": "AP4 이하의 상대의 유닛 1개를 선택한다.",
  "While this Unit has 1 HP,": "이 유닛이 HP1인 동안,",
  "choose 1 active enemy Unit that is Lv.4 or lower instead.":
    "대신에 액티브의 Lv.4 이하의 상대의 유닛 1개를 선택한다.",

  "it can't receive battle damage from enemy Units with 5 or less AP instead.":
    "대신에 AP5 이하의 상대의 유닛으로부터 배틀 대미지를 받지 않는다.",
  "Choose 1 friendly Unit paired with an (X-라운더) Pilot.":
    "(X-라운더)의 파일럿이 세트되어 있는 아군의 유닛 1개를 선택한다.",
  "Place the remaining card into your trash.": "남은 카드는 자신의 트래시에 둔다.",
  "look at the top 2 cards of your deck and return 1 to the top.":
    "자신의 덱을 위에서 2장 보고, 그 중 카드 1장을 덱 위로 되돌린다.",
  "When this Unit receives effect damage,": "이 유닛이 효과 대미지를 받았을 때,",
  "If you placed a (베이건) card with this effect,": "이 효과로 (베이건)의 카드가 놓였다면,",
  "While a friendly Base is in play,": "아군의 베이스가 있는 동안,",
  "자신의 유닛 1개를 선택할 수 있다. Deal 1 damage to it.":
    "자신의 유닛 1개를 선택할 수 있다. 그 유닛에 1 대미지를 준다.",
  "all your (자프트) Units get AP+2.": "(자프트)의 자신의 유닛 전부를 AP+2 한다.",
  "Deal 1 damage to it for each 4 AP this Unit has.":
    "그 유닛에, 이 유닛의 AP4 마다 1 대미지를 준다.",
  "exile 1 Pilot card from your trash:": "자신의 트래시의 파일럿 카드 1장을 게임에서 제외한다:",
  "Deal 1 damage to all enemy Units.": "상대의 유닛 전부에 1 대미지를 준다.",
  "You may choose 1 (X-라운더) card from your trash and add it to your hand.":
    "자신의 트래시의 (X-라운더)의 카드 1장을 선택할 수 있다.",
  "when this Unit receives effect damage,": "이 유닛이 효과 대미지를 받았을 때,",
  "deploy 1 rested [CGS Mobile Worker]((철화단)･AP1･HP1) Unit token.":
    "[CGS 모빌워커]((철화단)･AP1･HP1)의 유닛 토큰 1개를 레스트로 배치한다.",
  "Exile it from the game.": "그 카드를 게임에서 제외한다.",
  "choose 1 of your (베이건) Units.": "(베이건)의 자신의 유닛 1장을 선택한다.",
  "You may choose 4 (베이건) cards from your trash.":
    "자신의 트래시의 (베이건)의 카드 4장을 선택할 수 있다.",
  "when one of your (철화단)/(테이와즈) Units receives effect damage,":
    "(철화단)/(테이와즈)의 자신의 유닛이 효과 대미지를 받았을 때,",
  "if you have a (솔레스탈 비잉) Pilot in play,": "(솔레스탈 비잉)의 자신의 파일럿이 있다면,",
  "destroy that enemy Unit.": "상대의 그 유닛을 파괴한다.",
  "You may choose 1 Unit card that is Lv.4 or lower from your trash.":
    "자신의 트래시의 Lv.4 이하의 유닛 카드 1장을 선택할 수 있다.",
  "Choose 3 (철화단)/(테이와즈) Unit cards from your trash.":
    "자신의 트래시의, (철화단)/(테이와즈)의 유닛 카드 3장을 선택한다.",
  "When this Unit destroys an enemy shield area card with battle damage,":
    "이 유닛이 배틀 대미지로 상대의 실드 에리어의 카드를 파괴했을 때,",
  "if there are 10 or more (솔레스탈 비잉) cards in your trash,":
    "자신의 트래시에 (솔레스탈 비잉)의 카드가 10장 이상 있다면,",
  "choose 1 enemy Unit with the lowest HP. ": "가장 HP가 낮은 상대의 유닛 1개를 선택한다.",
  "All friendly Unit tokens get AP+1 during your opponent's turn.":
    "상대의 턴 동안, 아군의 유닛 토큰 전부를 AP+1 한다.",
  "when a friendly (오퍼레이션 메테오)/(G-팀) Unit that is Lv.6 or higher destroys an enemy Unit with battle damage,":
    "Lv.6 이상의 (오퍼레이션 메테오)/(G-팀) 유닛이 배틀 대미지로 상대의 유닛을 파괴했을 때,",
  "that friendly Unit may recover 2 HP.": "그 아군의 유닛을 2 회복할 수 있다.",
  "Deploy 1 [Hy-Gogg]((Cyclops Team)･AP2･HP1) Unit token.":
    "[하이-곡그]((사이클롭스 팀)･AP2･HP1)의 유닛 토큰 1개를 배치한다.",
  "Deal damage to it equal to the number of friendly Unit tokens in play.":
    "그 유닛에 아군의 유닛 토큰 수 만큼 대미지를 준다.",
  "When you pair a Pilot that is Lv.3 or lower with one of your Units,":
    "자신의 유닛에 Lv.3 이하의 파일럿이 세트되었을 때,",
  "Choose 1 of your (사이클롭스 부대) Units.": "(사이클롭스 부대)의 자신의 유닛 1개를 선택한다.",
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
