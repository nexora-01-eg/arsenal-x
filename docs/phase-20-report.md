# PHASE 20 REPORT — Semantic Asset Search & Matching (2026-09-20)

Status: **PASS**

## What was built
- `lib/match.ts`: `parseIntent` (duration incl. hyphenated/range forms,
  aspect, resolution, type keywords, stopword-filtered semantic tokens),
  `matchAssets(req, ctx)` (pure, deterministic), `liveContext()` /
  `matchLive()` (real index + enrichment corpus).
- Scoring (deterministic, no wall-clock): type +30, duration +20, aspect
  +15, resolution +10, measured evidence +8 each, filename hint +2 (weakest),
  KNOWN provenance +5, REVIEW_REQUIRED −20 + warning, size/format crumbs.
  Sort: score desc, relPath asc. Unmet requirements listed in warnings,
  never hidden.
- Measured-evidence vocabulary (the ONLY non-technical claims allowed
  without a VLM): dark/night, bright/day, blue, warm, static, cinematic
  (low brightness), palette color names (nearest-named).
- `app/api/match` (new GET): `intent` required; `type/dur_min/dur_max/ar/
  res/require[]/limit`; returns intent + parsed + candidates with evidence.
- Unknown enrichment never excludes (technical_match false + `unmet` note).

## Verification
- 8 new tests (parsing, ranking, unmet-instead-of-invented, negative match,
  UNKNOWN handling, determinism twice-equal, provenance) + 1 regression test
  for the separator bug below. Suite: **33/33**. tsc clean.
- Live (`/api/match?intent=dark space video 16:9`): top candidates carry
  `aspect_ratio 16:9` + `measured.dark_frames=1/3` + PARTIAL status —
  evidence-backed ranking confirmed on real data.
- Regression: `/api/search?q=luxury` → 13 (unchanged); full suite green.

## Real bug found by live verification
Index relPaths use `/` while enrichment records store OS `\` — enrichment
never joined, matcher silently degraded to filename hints. Fixed in
`enrichmentFor` (separator normalization) + regression test. This is
exactly why live checks are mandatory.

## Limitations
- Semantic vocabulary is small and measurement-bound (no subjects/objects/
  moods until a VLM lands — interface ready).
- Only 80/409 videos + 300/1841 images enriched; unenriched assets match on
  technical-known facets only, unknowns recorded.
- Filename hints still contribute (+2) — documented as weakest evidence.

Gate: PASS → continue to Phase 21.
