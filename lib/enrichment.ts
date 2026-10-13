// Phase 19 — enrichment record reader + EnrichAsset contract implementation.
//
// Reads the deterministic records produced by tools/enrich.py (Python).
// Semantic status is PARTIAL at best: records carry MEASURED descriptors
// only. Nothing here invents subjects, moods, or scenes. A future analyzer
// fills SemanticEnrichment via the `enrichAsset` contract from
// lib/assetIdentity.ts without touching this module.
import { existsSync, readFileSync } from 'fs';
import { join, sep } from 'path';
import { arsenalRoot } from './config';
import type {
  AssetIdentity,
  EnrichAsset,
  SemanticEnrichment,
} from './assetIdentity';

export interface FrameEvidence {
  frac: number;
  t: number;
  thumb: string;
  brightness: number;
  saturation: number;
  edge_density: number;
  sharpness: number;
  mean_rgb: [number, number, number];
  palette: string[];
  dark: boolean;
  bright: boolean;
  blue_dominant: boolean;
  warm: boolean;
  dhash: string;
  delta_prev?: number;
}

export interface EnrichmentRecord {
  relPath: string;
  status: 'ok' | 'failed';
  analyzer: string;
  fingerprint: string;
  enrichment_id: string;
  size: number;
  kind?: 'video' | 'image' | 'audio';
  technical?: Record<string, string | number | boolean | null>;
  frames?: FrameEvidence[];
  aggregate?: Record<string, number | boolean | null>;
  descriptors?: Record<string, number | boolean>;
  labels?: string[];
  thumb?: string;
  semantic_status: 'PARTIAL' | 'UNKNOWN';
  semantic_labels: string[];
  error?: string;
}

function recordsPath(): string {
  return join(
    arsenalRoot(),
    '_projects',
    'arsenal-x',
    'data',
    'enrichment',
    'records.jsonl'
  );
}

let cache: Map<string, EnrichmentRecord> | null = null;

function loadAll(): Map<string, EnrichmentRecord> {
  if (cache) return cache;
  cache = new Map();
  const p = recordsPath();
  if (!existsSync(p)) return cache;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as EnrichmentRecord;
      if (r.relPath) cache.set(r.relPath, r);
    } catch { /* skip corrupt lines, never crash the index */ }
  }
  return cache;
}

export function clearEnrichmentCache(): void {
  cache = null;
}

/** Latest record for a warehouse-relative path, or null.
 * Separators are normalized: the search index uses `/` while enrichment
 * records store the OS-native form. */
export function enrichmentFor(relPath: string): EnrichmentRecord | null {
  const map = loadAll();
  const direct = map.get(relPath);
  if (direct) return direct;
  const alt = relPath.replace(/\//g, sep).replace(/\\/g, sep);
  for (const [k, v] of map) {
    if (k.replace(/\//g, sep).replace(/\\/g, sep) === alt) return v;
  }
  return null;
}

export function enrichmentCount(): { ok: number; failed: number } {
  let ok = 0;
  let failed = 0;
  for (const r of loadAll().values()) {
    if (r.status === 'ok') ok++;
    else failed++;
  }
  return { ok, failed };
}

/** Phase-18 contract, implemented honestly: attaches measured evidence,
 * keeps semantic_status PARTIAL, fills no semantic labels. */
export const enrichAsset: EnrichAsset = async (
  identity: AssetIdentity
): Promise<SemanticEnrichment> => {
  const rel = identity.original_path.includes(arsenalRoot())
    ? identity.original_path.slice(arsenalRoot().length).replace(/^[/\\]+/, '')
    : identity.original_filename;
  const rec = enrichmentFor(rel.replace(/\//g, '\\'));
  const evidence: Record<string, string> = {};
  if (rec && rec.status === 'ok') {
    if (rec.kind === 'video' && rec.aggregate) {
      for (const [k, v] of Object.entries(rec.aggregate)) {
        evidence[`measured.${k}`] = String(v);
      }
      evidence['measured.frames'] = String(rec.frames?.length || 0);
    }
    if (rec.kind === 'image' && rec.descriptors) {
      for (const [k, v] of Object.entries(rec.descriptors)) {
        evidence[`measured.${k}`] = String(v);
      }
    }
    if (rec.kind === 'audio' && rec.descriptors) {
      for (const [k, v] of Object.entries(rec.descriptors)) {
        evidence[`measured.${k}`] = String(v);
      }
      evidence['measured.labels'] = (rec.labels || []).join(',');
    }
  }
  return {
    description: '',
    tags: [],
    subjects: [],
    environments: [],
    actions: [],
    visual_attributes: evidence,
    audio_attributes: {},
    embedding_ref: '',
    analyzer: rec?.analyzer || 'none',
    analyzed_at: '',
    confidence: 0,
  };
};
