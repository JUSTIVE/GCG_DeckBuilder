---
description: 이 프로젝트의 코드 작성 규칙 (타입 체크 명령, Relay 패턴, Tailwind 규칙, 한국어 게임 용어 대조, 표현 불가능한 타입 금지)
---

# 코드 작성 규칙 및 제약사항

## 표현 가능한 타입만 사용

TypeScript 타입이든 GraphQL/Zod 스키마든, **런타임에서 실제로 표현 불가능한 상태가 생기지 않도록** 타입을 설계한다.

### 금지 패턴

- `any`, `unknown` 을 이유 없이 사용 — 타입 정보를 버리는 캐스팅 금지
- `as SomeType` 강제 캐스팅 — 타입 체커를 속이는 것은 런타임 버그의 원인
- 서로 배타적인 필드를 같은 객체에 optional로 나열 (`foo?: A; bar?: B` 형태로 둘 중 하나만 의미 있는 경우) — **discriminated union**으로 교체
- `| null | undefined` 를 아무 곳에나 — nullable은 꼭 필요한 경우에만, 도달 불가능한 분기를 만들지 말 것

### 권장 패턴

```ts
// Bad: 어느 쪽인지 타입으로 알 수 없음
type Result = { data?: Data; error?: string };

// Good: 상태가 타입 수준에서 명확
type Result = { ok: true; data: Data } | { ok: false; error: string };
```

- 상태 머신(FSM)의 각 상태를 **discriminated union** 으로 표현
- 배열 인덱스 접근 대신 구조 분해 또는 `at()` + 명시적 null 체크
- `Record<string, V>` 보다 `Map<K, V>` 또는 구체적인 키 리터럴 유니언 선호
- 스키마(Zod 등) 정의와 TypeScript 타입을 **하나의 소스**에서 파생 (`z.infer<typeof schema>`)

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
- 쿼리 변수 타입은 `src/__generated__/` 의 생성된 타입 사용 — `as any` 캐스팅 금지

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

- 파일이 **300라인**을 초과하면 분리 검토
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
