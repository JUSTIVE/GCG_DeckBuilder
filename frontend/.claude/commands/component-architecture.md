---
description: 플레이필드 컴포넌트 계층 구조, 핵심 타입, 설계 결정 참고
---

# 플레이필드 컴포넌트 아키텍처

## 컴포넌트 계층

```
PlayfieldLayout.tsx          ← 순수 레이아웃 원자
  BoardHalfLayout             보드 절반 배치 (flipped 프롭으로 P2 미러링)
  ZoneBox                     단일 존 박스 (라벨, 강조, 자식 카드 지원)
  ShieldSlots                 실드 슬롯 6개 (아래서부터 채워짐, stagger 애니)
  VisibilityDot               공개/비공개 표시 점

SetupDualPlayfield.tsx        ← 게임 셋업 전용 (손패, 멀리건, 덱 배치 등)
  SetupHalfBoard
  SetupShieldArea
  HandStrip                   손패 카드 스트립 (멀리건 애니 포함)

DualPlayfield.tsx             ← 순수 게임 중 보드 (셋업 요소 없음)
  DualHalfBoard
  DualShieldArea

MiniPlayfield.tsx             ← 초소형 1인 보드 프리뷰
```

## PlayfieldLayout 핵심 치수

```ts
export const BATTLE_H = 72; // 배틀 에어리어 행 높이 (px)
export const RES_H = 48; // 리소스 행 높이 (px)
```

## BoardHalfLayout — flipped 동작

`flipped=true`이면:

- 행 순서 반전 (리소스 위, 배틀 아래)
- 각 행 내 열 순서 반전 (실드 에어리어 오른쪽)

P2는 항상 `flipped=true`, P1은 `flipped=false`.

## ZoneBox — children 지원

children이 있을 때는 label을 절대 위치 ghost 배지로 표시:

```tsx
{children ? (
  <>
    {children}
    {label && (
      <span className="absolute bottom-0.5 inset-x-0 text-[7px] text-center opacity-30 ...">
        {label}
      </span>
    )}
  </>
) : (
  // 기본 label + sub 텍스트
)}
```

이를 통해 ZoneBox 안에 MiniCard 등을 배치할 수 있다.
ZoneBox는 `overflow-hidden`이므로 50px 카드가 72px 배틀 존에서 잘리지 않도록 높이 여유 필요.

## ShieldSlots — 채우기 방향

`count`개를 **아래(인덱스 0)에서 위로** 채움. CSS는 `flex-col`로 배열.
각 슬롯에 `transitionDelay: i * 45ms` 로 stagger 애니.

## SetupDualPlayfield vs DualPlayfield

|                 | SetupDualPlayfield                                                                 | DualPlayfield                            |
| --------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| 용도            | 게임 셋업 단계 설명                                                                | 게임 중 보드 상태 시각화                 |
| 손패 표시       | O (HandStrip)                                                                      | X                                        |
| 멀리건 애니     | O                                                                                  | X                                        |
| 하이라이트 타입 | `SetupHighlight` (deck/order/hand/mulligan/shield/base/exres/start)                | `DualAccent` (shield/base/battle/null)   |
| 보드 상태 타입  | `SetupBoardState` (hasDeck, hasResDeck, handCount, shieldCount, hasBase, hasExRes) | `DualBoardState` (shieldCount, hasBase?) |
| 배틀존 콘텐츠   | p1BattleContent, p2BattleContent                                                   | p1Battle, p2Battle                       |

## AbilityDemo — DemoStep 패턴

```ts
type DemoStep = {
  p1: DualBoardState;
  p2: DualBoardState;
  accent: DualAccent; // null이면 강조 없음
  p1Label: string;
  p2Label: string;
  log: string; // 하단 로그 문자열
};
```

accent → log 색상 매핑:

```ts
const ACCENT_LOG = {
  shield: "bg-blue-500 text-white",
  base: "bg-neutral-500 text-white",
  battle: "bg-rose-500 text-white",
};
// null → "bg-muted text-muted-foreground"
```
