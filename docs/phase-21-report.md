# PHASE 21 REPORT — Visual Verification Engine (2026-09-20)

Status: **PASS**

## What was built
- `lib/verify.ts`: `verifyCandidate(input, ctx)` — verdicts
  PASS/CAUTION/REJECT/UNKNOWN with per-check records and sorted reasons.
  Order: file presence → type → duration/aspect/resolution (measured only;
  unmeasurable ⇒ UNKNOWN check) → semantic requirements (measured evidence
  or UNKNOWN, never invented) → provenance (REVIEW_REQUIRED ⇒ REJECT,
  KNOWN ⇒ pass, UNKNOWN ⇒ CAUTION or REJECT under strict_provenance).
  Aggregation: any REJECT ⇒ REJECT; unmeasurable core technical ⇒ UNKNOWN;
  else any CAUTION/unknown ⇒ CAUTION; else PASS. Fully deterministic.
- `app/api/verify` (new GET): `?path=` or `?code=` + dur_min/dur_max/ar/
  res/type/require[]/strict_provenance.
- 10 new tests (pass/reject×3/caution/strict/unknown/missing/semantic/
  determinism). Suite: **43/43**. tsc clean.

## Live verification
- Webb 190 s video vs 4–6 s + dark + 16:9 → **REJECT** (`duration 190.187s
  outside [4, 6]` + provenance caution).
- MH 14 s clip vs 10–20 s → **CAUTION** (technical pass, provenance UNKNOWN).
- No uncertainty collapsed into PASS anywhere.

## Regression
- Full suite green; no endpoint modified; assets untouched.

## Limitations
- Semantic evidence vocabulary is measurement-bound (Phase 20 set).
- Unenriched assets verify technical facets as UNKNOWN (correct, explicit).
- No pixel-level composition checks (framing/subject) without a VLM.

Gate: PASS → continue to Phase 22.
