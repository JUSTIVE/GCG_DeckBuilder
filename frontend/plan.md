# 로컬 전용 GraphQL 쿼리를 백엔드로 이전

## Context

`feat/backend` 브랜치의 `frontend/src/relay-environment.ts:10-43` 에서 Relay 요청을 분기한다. `VITE_GRAPHQL_URL` 이 설정되고 operation 이름이 `/Deck|History|AddFilterSearch|AddCardView|MainPage/` 에 매칭되지 않으면 백엔드(Elysia + graphql-yoga + Kysely + Postgres)로, 매칭되면 `frontend/src/serve.ts` 의 localStorage 기반 인-브라우저 GraphQL 로 간다. 카드 데이터는 이미 `cards` 테이블에 있지만 `deckList` / `searchHistory` 는 `backend/src/resolvers/cards.ts:162-163` 에서 빈 싱글톤을 돌려주는 스텁이다.

이번 작업의 목표:

- 덱/검색 히스토리를 백엔드의 진짜 저장소로 옮기고, `LOCAL_ONLY` 분기를 제거해 서버 전환을 완료한다.
- 익명 사용자 단위로 데이터를 격리한다 (HTTP-only 쿠키 기반 세션).
- 기존 localStorage 에 저장된 덱/히스토리는 `importLocalState` 뮤테이션으로 1회 이관 후 키 삭제.

비즈니스 규칙(50장, 2색, 4카피, `card.limit` 우선, Resource 제외, 히스토리 15개, dedupe)은 백엔드로 이식한다. 클라이언트는 `AddCardToDeckResult` union 의 에러 케이스 렌더링만 담당한다.

## 이전 대상 Operation (`LOCAL_ONLY` 정규식이 잡는 전부)

- **Query**: `MainPageQuery`, `DeckListPageQuery`, `DeckDetailPageQuery`, `SearchHistoryPanelQuery`
- **Mutation** (덱): `DeckListPageCreateDeckMutation`, `DeckListPageDeleteDeckMutation`, `DeckDetailPageRenameDeckMutation`, `DeckDetailPageAddCardMutation`, `DeckDetailPageRemoveCardMutation`, `DeckDetailPageSetDeckCardsMutation`
- **Mutation** (히스토리): `CardListAddFilterSearchMutation`, `CardByIdOverlayAddCardViewMutation`, `SearchHistoryPanel...RemoveMutation`, `...ClearMutation`
- **신규**: `ImportLocalStateMutation`

## 데이터 흐름 (변경 후)

```mermaid
flowchart LR
  Browser["Relay client<br/>(React)"]
  Cookie[("HTTP-only cookie<br/>gcg_sid")]
  Migrator["migrate-local-state.ts<br/>(1회)"]
  LS[("localStorage<br/>gcg_decks / gcg_search_history")]

  subgraph Backend["Elysia + Yoga"]
    Ctx["createContext<br/>(cookie → sessionId)"]
    RDeck["resolvers/decks.ts"]
    RHist["resolvers/searchHistory.ts"]
    RMig["resolvers/migration.ts"]
    Helpers["serve/deck-helpers.ts<br/>(rules + link logic)"]
  end

  subgraph DB[(Postgres)]
    TSessions["sessions"]
    TDecks["decks"]
    TDeckCards["deck_cards"]
    THistory["search_history"]
    TCards["cards (기존)"]
  end

  Browser -- "fetch(credentials: 'include')" --> Ctx
  Cookie <-. "Set-Cookie on first request" .-> Ctx
  Migrator -- "ImportLocalStateMutation" --> RMig
  LS -. "읽고 삭제" .- Migrator

  Ctx --> RDeck & RHist & RMig
  RDeck & RHist & RMig --> Helpers
  Helpers --> DB
  RDeck -. "cardById loader" .-> TCards
```

## 구현 계획

### A. 백엔드 — DB 마이그레이션

**신규**: `backend/db/migrations/002_sessions_decks_history.sql`

```sql
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,              -- crypto.randomUUID()
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE decks (
  id          TEXT PRIMARY KEY,              -- `@${btoa("Deck:"+createdAt)}` 기존 포맷 유지
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX decks_session_idx ON decks (session_id, created_at DESC);

CREATE TABLE deck_cards (
  deck_id     TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,                 -- cards.id 와 논리적 일치, FK 는 생략 (Resource 때문)
  count       INT  NOT NULL CHECK (count > 0),
  position    INT  NOT NULL,
  PRIMARY KEY (deck_id, card_id)
);
CREATE INDEX deck_cards_deck_idx ON deck_cards (deck_id, position);

CREATE TABLE search_history (
  id          TEXT PRIMARY KEY,              -- btoa(kind + ":" + iso)
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('filter','card_view')),
  payload     JSONB NOT NULL,                -- filter+sort 또는 {cardId}
  dedupe_key  TEXT NOT NULL,                 -- 정규화된 필터 JSON 또는 cardId
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX search_history_session_idx ON search_history (session_id, searched_at DESC);
CREATE UNIQUE INDEX search_history_dedupe_idx ON search_history (session_id, kind, dedupe_key);
```

**수정**: `backend/db/types.ts` — `SessionsTable`, `DecksTable`, `DeckCardsTable`, `SearchHistoryTable` 추가하고 `DB` 인터페이스에 등록.

### B. 백엔드 — 세션 쿠키 & context

**수정**: `backend/src/index.ts`

- `.all("/graphql", ({ request }) => yoga.fetch(request))` 는 그대로. Yoga 가 `Response` 를 만들고 쿠키 헤더를 설정하므로 Elysia 미들웨어 추가는 불필요.
- Yoga 의 `context` 가 `createContext({ request })` 를 받도록 시그니처 변경.

**수정**: `backend/src/context.ts`

- 인자 `{ request }: { request: Request }` 추가. `request.headers.get("cookie")` 에서 `gcg_sid` 파싱.
- 세션 ID 가 없거나 `sessions` 테이블에 없으면:
  - `crypto.randomUUID()` 로 새 ID 발급 → `sessions` INSERT.
  - `ctx.setCookie = true` 플래그 + `ctx.newSessionId` 저장 (Yoga 응답 훅에서 사용).
- 있으면 `UPDATE sessions SET last_seen = now()` (비차단).
- `Context` 타입: `{ db, loaders, sessionId: string }`.

**수정**: `backend/src/index.ts` 에 `plugins: [useResponseCache?]` 대신 `plugins: [{ onResponse: ({ serverContext, response }) => { ... if (ctx.setCookie) response.headers.append("Set-Cookie", ...) } }]` 로 `Set-Cookie: gcg_sid=<uuid>; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000; Secure` (dev 에선 `Secure` 제외) 를 세팅. `useServer`/`useSessionCookie` 같은 별도 플러그인 없이 Yoga 의 `plugins` 만 사용.

**CORS**: 프론트가 다른 포트에서 오므로 `createYoga({ ..., cors: { origin: process.env.FRONTEND_ORIGIN, credentials: true } })` 지정. `FRONTEND_ORIGIN` 은 `.env.local` 에 추가.

### C. 백엔드 — 리졸버

**신규**: `backend/src/serve/deck-helpers.ts`

- 프론트에서 그대로 복사할 순수 함수들:
  - `frontend/src/lib/deckLinks.ts` 의 `splitPilotAliases`, `computeDeckLinkSets`, `unitHasNoLinkedPilot`, `pilotHasNoLinkedUnit` — 의존성 없음, 그대로 복사.
  - `frontend/src/serve/fieldResolver.ts:37-58` 의 `extractCommandPilotName`, `66-106` 의 `normalizeRawCardForLinks` — 카드 raw JSON → link 계산용 정규화 로직.
  - `frontend/src/serve/decks.ts:47-63` 의 `deckCardCount`, `deckColors` 등가 함수 (Resource 제외 + color set).
- 상수: `DECK_MAX_CARDS = 50`, `DECK_MAX_COPIES = 4`, `DECK_MAX_COLORS = 2`.
- 카드 raw JSON 은 `cards.raw` JSONB 에서 가져오므로 프론트와 동일한 스키마를 받는다.

**신규**: `backend/src/resolvers/decks.ts`

리졸버별 책임:

| GraphQL 필드                                                   | 구현                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Query.deckList`                                               | `SELECT * FROM decks WHERE session_id=$1 ORDER BY created_at DESC`; 각 deck 을 `{ __typename: "Deck", id, name, createdAt, sessionId }` 로 반환                     |
| `Deck.cards`                                                   | `deck_cards` 조회 → `cardById` DataLoader 로 raw 카드 로드 → `DECK_CARD_VARIANT` 태깅 + `computeDeckLinkSets` 로 `pilotLinked` / `hasLinkingUnit` 계산              |
| `Deck.colors` / `topKeywords` / `topTraits` / `hasLinkWarning` | `deck-helpers.ts` 재사용. 같은 deck 에 대해 `Deck.cards` 와 중복 계산을 피하도록 `DataLoader<deckId, TaggedDeckCards>` 를 `context.loaders.deckCards` 로 추가       |
| `Mutation.createDeck`                                          | ID 는 프론트와 동일한 `@${btoa("Deck:"+createdAt)}` 포맷. `decks` INSERT 후 `deckList` 재로드                                                                       |
| `Mutation.deleteDeck`                                          | `DELETE FROM decks WHERE id=$1 AND session_id=$ctx` (ON DELETE CASCADE 로 deck_cards 자동 삭제) → `deckList`                                                        |
| `Mutation.renameDeck`                                          | `UPDATE ... RETURNING *`; 세션 불일치면 예외                                                                                                                        |
| `Mutation.addCardToDeck`                                       | 트랜잭션: 덱 로드 → 규칙 검사 (`AddCardToDeckResult` union 으로 에러 반환) → `INSERT ... ON CONFLICT (deck_id, card_id) DO UPDATE SET count = deck_cards.count + 1` |
| `Mutation.removeCardFromDeck`                                  | count 1 이하면 row DELETE, 아니면 decrement                                                                                                                         |
| `Mutation.setDeckCards`                                        | 트랜잭션: 동일 세션 검증 → `DELETE FROM deck_cards WHERE deck_id=$1` → 입력 재삽입 (position 순서 보존, `count>0` 만)                                               |

**신규**: `backend/src/resolvers/searchHistory.ts`

| GraphQL 필드                                          | 구현                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Query.searchHistory`                                 | `SELECT ... WHERE session_id=$1 ORDER BY searched_at DESC LIMIT 15`; kind 별로 `FilterSearchHistory` / `CardViewHistory` 태깅                                                                                                                                                                                            |
| `FilterSearchHistory.filter`                          | `payload` JSON 그대로 반환 (스키마 `SearchHistoryFilter` 형태)                                                                                                                                                                                                                                                           |
| `CardViewHistory.card`                                | 기존 리졸버 `cards.ts:219-223` 에 있는 `CardViewHistory.card` 구현 재사용 (DataLoader) — 신규 파일로 옮기거나 원래 위치에 둔 채 import                                                                                                                                                                                   |
| `Mutation.addFilterSearch`                            | `dedupe_key = JSON.stringify(normalizeFilter(input))` (키 정렬 + 배열 정렬, `frontend/src/serve/history.ts:45-52` 의 `filterKey` 와 동일) → `INSERT ... ON CONFLICT (session_id, kind, dedupe_key) DO UPDATE SET searched_at=now(), payload=EXCLUDED.payload` → 초과분 `DELETE WHERE id NOT IN (SELECT id ... LIMIT 15)` |
| `Mutation.addCardView`                                | `dedupe_key = cardId` 로 동일한 패턴                                                                                                                                                                                                                                                                                     |
| `Mutation.removeSearchHistory` / `clearSearchHistory` | 세션 스코프 DELETE                                                                                                                                                                                                                                                                                                       |

**신규**: `backend/src/resolvers/migration.ts`

- `Mutation.importLocalState(input: ImportLocalStateInput!)` — 단일 트랜잭션으로:
  1. 입력 덱들 `INSERT INTO decks ... ON CONFLICT (id) DO NOTHING` (재시도 안전)
  2. 각 덱의 `deck_cards` 삽입 (동일 `ON CONFLICT DO NOTHING`)
  3. `filterSearches` / `cardViews` 를 `search_history` 로 위와 동일한 dedupe 규칙 적용해 삽입
  4. 각 덱의 규칙 검증은 생략 (로컬에서 이미 유효한 상태였다고 가정; 입력 해소 못 하면 실패보단 관대하게)
- 반환: `ImportLocalStateResult { importedDecks: Int!, importedHistory: Int! }`.

**수정**: `backend/schema/schema.graphql` 끝에 추가:

```graphql
input ImportDeckInput {
  id: ID!
  name: String!
  createdAt: String!
  cards: [DeckCardInput!]!
}
input ImportFilterSearchInput {
  id: ID!
  filter: SearchHistoryFilterInput!
  searchedAt: String!
}
input SearchHistoryFilterInput {
  kind: [CardKind!]!
  level: [Int!]
  cost: [Int!]
  package: CardPackage
  rarity: CardRarity
  keyword: [CardKeyword!]
  trait: [CardTrait!]
  zone: [Zone!]
  color: [CardColor!]
  query: String
  sort: CardSort
}
input ImportCardViewInput {
  id: ID!
  cardId: ID!
  searchedAt: String!
}
input ImportLocalStateInput {
  decks: [ImportDeckInput!]!
  filterSearches: [ImportFilterSearchInput!]!
  cardViews: [ImportCardViewInput!]!
}
type ImportLocalStateResult {
  importedDecks: Int!
  importedHistory: Int!
}

extend type Mutation {
  importLocalState(input: ImportLocalStateInput!): ImportLocalStateResult!
}
```

**수정**: `frontend/schema.graphql` 에 위 블록 동일하게 추가 → `cd frontend && bun run relay-compiler`.

**수정**: `backend/src/resolvers/cards.ts:162-163` 의 `searchHistory` / `deckList` 스텁 제거.

**수정**: `backend/src/resolvers/index.ts` — 새 리졸버 머지:

```ts
import { cardResolvers } from "./cards";
import { deckResolvers } from "./decks";
import { searchHistoryResolvers } from "./searchHistory";
import { migrationResolvers } from "./migration";
export const resolvers = mergeResolvers([
  cardResolvers,
  deckResolvers,
  searchHistoryResolvers,
  migrationResolvers,
]);
```

(`@graphql-tools/merge` 는 이미 `@graphql-tools/schema` 의존성에 포함됨.)

### D. 프론트엔드 — 세션/쿠키/마이그레이션

**수정**: `frontend/src/relay-environment.ts` (전량 재작성)

- `LOCAL_ONLY` 정규식과 로컬 분기 제거.
- `BACKEND_URL` 을 필수로 승격 — 없으면 `throw new Error("VITE_GRAPHQL_URL is required")`.
- 모든 `fetch` 호출에 `credentials: "include"`.
- 파일 로드 시점 1회: `migrateLocalStateIfNeeded()` 를 호출하고, **완료된 Promise 를 모든 fetch 가 await** 하도록 간단한 `let migrationReady: Promise<void>` 를 모듈 스코프에 둔다.

**신규**: `frontend/src/lib/migrate-local-state.ts`

```ts
export async function migrateLocalStateIfNeeded(endpoint: string): Promise<void> {
  const decks = localStorage.getItem("gcg_decks");
  const history = localStorage.getItem("gcg_search_history");
  if (!decks && !history) return;
  // ... JSON.parse, 형태 변환 (localStorage 의 Deck → ImportDeckInput), 뮤테이션 호출
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: IMPORT_MUTATION, variables: { input } }),
  });
  if (!res.ok) return; // 실패 시 키 보존 (다음 방문에 재시도)
  const body = await res.json();
  if (body.errors) return;
  localStorage.removeItem("gcg_decks");
  localStorage.removeItem("gcg_search_history");
}
```

이 파일은 Relay 를 통하지 않고 raw fetch — 초기화 순서상 Relay environment 가 아직 안 만들어졌을 수 있고, 서버가 쿠키를 세팅하는 첫 요청이 이 마이그레이션이 되도록 하기 위해서.

**수정**: `frontend/src/serve.ts` + `frontend/src/serve/*.ts`

- 파일 상단에 `/** @deprecated moved to backend; 보존 유지용 */` 주석.
- `relay-environment.ts` 에서 import 제거. 파일 자체는 삭제하지 않음 (후속 PR).
- 대신 `frontend/src/serve.test.ts` 는 `serveGraphQL` 을 계속 테스트하므로 그대로 둠.

### E. 테스트

**신규**: `backend/src/resolvers/decks.test.ts`

- 50/2/4/limit 규칙 검사 단위 테스트 (임시 Postgres 또는 Kysely 모킹). 예: 50번째까지 성공 → 51번째에 `DeckFullError`; 2색 보유 상태에서 3번째 색 추가 시 `DeckColorLimitExceededError`; `limit=0` 카드 추가 시 `CardBannedError`.

**신규**: `backend/src/resolvers/searchHistory.test.ts`

- dedupe: 동일 필터 2회 추가 시 row 1개, `searched_at` 만 갱신.
- 16번째 필터 추가 시 가장 오래된 1개 삭제.

## Verification

1. **마이그레이션**

   ```bash
   cd backend && bun run migrate
   psql $DATABASE_URL -c "\dt"   # sessions, decks, deck_cards, search_history 존재
   ```

2. **로컬 E2E**

   ```bash
   # 터미널 1
   cd backend && bun run dev
   # 터미널 2
   cd frontend && VITE_GRAPHQL_URL=http://localhost:4000/graphql bun --bun run dev
   ```

   - DevTools → Application → Cookies 에 `gcg_sid` (HttpOnly ✓) 확인
   - DevTools → Network 에서 모든 GraphQL 요청이 4000 포트로 감 (로컬 분기 제거 확인)
   - 덱 생성 / 카드 추가 / 이름 변경 / 삭제 / 카드 일괄 교체 전부 동작
   - 51번째 카드 → `DeckFullError` 토스트, 3번째 색 → `DeckColorLimitExceededError`, `limit=0` → `CardBannedError`
   - 필터 검색 → 히스토리 갱신, 동일 필터 재검색 시 추가 row 없이 최신 시각만 이동
   - 히스토리 16번째 등록 → 1번째 사라짐

3. **마이그레이션 테스트**
   - `main` 브랜치로 전환해 덱/히스토리 생성 → DevTools 에서 `gcg_decks`, `gcg_search_history` 존재 확인
   - `feat/backend` 로 전환 후 새로고침 → Network 에서 `ImportLocalStateMutation` 1회 호출 → localStorage 키 사라짐 → UI 에 기존 데이터 그대로

4. **세션 격리**
   - 시크릿 창에서 접속 → `gcg_sid` 쿠키 다른 값 → 덱 리스트 비어 있음
   - 같은 창 새로고침 → 쿠키 유지 → 덱 유지

5. **프론트 precheck** (`frontend/CLAUDE.md` 규약)
   ```bash
   cd frontend && tsgo -p . && bun run lint && bun run fmt:check && bun run test
   ```

## 수정/신규 파일 요약

### 신규

- `backend/db/migrations/002_sessions_decks_history.sql`
- `backend/src/serve/deck-helpers.ts`
- `backend/src/resolvers/decks.ts`
- `backend/src/resolvers/searchHistory.ts`
- `backend/src/resolvers/migration.ts`
- `backend/src/resolvers/decks.test.ts`
- `backend/src/resolvers/searchHistory.test.ts`
- `frontend/src/lib/migrate-local-state.ts`

### 수정

- `backend/db/types.ts` — Kysely 테이블 타입 추가
- `backend/src/context.ts` — `{ request }` 받고 쿠키→sessionId, 신규 세션 생성
- `backend/src/index.ts` — Yoga 에 `cors: { credentials: true }`, `plugins` 로 Set-Cookie 응답 훅, `context: ({ request }) => createContext({ request })`
- `backend/src/resolvers/cards.ts` — `searchHistory` / `deckList` 스텁 제거 (Line 162-163), `CardViewHistory.card` 는 유지 또는 `searchHistory.ts` 로 이동
- `backend/src/resolvers/index.ts` — 머지
- `backend/schema/schema.graphql` — `importLocalState` 와 관련 input 추가
- `frontend/schema.graphql` — 위와 동기화 후 `bun run relay-compiler`
- `frontend/src/relay-environment.ts` — LOCAL_ONLY 분기 제거, `credentials: include`, 마이그레이션 훅
- `frontend/src/serve.ts` + `frontend/src/serve/{decks,history}.ts` — `@deprecated` 주석

## 후속 (이 PR 범위 밖)

- `serve.ts`, `serve/decks.ts`, `serve/history.ts` 완전 제거 (스테이징 검증 후 별도 PR)
- README / 배포 문서 업데이트 (`VITE_GRAPHQL_URL` 필수, `FRONTEND_ORIGIN` 백엔드 env)
- 쿠키 → 진짜 유저 계정 도입은 별도 스코프
