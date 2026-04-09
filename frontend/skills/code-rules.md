# 코드 작성 규칙 및 제약사항

## 타입 체크

```bash
tsgo -p .
```
`pnpm exec tsc --noEmit` 대신 이걸 사용. 훨씬 빠름.

## Relay / GraphQL

- 쿼리는 컴포넌트 파일 안에 `graphql` 태그로 작성
- `useLazyLoadQuery` — Suspense와 함께 사용
- `readInlineData` — fragment inline 읽기
- 생성된 타입은 `src/__generated__/` — 직접 수정 금지
- 쿼리 변수 타입 캐스팅: `keyword as any` (enum 불일치 시)

## 컴포넌트 설계 원칙

- 셋업 전용 요소(손패, 멀리건)와 게임 중 요소(배틀존 카드)를 **분리**
  - 셋업 → `SetupDualPlayfield`
  - 게임 중 → `DualPlayfield`
- 공유 레이아웃 로직은 `PlayfieldLayout` 에 두고 상위 컴포넌트에서 슬롯 주입

## Tailwind 패턴

- `cn()` (clsx + tailwind-merge) 항상 사용
- 크기는 px 값 직접 지정(`style={{ width: 76 }}`)이 아닌 tailwind 우선
  - 단, 정확한 픽셀 제어가 필요한 경우(카드 비율, 보드 치수) style 사용
- 다크 모드: `bg-primary/15`, `border-primary/50` 등 opacity modifier 활용
- `transition-all duration-300` 기본 전환

## 파일 분리 기준

- 컴포넌트가 다른 페이지에서 재사용되거나
- 컴포넌트가 관련 없는 상태를 너무 많이 받게 되면 분리

분리 후 기존 파일에서 import 교체 + 오래된 inline 정의 삭제.

## 애니메이션 구현 시

- 항상 `IntersectionObserver`로 뷰포트 진입 후 시작
- `setTimeout` 타이머는 cleanup 필수: `return () => timers.forEach(clearTimeout)`
- replay 기능: key state 증가 → useEffect 재실행 패턴

## 한국어 게임 용어 대조

| 한국어 | 영어 변수명/타입 |
|--------|----------------|
| 실드 | shield |
| 베이스존 | base |
| 배틀 에어리어 | battle |
| 덱 | deck |
| 리소스덱 | resDeck / resourceDeck |
| 리소스 | resource |
| 트래시 | trash |
| 손패 | hand |
| 레스트 | rested |
| 블로커 | blocker (tag) |
| 선제공격 | first strike |
| 고기동 | high maneuver |
| 돌파 | breach |
| 원호 | support |
| 제압 | suppression |
| 리페어 | repair |
| 멀리건 | mulligan |

## shadcn/ui 색상 토큰

- `text-muted-foreground` — 부제목, 레이블
- `border-border` — 기본 테두리
- `bg-muted/20` — 비활성 존 배경
- `bg-primary/15`, `border-primary` — 강조 존
- `bg-blue-50/60` — P2(상대) 영역 배경
- `bg-rose-50/60` — P1(나) 영역 배경
