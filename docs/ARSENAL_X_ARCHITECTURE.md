# ARSENAL_X_ARCHITECTURE.md — Phase 18 (2026-09-19)

Forensic map of the existing system. Nothing here is aspirational; every
statement was verified against implementation.

## Runtime / stack

- Next.js 15.1 + React 19 + Tailwind 4, TypeScript strict, `output: 'standalone'`.
- Node v24.14.1 on this machine (`D:\node.js\node.exe`; npm 11.11.0).
- No test runner, no database, no ORM, no vector store, no background jobs.
- `node_modules` is committed into the project (~14k files); `.next` is a
  regenerable build cache (contains stale `D:\Arsenal` trace strings — do NOT edit).

## Entry points

- `npm run dev` (default :3000; verified on :8787), `next build/start`.
- UI pages: `/`, `/search`, `/discover`, `/collections`, `/vault`,
  `/workspace`, `/gaps`, `/system`, `/tools`, `/fonts`, `/[category]`.
- 26 API routes under `app/api/` (see map). No CLI tools. No scripts.

## Index technology

- No durable index. `lib/indexCache.ts`: in-memory Map, 10-minute TTL,
  `getCached(slug, builder)`, `invalidateAll()` (POST `/api/reindex`).
- `lib/indexer.ts`: synchronous `readdirSync` walks over curated roots per
  category; items `{code, name, path, relPath, size, ext, source, tags?,
  mtimeMs?}`; stable sort (name, path) → deterministic `X-<PREFIX>-NNNN`
  codes. SKIP_DIRS excludes node_modules/.git/.next/_projects/etc.
- Filesystem is the database. Full cold index ≈ 38.8k items (categories
  overlap by design: e.g. three.js files appear in BG + 3D + VID).

## Filesystem assumptions (pre-Phase-18 defects)

- `lib/indexer.ts`: `ROOT = 'D:\Arsenal'` — wrong drive; every indexer
  silently returned `[]` (verified live: `/api/system` → total 0).
- `app/api/tools/route.ts`: 2 model dirs + MDN path hardcoded `D:\…`.
- `app/api/system/route.ts`: display string `roots: ['D:\Arsenal …']`.
- `app/page.tsx`: 3 display strings with `D:\Arsenal`.
- `.next` cache + `_logs/trace` prove the app previously ran from D:.
- Phase-18 fix: `lib/config.ts` (env `ARSENAL_ROOT` > derived default),
  all consumers derive from it; UI strings come from `/api/system`.

## Endpoint map (26, all GET unless noted)

| Route | Behavior |
|---|---|
| `/api/search?q=` | `searchAll(q,'and',24)`, capped 240 rows; 200 + `{query,total,groups}` |
| `/api/discover?intent=` | intent search entry (verified in traces) |
| `/api/related?code=` | items related to an X-Code (verified in traces) |
| `/api/resolve?code=` | single X-Code → item (+400 without code) |
| `/api/catalog` | 12 category cards + total (homepage counter) |
| `/api/collections` | curated collections (homepage teaser) |
| `/api/vault` | vault top items (homepage teaser) |
| `/api/newest?limit=` | newest by mtimeMs |
| `/api/gaps` | 9-area strong/ok/gap analysis (SFX, Arabic fonts, seamless BG, ambient, video, icons, models, LUTs, templates) |
| `/api/system` | counts + cache stats + quarantine walk + disk + root provenance (Phase-18 additive fields) |
| `/api/reindex` | GET status; POST clears cache |
| `/api/file?path=` | streams file under ROOT (traversal-safe: normalize + startsWith → 403; Range support for media) |
| `/api/archive-contents`, `/api/archives` | zip listing/download surface |
| `/api/{images,backgrounds,icons,models,luts,fx,music,sfx,video,templates,fonts}` | `getCached(slug, indexFn)` full category dump |
| `/api/{kit,vault,collections,workspace}`-ish extras (`kit`, `models`, `music`, `newest`, `templates`) | category/collection surfaces (same machinery) |
| `/api/tools` | installed desktop tools + AI model dirs + MDN presence (now root-derived) |

Category routes share one pattern (`video/route.ts` read as exemplar).

## Data flows

- Indexing: request → getCached → walk curated roots → sort → assignCodes.
- Search: `searchAll` tokenizes query → per-item `tokenScore` (code 100/60, name 50/35, ext 30, tags 25, source 15, path 10, size/format micro-bonuses) → AND/OR → sort → slice 24/cat.
- Scoring: `lib/quality.ts` per-category scorers from real fields only (size/ext/tags/source/mtime recency). NOTE: recency uses `Date.now()` — scores decay over wall-clock time (existing behavior, preserved).
- Gaps: regex/token heuristics over SFX names, Arabic font families, BG tags, ambient music names, category counts.
- File serving: ROOT-anchored, traversal-blocked, streamed with ranges.

## Shared models / storage / callers

- `XCodeItem`, `XCategoryMeta`, `CATEGORIES` (indexer); `Quality` (quality);
  `AssetRef/Collection/Project` (workspace, client collections).
- No storage beyond memory + filesystem. Callers: UI pages/components +
  any HTTP client (future Al-Montier boundary = these routes).

## Known defects (Phase-18 status)

1. Wrong-drive ROOT → empty index — FIXED via config.
2. `catalog.json` (repo root dashboard) stale 2026-09-01, capped, misaligned — NOT owned by arsenal-x; left alone, documented.
3. X-Codes shift when the file set changes (positional ids) — documented limitation; no migration (would need a code→path registry = future).
4. Quality recency is wall-clock-dependent — preserved as-is, documented.
5. No hashes, no license registry, no semantic fields — added additively in `lib/assetIdentity.ts` (opt-in, no index changes).
6. `.next` + `node_modules` committed — left alone (out of scope; rebuild regenerates).

## Proposed Phase-18 changes (all applied)

config.ts; indexer ROOT live binding; tools/system/page root derivation;
assetIdentity.ts (identity/provenance/risk/sensitivity/semantic + visual-lens
contract types); `/api/system` additive root fields; tests/ (node:test, no
deps); `npm test` script. No endpoint removed, no contract broken.
