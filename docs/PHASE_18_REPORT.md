# PHASE_18_REPORT.md — Arsenal-X recovery & foundation (2026-09-19)

## Baseline (before changes)

- App: Next.js 15 + React 19, `D:\node.js\node.exe` v24, committed
  node_modules, no tests, no database, in-memory 10-min index cache.
- `lib/indexer.ts`: `ROOT = 'D:\Arsenal'` (drive does not exist).
- Live dev-server probes: `/api/system` → 200 total=0; `/api/search?q=luxury`
  → 200 total=0; `/api/gaps` → 200 empty. Trace logs prove prior live use
  from D: (`/api/search?q=luxury`, `/api/discover?intent=dark luxury`,
  `/api/related?code=X-BG-0001`, `/api/file?...jpg`).
- Existing tests: none (`dev/build/start/lint` scripts only).

## Files inspected (~40)

lib/{indexer,arsenalSearch,indexCache,quality,workspace}.ts; all 26
`app/api/*/route.ts`; `app/page.tsx` (+7 other pages skimmed);
`components/` (7 files, structure); `package.json`, `tsconfig.json`,
`next.config.mjs`; `_scripts/download_queue.ps1`, `_logs/manifest.tsv`;
`07_AI_Models` contents; audit Phase-17 JSONLs as evidence.

## Changes made

1. `lib/config.ts` (new): single authoritative root — explicit >
   `ARSENAL_ROOT` env > derived default (upward `_projects` search,
   `.next`/`node_modules`-aware); `requireArsenalRoot()` fails clearly.
2. `lib/indexer.ts`: `ROOT` now a live binding from config (importers
   unchanged); no other logic touched.
3. `lib/assetIdentity.ts` (new, additive): identity/provenance/risk/
   sensitivity/semantic-status/type-normalization + `EnrichAsset` and
   visual-lens contract types.
4. `app/api/tools/route.ts`: model dirs + MDN path from config; response
   gains `arsenalRoot`.
5. `app/api/system/route.ts`: `roots` derived from config; additive
   `arsenalRoot/arsenalRootOk/arsenalRootSource`.
6. `app/page.tsx`: 3 display strings read live root from `/api/system`.
7. `tests/{config,identity,search}.test.mjs` + `tests/loader.mjs` (node:test,
   zero deps); `package.json` gains `npm test`.
8. `docs/{ARSENAL_X_ARCHITECTURE,ASSET_INTELLIGENCE_FOUNDATION,PHASE_18_REPORT}.md`.

## Bugs fixed

- Wrong-drive ROOT (total 0 → 38,784 items live).
- Root derivation breaking under Next build output (`.next/server` trap).
- 4 source files with hardcoded `D:\Arsenal` (indexer, tools, system,
  homepage). `.next` cache left to regenerate.

## APIs preserved

All 26 endpoints, same paths/methods/shapes; only additive fields
(`arsenalRoot*`, `arsenalRoot` in tools). No contracts broken.

## Schemas changed

Additive only: system/tools responses gain root fields; new TS types in
assetIdentity.ts; XCodeItem untouched.

## Tests added / results

- 18 tests, 3 suites: config (A/B/J), identity (C/D/E/F + provenance/risk/
  sensitivity/types), search (G/H/I + compat). `npm test` → **18/18 pass**.
- `tsc --noEmit` → clean.
- Live: system total 38,784 from F:; search `luxury` → 13; models present
  3+2; gaps computed; `/api/file` traversal → 403; resolve X-VID-0001 →
  found. Baseline-vs-fixed recorded above.

## Failures / skips

None in Phase-18 scope. Pre-existing environment notes (not failures):
no SVG rasterizer, no onnxruntime/whisper.cpp, `.next`+`node_modules`
committed, X-Codes positional (documented).

## Known limitations

Filename-only search until enrichment; no hashes in index (on-demand
identity instead); quality recency is wall-clock-dependent (preserved);
codes shift if the file set changes; catalog.json (dashboard) still stale
— different owner, untouched.

## Future interfaces

`EnrichAsset`, `AssetSearchRequest/AssetCandidate`, reindex/event,
tools-model discovery, acquisition backend seed (§7 of foundation doc).

## Exact next-phase boundary

Phase 19 may: implement ONE modality enricher + persist enrichment.
It may not: rewrite search, add databases without cause, touch assets,
or start acquisition/editing integrations. Then STOP per phase rules.
