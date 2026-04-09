# GCG DeckBuilder — 프로젝트 개요

## 무엇을 하는 앱인가

한국어 TCG(트레이딩 카드 게임)의 덱 빌더 + 룰 레퍼런스 앱.

- **카드 목록/검색**: Relay + GraphQL로 카드 데이터 조회
- **덱 관리**: 덱 목록·상세 페이지, 히스토그램, 필터
- **룰 설명**: `RulesPage` — 단계별 애니메이션으로 게임 진행 시각화
- **키워드 사전**: `KeywordsPage` — 각 키워드마다 `AbilityDemo` 애니메이션 내장
- **멀리건 시뮬레이터**: `MulliganSimulatorPage`
- **실드 시뮬레이터**: `ShieldSimulator`
- **리소스 카운터**: `ResourceCounterPage`

## 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | TypeScript (React) |
| 번들러 | Vite |
| 패키지 매니저 | Bun |
| 스타일 | Tailwind CSS v4 |
| 데이터 | React Relay + GraphQL |
| UI 라이브러리 | shadcn/ui (components.json 기반) |
| 라우터 | TanStack Router |

## 디렉토리 구조

```
frontend/
  src/
    components/   # 재사용 컴포넌트
    page/         # 페이지 컴포넌트
    render/       # 색상·키워드 등 렌더링 유틸
    lib/          # 필터 상수, utils 등
    __generated__ # Relay 자동 생성 파일
```

## UI 언어

UI 텍스트는 **한국어**. 주석이나 변수명은 영어+한국어 혼용.
