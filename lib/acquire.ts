// Phase 23 — acquisition interface + validator. NO downloads happen here.
//
// Flow: requirement -> local search (done, Phases 20-21) -> no acceptable
// candidate -> AcquisitionRequest. This module produces a VALIDATED queue
// line (compatible with _scripts/download_queue.ps1 `url|dest|cat` format)
// for an explicitly approved source, or a terminal NO_APPROVED_SOURCE
// state. Execution stays external/operator-driven. Nothing is fetched.
//
// Validation quarantines untrusted files: only VALIDATED items may be
// appended to the registry, and the file itself stays in quarantine until
// an operator promotes it (out of scope).
import { existsSync, statSync, appendFileSync, readFileSync, mkdirSync } from 'fs';
import { join, normalize, resolve, sep } from 'path';
import { createHash } from 'crypto';
import { arsenalRoot } from './config';
import { normalizeAssetType } from './assetIdentity';

export interface AcquisitionSource {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  license_default: string;
  attribution_default: string;
  approved: boolean;
  notes: string;
}

export interface AcquisitionRequest {
  requirement_id: string;
  intent: string;
  asset_type: string;
  specs?: Record<string, string | number>;
  source_id?: string;
  url?: string;
  filename?: string;
}

export type AcquisitionOutcome =
  | { status: 'NO_APPROVED_SOURCE'; requirement_id: string; detail: string }
  | { status: 'SOURCE_NOT_APPROVED'; requirement_id: string; source_id: string }
  | {
      status: 'QUEUED_FOR_OPERATOR';
      requirement_id: string;
      source_id: string;
      queue_line: string;
      dest_rel: string;
      license: string;
      attribution: string;
    };

export type ValidationVerdict =
  | { status: 'VALIDATED'; record: Record<string, string | number | boolean> }
  | { status: 'REJECTED'; reasons: string[] };

const SOURCES_FILE = 'acquisition-sources.json';

function sourcesPath(): string {
  return join(arsenalRoot(), '_projects', 'arsenal-x', 'data', 'acquire', SOURCES_FILE);
}

export function quarantineDir(): string {
  return join(arsenalRoot(), '_projects', 'arsenal-x', 'data', 'acquire', 'quarantine');
}

export function registryPath(): string {
  return join(arsenalRoot(), '_projects', 'arsenal-x', 'data', 'acquire', 'registry.jsonl');
}

/** Explicitly configured sources only. Absent file = none approved. */
export function listSources(): AcquisitionSource[] {
  try {
    const raw = readFileSync(sourcesPath(), 'utf8');
    const arr = JSON.parse(raw) as AcquisitionSource[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function approvedSource(id: string): AcquisitionSource | null {
  const s = listSources().find((x) => x.id === id);
  return s && s.approved ? s : null;
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'asset.bin';
  if (!base || base === '.' || base === '..') throw new Error('unsafe filename');
  if (/[<>:"|?*\x00-\x1f]/.test(base)) throw new Error('unsafe filename characters');
  return base;
}

/** Build the operator queue line. Never fetches anything. */
export function requestAcquisition(req: AcquisitionRequest): AcquisitionOutcome {
  if (!req.source_id || !req.url) {
    return {
      status: 'NO_APPROVED_SOURCE',
      requirement_id: req.requirement_id,
      detail: 'No approved acquisition source: configure one explicitly before requesting.',
    };
  }
  const src = approvedSource(req.source_id);
  if (!src) {
    return { status: 'SOURCE_NOT_APPROVED', requirement_id: req.requirement_id, source_id: req.source_id };
  }
  if (!/^https:\/\//.test(req.url)) {
    // Plain Error (not terminal state): malformed operator input fails loudly.
    throw new Error('acquisition URL must be https');
  }
  const filename = safeFilename(req.filename || req.url.split('?')[0].split('/').pop() || 'asset.bin');
  const dest_rel = `quarantine/${src.id}/${filename}`;
  const queue_line = `${req.url}|${dest_rel}|${src.id}`;
  return {
    status: 'QUEUED_FOR_OPERATOR',
    requirement_id: req.requirement_id,
    source_id: src.id,
    queue_line,
    dest_rel,
    license: src.license_default,
    attribution: src.attribution_default,
  };
}

function sha256Sync(absPath: string): string {
  const h = createHash('sha256');
  const data = readFileSync(absPath);
  h.update(data);
  return h.digest('hex');
}

/** Validate a quarantined file. Appends to registry ONLY on VALIDATED. */
export function validateAcquisition(params: {
  quarantine_rel: string;
  expected_sha256?: string;
  expected_bytes?: number;
  requirement_id?: string;
  source_id?: string;
}): ValidationVerdict {
  const reasons: string[] = [];
  const qdir = resolve(quarantineDir());
  const abs = resolve(qdir, params.quarantine_rel);
  if (!abs.startsWith(qdir + sep) && abs !== qdir) {
    return { status: 'REJECTED', reasons: ['quarantine escape: path outside quarantine dir'] };
  }
  if (!existsSync(abs)) return { status: 'REJECTED', reasons: ['file absent in quarantine'] };
  let st;
  try {
    st = statSync(abs);
  } catch {
    return { status: 'REJECTED', reasons: ['file unreadable'] };
  }
  if (!st.isFile()) return { status: 'REJECTED', reasons: ['not a regular file'] };
  if (st.size === 0) reasons.push('zero-byte file');
  if (params.expected_bytes !== undefined && st.size !== params.expected_bytes) {
    reasons.push(`size mismatch: got ${st.size}, expected ${params.expected_bytes}`);
  }
  const ext = abs.split('.').pop()?.toLowerCase() || '';
  const atype = normalizeAssetType(ext, abs);
  if (atype === 'unknown') reasons.push(`unrecognized type for .${ext}`);
  let sha = '';
  try {
    sha = sha256Sync(abs);
  } catch {
    reasons.push('hash unreadable');
  }
  if (params.expected_sha256 && sha && params.expected_sha256 !== sha) {
    reasons.push('sha256 mismatch');
  }
  if (reasons.length) return { status: 'REJECTED', reasons };
  const record = {
    quarantine_rel: params.quarantine_rel,
    sha256: sha,
    bytes: st.size,
    asset_type: atype,
    requirement_id: params.requirement_id || '',
    source_id: params.source_id || '',
    validated_at: new Date().toISOString(),
    provenance_status: 'QUARANTINED_PENDING_OPERATOR_PROMOTION',
  };
  mkdirSync(join(arsenalRoot(), '_projects', 'arsenal-x', 'data', 'acquire'), { recursive: true });
  appendFileSync(registryPath(), JSON.stringify(record) + '\n', 'utf8');
  return { status: 'VALIDATED', record };
}
