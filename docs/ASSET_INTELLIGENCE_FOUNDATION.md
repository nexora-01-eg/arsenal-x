# ASSET_INTELLIGENCE_FOUNDATION.md — Phase 18 (2026-09-19)

How Arsenal-X becomes the canonical Asset Intelligence foundation for
Al-Montier without being rewritten. Implementation surface:
`lib/assetIdentity.ts` (additive) + existing search/index machinery.

## 1. Canonical asset identity

```ts
AssetIdentity {
  asset_id, original_path, original_filename, extension, asset_type,
  size_bytes, sha256, modified_time, source, license, license_url,
  attribution_required, provenance_status, duplicate_group_id,
  technical_metadata, semantic_status, index_status, sensitivity
}
```

Rules: original files untouched; identity by content hash, never by rename;
`asset_id` = existing X-Code when the item comes from the index, else
caller-assigned. `duplicate_group_id = dup-sha256-<16>` — byte-identical
files share it (verified: 60/60 quarantine pairs). Deletion/quarantine is
out of scope: identity answers uniqueness, never prescribes cleanup.

## 2. Asset-type normalization

`normalizeAssetType(ext, relPath?)`: extension tables reused from the
indexer's own EXT lists; folder evidence disambiguates music vs sfx
(Incompetech→music, SFX packs→sfx, else generic audio). 14 classes:
video/image/audio/music/sfx/font/icon/lut/model3d/model/template/document/
archive/motion/unknown. Unknown is terminal, never guessed.

## 3. Technical vs semantic (hard split)

Technical is deterministic and may be complete (size, hash, ext, dates,
probed duration/dims/codecs from the audit's `video/audio_meta.jsonl`
shape). Semantic (`description/tags/subjects/environments/actions/
visual_attributes/audio_attributes/embedding_ref`) defaults to
`semantic_status: 'UNKNOWN'` and is populated only by a future analyzer
implementing `EnrichAsset = (identity) => Promise<SemanticEnrichment>`.
No fake semantics, ever.

## 4. Provenance foundation

`provenanceFor(relPath)` — evidence-backed table only:
Incompetech (CC-BY, attribution required, LICENSE.txt on disk), Sonniss
GDC bundles (terms manifests inside zips), Google Fonts (OFL via
METADATA.pb), NASA (REVIEW_REQUIRED — filenames suggest origin, per-file
status unverified). Everything else `UNKNOWN` with an explicit do-not-trust
note. Risk flags: `riskFor()` marks the 3 outro-contaminated tracks
`REVIEW_REQUIRED` (whisper evidence 2026-09-19). Sensitivity:
`sensitivityFor()` mechanism + seeded personal-data entry (`sensitive`
never served as generic stock — enforcement is a future serving rule).

## 5. Search evolution (evidence ranking preserved)

Existing scorer (code > name > ext > tags > source > path) is kept as the
filename/path-evidence layer. Future ranking adds, in order: (1) semantic
evidence, (2) visual evidence, (3) technical compatibility, (4) provenance,
(5) quality.ts score, (6) filename/path hints. No layer is removed.

## 6. Visual-lens contract (for the future editor)

```ts
AssetSearchRequest { intent, asset_type, duration_min/max, aspect_ratio,
  resolution_min, semantic_requirements[], technical_requirements{},
  provenance_requirements{ allow_unknown?, require_attribution_ok? } }
AssetCandidate { asset_id, path, score, match_reasons[], technical_match{},
  semantic_status, provenance_status, warnings[] }
```

Flow: intent → technical facet filter (deterministic, works today over
audit metadata) → semantic match (future) → visual verification (future)
→ license check (provenance layer, works today) → match card with evidence
+ rejections. Types live in `lib/assetIdentity.ts`; no runtime yet.

## 7. Integration boundaries (documented, not implemented)

- **Al-Montier editor** → HTTP: `/api/search`, `/api/resolve?code=`,
  `/api/file?path=` (+ future `/api/discover` intent + identity endpoint).
  Contract: X-Code in, evidence-backed candidates out.
- **n8n (future)** → `/api/reindex` (POST) as the reindex trigger +
  filesystem watch on the warehouse; events out (future).
- **Model collection system (future)** → `/api/tools` model inventory
  (name/dir/size/presence) as the discovery surface; runtimes stay external.
- **Multi-agent (future)** → same HTTP read surface with codes as the
  shared reference language; no agent protocol in Phase 18.
- **Acquisition (future)** → `_scripts/download_queue.ps1` pattern +
  `_logs/manifest.tsv` provenance log as the backend seed; needs approved
  sources, validation, and per-item licensing before use.

## 8. What Phase 18 deliberately did NOT build

VLM/embeddings, vector store, second database, perceptual-hash index,
preview pipeline, acquisition automation, license registry DB, editing or
rendering integration, n8n/agents/model-system wiring. Each is listed above
with its seam. Next-phase entry point: implement `EnrichAsset` for one
modality (video frames) and persist `SemanticEnrichment` beside X-Codes.
