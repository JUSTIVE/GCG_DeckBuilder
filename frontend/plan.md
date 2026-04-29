# 로컬 전용 GraphQL 쿼리를 백엔드로 이전

## Context

`feat/backend` 브랜치의 `frontend/src/relay-environment.ts:10-43` 에서 Relay 요청을 분기한다. `VITE_GRAPHQL_URL` 이 설정되고 operation 이름이 `/Deck|History|AddFilterSearch|AddCardView|MainPage/` 에 매칭되지 않으면 백엔드(Elysia + graphql-yoga + Kysely + Postgres)로, 매칭되면 `frontend/src/serve.ts` 의 localStorage 기반 인-브라우저 GraphQL 로 간다. 카드 데이터는 이미 `cards` 테이블에 있지만 `deckList` / `searchHistory` 는 `backend/src/resolvers/cards.ts:162-163` 에서 빈 싱글톤을 돌려주는 스텁이다.

이번 작업의 목표:

- 덱/검색 히스토리를 포함한 **모든 데이터 조회/변경을 백엔드로 이전**하고, `LOCAL_ONLY` 분기를 제거해 서버 전환을 완료한다. 프론트엔드는 더 이상 어떤 GraphQL 요청도 로컬에서 처리하지 않는다.
- **Google OAuth 로그인** (Google Identity Services, 이하 GIS) 을 도입해 사용자 단위로 데이터를 격리한다. 로그인 상태는 HTTP-only 쿠키(`gcg_sid`)가 가리키는 서버측 `sessions` 레코드로 유지.
- **공개(비로그인) 가능**: 카드 조회 계열 — `Query.cards`, `Query.quicksearch`, `Query.node`, `Query.randomCard(s)`, `Query.trait/keyword/color/series` + `Query.me`, `Mutation.loginWithGoogle`, `Mutation.logout`. 
- **로그인 필수**: 덱/히스토리 관련 전부 — `Query.deckList`, `Query.searchHistory`, `Mutation.createDeck/deleteDeck/renameDeck/addCardToDeck/removeCardFromDeck/setDeckCards`, `Mutation.addFilterSearch/addCardView/removeSearchHistory/clearSearchHistory`, `Mutation.importLocalState`. 이들은 `UNAUTHENTICATED` 로 거절.
- 기존 localStorage 에 저장된 덱/히스토리는 **로그인한 사용자가 명시적으로 버튼을 눌렀을 때만** `importLocalState` 뮤테이션으로 이관한다. 자동 업로드 하지 않음. 이관 완료 후에만 로컬 키 삭제, 무시하고 싶으면 별도 "삭제" 버튼 제공.

비즈니스 규칙(50장, 2색, 4카피, `card.limit` 우선, Resource 제외, 히스토리 15개, dedupe)은 백엔드로 이식한다. 클라이언트는 `AddCardToDeckResult` union 의 에러 케이스 렌더링만 담당한다.

## 이전 대상 Operation

`LOCAL_ONLY` 정규식이 잡는 기존 operation 전부에 로그인 관련 신규 operation 추가:

- **Query**: `MainPageQuery`, `DeckListPageQuery`, `DeckDetailPageQuery`, `SearchHistoryPanelQuery`, **`CurrentUserQuery`(신규)**
- **Mutation (덱)**: `DeckListPageCreateDeckMutation`, `DeckListPageDeleteDeckMutation`, `DeckDetailPageRenameDeckMutation`, `DeckDetailPageAddCardMutation`, `DeckDetailPageRemoveCardMutation`, `DeckDetailPageSetDeckCardsMutation`
- **Mutation (히스토리)**: `CardListAddFilterSearchMutation`, `CardByIdOverlayAddCardViewMutation`, `SearchHistoryPanel...RemoveMutation`, `...ClearMutation`
- **Mutation (인증, 신규)**: `LoginWithGoogleMutation`, `LogoutMutation`
- **Mutation (신규)**: `ImportLocalStateMutation`

## 데이터 흐름 (변경 후)

```mermaid
flowchart LR
  Browser["Relay client<br/>(React)"]
  GIS["Google Identity Services<br/>(accounts.google.com/gsi)"]
  Cookie[("HTTP-only cookie<br/>gcg_sid")]
  Migrator["migrate-local-state.ts<br/>(최초 로그인 후 1회)"]
  LS[("localStorage<br/>gcg_decks / gcg_search_history")]

  subgraph Backend["Elysia + Yoga"]
    Ctx["createContext<br/>(cookie → session → user)"]
    RAuth["resolvers/auth.ts<br/>(loginWithGoogle / logout / me)"]
    RDeck["resolvers/decks.ts"]
    RHist["resolvers/searchHistory.ts"]
    RMig["resolvers/migration.ts"]
    Helpers["serve/deck-helpers.ts"]
    Verify["google-auth-library<br/>(ID token 검증)"]
  end

  subgraph DB[(Postgres)]
    TUsers["users"]
    TSessions["sessions"]
    TDecks["decks"]
    TDeckCards["deck_cards"]
    THistory["search_history"]
    TCards["cards (기존)"]
  end

  Browser -- "GIS credential (ID token)" --> GIS
  GIS -- "idToken callback" --> Browser
  Browser -- "loginWithGoogle(idToken)<br/>fetch credentials:'include'" --> RAuth
  RAuth --> Verify
  RAuth -- "upsert user + create session<br/>Set-Cookie gcg_sid" --> DB
  Cookie <-. "Set-Cookie on login / cleared on logout" .-> Ctx

  Browser -- "후속 GraphQL 요청<br/>(credentials:'include')" --> Ctx
  Migrator -- "ImportLocalStateMutation" --> RMig
  LS -. "읽고 삭제" .- Migrator

  Ctx --> RAuth & RDeck & RHist & RMig
  RDeck & RHist & RMig --> Helpers
  Helpers --> DB
  RDeck -. "cardById loader" .-> TCards
```

## 구현 계획

### A. 백엔드 — DB 마이그레이션

**신규**: `backend/db/migrations/002_auth_decks_history.sql`

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,             -- crypto.randomUUID()
  google_sub    TEXT NOT NULL UNIQUE,         -- Google "sub" claim (유저 고유 ID)
  email         TEXT NOT NULL,
  name          TEXT,
  picture_url   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_email_idx ON users (email);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,               -- crypto.randomUUID(), HTTP-only 쿠키 값
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_active_idx ON sessions (id) WHERE revoked_at IS NULL;

CREATE TABLE decks (
  id          TEXT PRIMARY KEY,               -- `@${btoa("Deck:"+createdAt)}` 기존 포맷 유지
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX decks_user_idx ON decks (user_id, created_at DESC);

CREATE TABLE deck_cards (
  deck_id     TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id     TEXT NOT NULL,
  count       INT  NOT NULL CHECK (count > 0),
  position    INT  NOT NULL,
  PRIMARY KEY (deck_id, card_id)
);
CREATE INDEX deck_cards_deck_idx ON deck_cards (deck_id, position);

CREATE TABLE search_history (
  id          TEXT PRIMARY KEY,               -- btoa(kind + ":" + iso)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('filter','card_view')),
  payload     JSONB NOT NULL,                 -- filter+sort 또는 {cardId}
  dedupe_key  TEXT NOT NULL,                  -- 정규화된 필터 JSON 또는 cardId
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX search_history_user_idx ON search_history (user_id, searched_at DESC);
CREATE UNIQUE INDEX search_history_dedupe_idx ON search_history (user_id, kind, dedupe_key);
```

**수정**: `backend/db/types.ts` — `UsersTable`, `SessionsTable`, `DecksTable`, `DeckCardsTable`, `SearchHistoryTable` 추가하고 `DB` 인터페이스에 등록.

### B. 백엔드 — OAuth 검증, 세션 쿠키, context

**의존성 추가**: `cd backend && bun add google-auth-library` (ID token 검증용 `OAuth2Client.verifyIdToken`).

**환경변수** (`backend/.env`):
- `GOOGLE_CLIENT_ID` — Google Cloud Console 에서 발급한 OAuth 클라이언트 ID
- `FRONTEND_ORIGIN` — 예: `http://localhost:3000`
- `SESSION_COOKIE_NAME` = `gcg_sid`
- `SESSION_TTL_DAYS` = `30`

**신규**: `backend/src/auth/google.ts`

```ts
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("invalid google token");
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
```

**수정**: `backend/src/context.ts`

- 인자 `{ request }: { request: Request }` 추가. `request.headers.get("cookie")` 에서 `gcg_sid` 파싱.
- `gcg_sid` 가 유효한 세션(존재 + `revoked_at IS NULL` + `expires_at > now()`)이면 `users` 와 조인해 `currentUser` 로드. 그렇지 않으면 `currentUser: null` 로 두고 `clearCookie: true` 플래그 세움.
- `Context` 타입: `{ db, loaders, currentUser: User | null, setCookie?: { id: string; maxAgeSec: number } | null, clearCookie?: boolean }`.
- 헬퍼: `export function requireUser(ctx: Context): User { if (!ctx.currentUser) throw new GraphQLError("UNAUTHENTICATED", { extensions: { code: "UNAUTHENTICATED" } }); return ctx.currentUser; }`

**수정**: `backend/src/index.ts`

- Yoga `context: ({ request }) => createContext({ request })`.
- CORS: `createYoga({ ..., cors: { origin: process.env.FRONTEND_ORIGIN, credentials: true } })`.
- Yoga `plugins: [{ onResponse: ({ serverContext: ctx, response }) => { if (ctx.setCookie) response.headers.append("Set-Cookie", buildCookie(ctx.setCookie)); if (ctx.clearCookie) response.headers.append("Set-Cookie", clearCookie()); } }]`
  - `buildCookie`: `gcg_sid=<id>; HttpOnly; SameSite=Lax; Path=/; Max-Age=<sec>; Secure` (프로덕션). dev/localhost 에서는 `Secure` 생략.
  - `clearCookie`: `gcg_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`.

### C. 백엔드 — 리졸버

**신규**: `backend/src/resolvers/auth.ts`

| GraphQL                             | 구현                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Query.me`                          | `ctx.currentUser` 그대로 반환 (null 가능)                                                                                                                                                                                                                                                                                                                     |
| `Mutation.loginWithGoogle(idToken)` | `verifyGoogleIdToken(idToken)` → `INSERT INTO users (id, google_sub, email, name, picture_url) VALUES ... ON CONFLICT (google_sub) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, picture_url=EXCLUDED.picture_url, last_login_at=now() RETURNING *` → 신규 session INSERT (id=UUID, expires_at=now()+TTL) → `ctx.setCookie = { id, maxAgeSec }` → `{ user }` 반환 |
| `Mutation.logout`                   | 쿠키의 세션 ID 로 `UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$ctx.currentUser.id` → `ctx.clearCookie = true` → `true` 반환. 비로그인 상태여도 idempotent.                                                                                                                                                                                 |

**신규**: `backend/src/serve/deck-helpers.ts`

- 프론트에서 그대로 복사할 순수 함수들:
  - `frontend/src/lib/deckLinks.ts` 의 `splitPilotAliases`, `computeDeckLinkSets`, `unitHasNoLinkedPilot`, `pilotHasNoLinkedUnit` — 의존성 없음, 그대로 복사.
  - `frontend/src/serve/fieldResolver.ts:37-58` 의 `extractCommandPilotName`, `66-106` 의 `normalizeRawCardForLinks` — 카드 raw JSON → link 계산용 정규화 로직.
  - `frontend/src/serve/decks.ts:47-63` 의 `deckCardCount`, `deckColors` 등가 함수 (Resource 제외 + color set).
- 상수: `DECK_MAX_CARDS = 50`, `DECK_MAX_COPIES = 4`, `DECK_MAX_COLORS = 2`.
- 카드 raw JSON 은 `cards.raw` JSONB 에서 가져오므로 프론트와 동일한 스키마를 받는다.

**신규**: `backend/src/resolvers/decks.ts`

모든 리졸버 맨 앞에서 `const user = requireUser(ctx);` 로 가드.

| GraphQL 필드                                                   | 구현                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Query.deckList`                                               | `SELECT * FROM decks WHERE user_id=$user ORDER BY created_at DESC`; 각 deck 을 `{ __typename: "Deck", id, name, createdAt, userId }` 로 반환                      |
| `Deck.cards`                                                   | `deck_cards` 조회 → `cardById` DataLoader 로 raw 카드 로드 → `DECK_CARD_VARIANT` 태깅 + `computeDeckLinkSets` 로 `pilotLinked` / `hasLinkingUnit` 계산             |
| `Deck.colors` / `topKeywords` / `topTraits` / `hasLinkWarning` | `deck-helpers.ts` 재사용. 같은 deck 에 대해 중복 계산을 피하려 `DataLoader<deckId, TaggedDeckCards>` 를 `context.loaders.deckCards` 로 추가                       |
| `Mutation.createDeck`                                          | ID 는 프론트와 동일한 `@${btoa("Deck:"+createdAt)}` 포맷. `INSERT INTO decks (id, user_id, name)` 후 `deckList` 재로드                                              |
| `Mutation.deleteDeck`                                          | `DELETE FROM decks WHERE id=$1 AND user_id=$user` (ON DELETE CASCADE 로 deck_cards 자동 삭제) → `deckList`                                                        |
| `Mutation.renameDeck`                                          | `UPDATE ... WHERE id=$1 AND user_id=$user RETURNING *`; 소유권 없으면 예외                                                                                        |
| `Mutation.addCardToDeck`                                       | 트랜잭션: 덱 소유권 확인 → 규칙 검사 (`AddCardToDeckResult` union 으로 에러 반환) → `INSERT ... ON CONFLICT (deck_id, card_id) DO UPDATE SET count = deck_cards.count + 1` |
| `Mutation.removeCardFromDeck`                                  | count 1 이하면 row DELETE, 아니면 decrement                                                                                                                       |
| `Mutation.setDeckCards`                                        | 트랜잭션: 소유권 확인 → `DELETE FROM deck_cards WHERE deck_id=$1` → 입력 재삽입 (position 순서 보존, `count>0` 만)                                                |

**신규**: `backend/src/resolvers/searchHistory.ts`

모든 리졸버 앞에서 `requireUser(ctx)`. 스코프는 `user_id`.

| GraphQL 필드                                          | 구현                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Query.searchHistory`                                 | `SELECT ... WHERE user_id=$user ORDER BY searched_at DESC LIMIT 15`; kind 별로 `FilterSearchHistory` / `CardViewHistory` 태깅                                                                                                                                                                                           |
| `FilterSearchHistory.filter`                          | `payload` JSON 그대로 반환 (스키마 `SearchHistoryFilter` 형태)                                                                                                                                                                                                                                                           |
| `CardViewHistory.card`                                | 기존 리졸버 `cards.ts:219-223` 에 있는 `CardViewHistory.card` 구현 재사용 (DataLoader) — 신규 파일로 옮기거나 원래 위치에 둔 채 import                                                                                                                                                                                   |
| `Mutation.addFilterSearch`                            | `dedupe_key = JSON.stringify(normalizeFilter(input))` (키 정렬 + 배열 정렬, `frontend/src/serve/history.ts:45-52` 의 `filterKey` 와 동일) → `INSERT ... ON CONFLICT (user_id, kind, dedupe_key) DO UPDATE SET searched_at=now(), payload=EXCLUDED.payload` → 초과분 `DELETE WHERE id NOT IN (SELECT id ... LIMIT 15)` |
| `Mutation.addCardView`                                | `dedupe_key = cardId` 로 동일한 패턴                                                                                                                                                                                                                                                                                     |
| `Mutation.removeSearchHistory` / `clearSearchHistory` | user 스코프 DELETE                                                                                                                                                                                                                                                                                                       |

**신규**: `backend/src/resolvers/migration.ts`

- `Mutation.importLocalState(input)` — `requireUser(ctx)` 가드 후 단일 트랜잭션으로:
  1. 입력 덱들 `INSERT INTO decks (id, user_id, name, created_at) ... ON CONFLICT (id) DO NOTHING`
  2. 각 덱의 `deck_cards` 삽입 (동일 `ON CONFLICT DO NOTHING`)
  3. `filterSearches` / `cardViews` 를 `search_history` 로 위와 동일한 dedupe 규칙 적용해 삽입
  4. 각 덱의 규칙 검증은 생략 (로컬에서 이미 유효한 상태였다고 가정; 관대하게 수용)
- 반환: `ImportLocalStateResult { importedDecks: Int!, importedHistory: Int! }`.

**수정**: `backend/schema/schema.graphql` 끝에 추가:

```graphql
type User {
  id: ID!
  email: String!
  name: String
  pictureUrl: String
}

type LoginResult {
  user: User!
}

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

extend type Query {
  me: User
}

extend type Mutation {
  loginWithGoogle(idToken: String!): LoginResult!
  logout: Boolean!
  importLocalState(input: ImportLocalStateInput!): ImportLocalStateResult!
}
```

**수정**: `frontend/schema.graphql` 에 위 블록 동일하게 추가 → `cd frontend && bun run relay-compiler`.

**수정**: `backend/src/resolvers/cards.ts`
- `162-163` 의 `searchHistory` / `deckList` 스텁 제거.
- 카드 관련 Query (`cards`, `quicksearch`, `node`, `randomCard`, `randomCards`, `trait`, `keyword`, `color`, `series`) 는 **비로그인 허용** — 기존 로직 그대로 유지, 가드 추가 없음.
- 가드는 `decks.ts` / `searchHistory.ts` / `migration.ts` 의 리졸버에서 각각 `requireUser(ctx)` 호출로 처리. `guards.ts` 의 `withUser` 는 해당 파일들에서만 사용.

**수정**: `backend/src/resolvers/index.ts` — 새 리졸버 머지:

```ts
import { mergeResolvers } from "@graphql-tools/merge";
import { cardResolvers } from "./cards";
import { authResolvers } from "./auth";
import { deckResolvers } from "./decks";
import { searchHistoryResolvers } from "./searchHistory";
import { migrationResolvers } from "./migration";
export const resolvers = mergeResolvers([
  cardResolvers,
  authResolvers,
  deckResolvers,
  searchHistoryResolvers,
  migrationResolvers,
]);
```

(`@graphql-tools/merge` 는 이미 `@graphql-tools/schema` 의존성에 포함됨.)

### D. 프론트엔드 — Google 로그인, 세션, 마이그레이션

**환경변수** (`frontend/.env.local`):
- `VITE_GRAPHQL_URL=http://localhost:4000/graphql`
- `VITE_GOOGLE_CLIENT_ID` — 백엔드와 동일한 OAuth 클라이언트 ID

**수정**: `frontend/index.html`

- `<head>` 에 `<script src="https://accounts.google.com/gsi/client" async defer></script>` 추가.

**신규**: `frontend/src/lib/google-auth.ts`

```ts
export type GoogleCredentialResponse = { credential: string /* ID token JWT */ };

export function initGoogleSignIn(onCredential: (idToken: string) => void) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is required");
  // @ts-expect-error — GIS 전역
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (resp: GoogleCredentialResponse) => onCredential(resp.credential),
  });
}

export function renderGoogleSignInButton(el: HTMLElement) {
  // @ts-expect-error
  google.accounts.id.renderButton(el, { theme: "outline", size: "large" });
}

export function googleSignOut() {
  // @ts-expect-error
  google.accounts.id.disableAutoSelect();
}
```

**신규**: `frontend/src/hooks/useCurrentUser.ts`

- Relay `useLazyLoadQuery` 로 `CurrentUserQuery { me { id email name pictureUrl } }`.
- Suspense fallback 을 `null` 로 두고, `me` 가 `null` 이면 비로그인 처리.

**신규**: `frontend/src/page/LoginPage.tsx`

- `renderGoogleSignInButton` 호출 → idToken 받으면 `LoginWithGoogleMutation` 실행.
- 성공 시: `CurrentUserQuery` refetch → 원래 가려던 라우트로 redirect. **마이그레이션은 자동 호출하지 않음.**
- 실패 시 토스트로 에러 표시.

**신규**: `frontend/src/components/RequireAuth.tsx`

- `useCurrentUser()` 결과 null 이면 `<LoginPage />` 렌더(또는 `/login` 으로 redirect), 아니면 `children`.
- 덱/히스토리 관련 라우트만 감싼다: `MainPage`(덱 썸네일), `DeckListPage`, `DeckDetailPage`, 그리고 `CardListPage` 의 `SearchHistoryPanel` 영역.
- 카드 목록/상세는 비로그인에서도 접근 가능 — 라우트 자체는 게이트하지 않고, 해당 페이지 내부의 "덱에 추가" 같은 버튼만 로그인 시에만 활성화(비로그인 시 버튼 대신 로그인 유도).

**신규**: `frontend/src/components/LocalStateMigrationPrompt.tsx`

- 로그인 상태이고 `hasLocalStateToMigrate()` 가 true 일 때만 `DeckListPage` 상단 (또는 계정 메뉴/설정 페이지) 에 배너/다이얼로그로 노출.
- 메시지: "이 브라우저에 이전에 저장된 덱 N개, 검색 기록 M개가 있습니다. 내 계정으로 가져올까요?"
- 버튼 3개:
  - **가져오기**: `useMutation(ImportLocalStateMutation)` 으로 `migrateLocalState(commit)` 실행 → 성공 시 `deckList` / `searchHistory` 쿼리 invalidate → 토스트 "N개 덱, M개 기록을 가져왔습니다".
  - **가져오지 않고 삭제**: `discardLocalState()` 호출 → 배너 사라짐.
  - **나중에**: 닫기만. 다음 방문에 다시 표시.
- 배너 표시 여부는 상태로 관리 — localStorage 에 `gcg_migration_dismissed_at` 같은 키를 두고 "나중에" 누르면 24시간/세션 동안 숨길 수도 있음(스펙은 간단히 "그 세션만 숨김").

**수정**: `frontend/src/relay-environment.ts` (전량 재작성)

- `LOCAL_ONLY` 정규식과 로컬 분기 제거.
- `BACKEND_URL` 필수 — 없으면 `throw new Error("VITE_GRAPHQL_URL is required")`.
- 모든 `fetch` 에 `credentials: "include"`.
- GraphQL 응답에서 `extensions.code === "UNAUTHENTICATED"` 에러가 오면 Relay store 의 `Query.me` 필드를 invalidate 해서 다음 렌더 시 `RequireAuth` 가 로그인 페이지로 떨어지게 함.
- 마이그레이션 트리거는 **로그인 직후**에만 — relay-environment 자체에는 마이그레이션 로직을 넣지 않는다.

**신규**: `frontend/src/lib/migrate-local-state.ts`

```ts
// localStorage 에서 기존 덱/히스토리 데이터 유무 확인
export function hasLocalStateToMigrate(): boolean {
  return !!localStorage.getItem("gcg_decks") || !!localStorage.getItem("gcg_search_history");
}

// 사용자가 명시적으로 버튼 눌렀을 때 호출. Relay 환경을 통해 mutation 실행.
export async function migrateLocalState(
  commit: (input: ImportLocalStateInput) => Promise<ImportLocalStateResult>,
): Promise<ImportLocalStateResult> {
  const decks = localStorage.getItem("gcg_decks");
  const history = localStorage.getItem("gcg_search_history");
  const input = buildImportInput(decks, history); // 로컬 스키마 → ImportLocalStateInput 변환
  const result = await commit(input); // 실패 시 throw — 상위 UI 가 에러 처리
  localStorage.removeItem("gcg_decks");
  localStorage.removeItem("gcg_search_history");
  return result;
}

// 사용자가 "가져오지 않기" 선택 시
export function discardLocalState(): void {
  localStorage.removeItem("gcg_decks");
  localStorage.removeItem("gcg_search_history");
}
```

`commit` 은 Relay `useMutation` 의 커밋 콜백을 Promise 로 감싼 것을 주입. raw fetch 아닌 Relay 경로로 보내면 캐시/Suspense 동작과도 맞음.

**수정**: `frontend/src/serve.ts` + `frontend/src/serve/*.ts`

- 파일 상단에 `/** @deprecated moved to backend; 보존 유지용 */` 주석 추가.
- `relay-environment.ts` 에서 import 제거. 파일 자체는 삭제하지 않음 (후속 PR).
- `frontend/src/serve.test.ts` 는 유지 (로컬 구현체 테스트).

### E. 테스트

**신규**: `backend/src/resolvers/auth.test.ts`

- `verifyGoogleIdToken` 모킹 후 `loginWithGoogle` 호출 시 users upsert + sessions 생성 + Set-Cookie 헤더 반환 확인.
- Invalid idToken → GraphQL 에러.
- 재로그인 시 users row 1개만 유지 (`ON CONFLICT` upsert), sessions 는 누적.
- `logout` 호출 시 session revoke + Set-Cookie 클리어.

**신규**: `backend/src/resolvers/cards.auth.test.ts`

- 비로그인 컨텍스트로 `cards` / `quicksearch` / `node` / `randomCard` / `trait` 등 카드 관련 쿼리 호출 시 **정상 응답** (UNAUTHENTICATED 아님).
- 비로그인 컨텍스트로 `deckList` / `searchHistory` 호출 시 `UNAUTHENTICATED`.
- `Query.me` 는 비로그인에서도 null 반환 (에러 아님).

**신규**: `backend/src/resolvers/decks.test.ts`

- 비로그인 컨텍스트로 호출 시 `UNAUTHENTICATED` 에러.
- 로그인 컨텍스트에서 50장/2색/4카피/`limit` 규칙 검사 (`DeckFullError`, `DeckColorLimitExceededError`, `CardCopyLimitExceededError` / `CardBannedError`).
- 사용자 A 의 세션으로 사용자 B 덱 ID 에 `renameDeck`/`deleteDeck`/`addCardToDeck` 시도 → 빈 결과 또는 에러 (row-scoped WHERE 로 자연히 차단).

**신규**: `backend/src/resolvers/searchHistory.test.ts`

- 비로그인 → `UNAUTHENTICATED`.
- dedupe: 동일 필터 2회 추가 시 row 1개, `searched_at` 만 갱신.
- 16번째 필터 추가 시 가장 오래된 1개 삭제.

## Verification

1. **마이그레이션**

   ```bash
   cd backend && bun run migrate
   psql $DATABASE_URL -c "\dt"   # users, sessions, decks, deck_cards, search_history 존재
   ```

2. **OAuth 클라이언트 설정**
   - Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID 생성 (Web application).
   - Authorized JavaScript origins: `http://localhost:3000`, 배포 도메인.
   - Client ID 를 `backend/.env` 의 `GOOGLE_CLIENT_ID` 와 `frontend/.env.local` 의 `VITE_GOOGLE_CLIENT_ID` 양쪽에 복사 (두 값은 반드시 동일).

3. **로컬 E2E**

   ```bash
   # 터미널 1
   cd backend && bun run dev
   # 터미널 2
   cd frontend && bun --bun run dev
   ```

   - **비로그인**: 카드 목록/검색/상세는 정상 동작. 덱 리스트/히스토리 페이지 진입 시 로그인 화면. 카드 상세에서 "덱에 추가" 버튼은 비활성(또는 로그인 유도).
   - 쿠키 없이 `curl http://localhost:4000/graphql -d '{"query":"{ cards(first:1){ totalCount } }"}'` → 200 OK. 반면 `{ deckList { id } }` → `UNAUTHENTICATED` 에러.
   - 로그인 버튼 클릭 → Google 팝업 → 성공 후 DevTools → Application → Cookies 에 `gcg_sid` (HttpOnly ✓, Secure 는 HTTPS 에서만) 확인.
   - `users` / `sessions` 테이블에 row 생성됐는지 DB 직접 확인.
   - 로그인 후: 덱 생성/카드 추가/이름 변경/삭제/카드 일괄 교체 전부 동작.
   - 51번째 카드 → `DeckFullError`, 3번째 색 → `DeckColorLimitExceededError`, `limit=0` → `CardBannedError`.
   - 필터 검색 → 히스토리 갱신, 동일 필터 재검색 시 추가 row 없이 최신 시각만 이동.
   - 히스토리 16번째 등록 → 1번째 사라짐.
   - 로그아웃 → 쿠키 사라짐, 덱/히스토리 경로 접근 시 다시 로그인 화면.

4. **마이그레이션 테스트**
   - `main` 브랜치로 전환해 덱/히스토리 생성 → DevTools 에서 `gcg_decks`, `gcg_search_history` 존재 확인.
   - `feat/backend` 로 전환 후 접속 (비로그인) → localStorage 키 유지됨, 마이그레이션 호출 없음.
   - Google 로그인 수행 → DeckListPage 진입 시 `LocalStateMigrationPrompt` 배너가 뜨는지 확인. 자동 호출 없음(Network 에 `ImportLocalStateMutation` 없음).
   - 배너의 **"나중에"** → 배너만 사라지고 localStorage 유지. 새로고침 시 다시 뜸.
   - 배너의 **"가져오기"** → `ImportLocalStateMutation` 1회 호출 → 성공 토스트 → localStorage 키 사라짐 → DeckList 와 SearchHistoryPanel 에 기존 데이터 반영.
   - 배너의 **"가져오지 않고 삭제"** → 뮤테이션 호출 없이 localStorage 키만 삭제, 배너 사라짐.
   - 이관 후 재접속 시 `hasLocalStateToMigrate()` false 이므로 배너 미노출.

5. **사용자 격리**
   - 계정 A 로 로그인 → 덱 생성.
   - 로그아웃 후 계정 B 로 로그인 → 덱 리스트 비어 있음.
   - A 의 `gcg_sid` 쿠키를 수동 주입해 B 의 덱 접근 시도 → user_id 스코프로 빈 결과.

6. **세션 만료**
   - `sessions.expires_at` 을 과거로 직접 수정 → 새로고침 시 자동 로그아웃(쿠키 클리어).

7. **프론트 precheck** (`frontend/CLAUDE.md` 규약)
   ```bash
   cd frontend && tsgo -p . && bun run lint && bun run fmt:check && bun run test
   ```

## 수정/신규 파일 요약

### 신규

- `backend/db/migrations/002_auth_decks_history.sql`
- `backend/src/auth/google.ts`
- `backend/src/serve/deck-helpers.ts`
- `backend/src/resolvers/guards.ts` — `withUser` 고차 함수 (`requireUser` 일괄 적용용)
- `backend/src/resolvers/auth.ts`
- `backend/src/resolvers/decks.ts`
- `backend/src/resolvers/searchHistory.ts`
- `backend/src/resolvers/migration.ts`
- `backend/src/resolvers/auth.test.ts`
- `backend/src/resolvers/cards.auth.test.ts` — 비로그인 시 `UNAUTHENTICATED`, 로그인 시 통과
- `backend/src/resolvers/decks.test.ts`
- `backend/src/resolvers/searchHistory.test.ts`
- `frontend/src/lib/google-auth.ts`
- `frontend/src/lib/migrate-local-state.ts`
- `frontend/src/hooks/useCurrentUser.ts`
- `frontend/src/page/LoginPage.tsx`
- `frontend/src/components/RequireAuth.tsx`
- `frontend/src/components/LocalStateMigrationPrompt.tsx`

### 수정

- `backend/package.json` — `google-auth-library` 의존성 추가
- `backend/.env` (and `.env.example`) — `GOOGLE_CLIENT_ID`, `FRONTEND_ORIGIN`, `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`
- `backend/db/types.ts` — Kysely 테이블 타입 추가
- `backend/src/context.ts` — `{ request }` 받고 쿠키→session→user, `requireUser` 헬퍼
- `backend/src/index.ts` — Yoga `cors: { credentials: true }`, Set-Cookie 응답 훅, context 주입
- `backend/src/resolvers/cards.ts` — `searchHistory` / `deckList` 스텁 제거 (Line 162-163)
- `backend/src/resolvers/index.ts` — 머지 (`mergeResolvers`)
- `backend/schema/schema.graphql` — `User`, `Query.me`, `Mutation.loginWithGoogle/logout/importLocalState`, import 관련 input/result 타입 추가
- `frontend/index.html` — GIS 스크립트 태그
- `frontend/.env.local` (and `.env.example`) — `VITE_GOOGLE_CLIENT_ID`
- `frontend/schema.graphql` — 위와 동기화 후 `bun run relay-compiler`
- `frontend/src/relay-environment.ts` — LOCAL_ONLY 분기 제거, `credentials: include`, UNAUTHENTICATED 에러 핸들링
- `frontend/src/serve.ts` + `frontend/src/serve/{decks,history}.ts` — `@deprecated` 주석
- 덱/히스토리 관련 라우트 (`frontend/src/routes/...`) — `<RequireAuth>` 래퍼 적용

## 후속 (이 PR 범위 밖)

- `serve.ts` 및 `serve/` 로컬 구현 완전 제거 (스테이징 검증 후 별도 PR)
- README / 배포 문서 업데이트 (OAuth 설정, `VITE_GOOGLE_CLIENT_ID` 필수, 백엔드 `GOOGLE_CLIENT_ID` / `FRONTEND_ORIGIN`)
- 세션 주기적 정리 cron (`DELETE FROM sessions WHERE expires_at < now() OR revoked_at IS NOT NULL`), 토큰 회전(rotation), refresh token 흐름은 본 PR 범위 밖
- 다른 OAuth 프로바이더(GitHub, Apple 등) 추가는 별도 스코프
- 계정 삭제(GDPR) 플로우 — `DELETE FROM users` + CASCADE 는 이미 작동하지만 UI/검증 필요, 별도 스코프
