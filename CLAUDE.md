# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GCG DeckBuilder is a Gundam Card Game deck builder app. It consists of three workspaces:
- **frontend/**: React SPA with Relay GraphQL, TanStack Router, Tailwind CSS
- **crawler/**: Bun-based web scraper for gundam-gcg.com
- **data/**: ETL pipeline that processes raw crawled data into GraphQL-ready JSON

## Commands

### Frontend
```bash
cd frontend
bun install
bun --bun run dev          # Dev server on port 3000
bun --bun run build        # Production build
bun --bun run test         # Vitest
bun run oxfmt              # Format code
bun run oxfmt --check      # Check formatting
bun run relay-compiler     # Regenerate Relay artifacts (run after schema.graphql changes)
```

### Data Pipeline (run in order)
```bash
cd data
bun run 1.validator.ts     # Validate raw.json with Zod schemas
bun run 2.mapper.ts        # Normalize names and effect text
bun run 3.splitter.ts      # Split by package into data/*.json
```

### Crawler
```bash
cd crawler
bun run cardList.ts        # Fetch card URLs by package
bun run detail.ts          # Scrape individual card pages → data/raw.json
```

## Architecture

### Data Flow
```
gundam-gcg.com → crawler → data/raw.json
                         → data/1.validator.ts → data/2.mapper.ts → data/mapped.json
                         → data/3.splitter.ts → data/data/*.json (per package)
                         → frontend/src/serve.ts (in-browser GraphQL)
                         → React Relay components
```

### In-Browser GraphQL Server (`frontend/src/serve.ts`)
This is the core architectural decision: there is **no backend server**. The GraphQL schema is executed entirely in the browser using `graphql-js`. `serve.ts` imports `mapped.json`, builds in-memory indexes (cardById, pilotByName), and creates a Relay-compatible network layer. All card data is bundled into the client.

### GraphQL Schema (`frontend/schema.graphql`)
- **Card union**: `Resource | BaseCard | UnitCard | PilotCard | CommandCard`
- **UnitLink union**: `LinkTrait | LinkPilot` (units link to either a trait or a specific pilot)
- `Query.cards(first, after, filter)` — cursor-paginated with `CardFilterInput`
- `Query.node(id)` — Relay node interface
- After any schema change, run `bun run relay-compiler` to regenerate `src/__generated__/` artifacts

### Relay Integration
- Relay compiler is configured in `relay.config.json`, pointing at `schema.graphql`
- Generated artifacts live in `src/__generated__/`
- `main.tsx` sets up the Relay environment using the network function from `serve.ts`
- Components use `useLazyLoadQuery`, `useFragment`, and `usePaginationFragment`

### Card Data Structure
Cards have: `id`, `name`, `level`, `cost`, `color`, `series`, `package`, `rarity`, `keywords`, `traits`, `zone`, `effects[]`, and type-specific fields (`ap`/`hp` for units, `link` for unit/pilot relationships).
