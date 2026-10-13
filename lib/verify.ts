// Phase 21 — visual verification engine.
//
// Verifies ONE candidate against a concrete requirement. Verdicts:
// PASS (all hard checks pass, evidence supports requirements),
// CAUTION (evaluated, caveats: unknown provenance or unverified semantics),
// REJECT (concrete failure: missing file, technical mismatch, or
// unresolved REVIEW_REQUIRED provenance), UNKNOWN (cannot evaluate: media
// metadata missing). Uncertainty is never collapsed into PASS.
// Deterministic: no wall-clock, no randomness, sorted reasons.
import { enrichmentFor } from './enrichment';
import { normalizeAssetType, provenanceFor, riskFor } from './assetIdentity';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { arsenalRoot } from './config';

export type Verdict = 'PASS' | 'CAUTION' | 'REJECT' | 'UNKNOWN';
export type CheckResult = 'pass' | 'caution' | 'reject' | 'unknown';

export interface VerificationCheck {
  name: string;
  result: CheckResult;
  detail: string;
}

export interface Verification {
  verdict: Verdict;
  checks: VerificationCheck[];
  reasons: string[];
}

export interface VerifyInput {
  relPath: string;
  asset_type?: string;
  duration_min?: number;
  duration_max?: number;
  aspect_ratio?: string;
  resolution_min?: string;
  semantic_requirements?: string[];
  allow_unknown_provenance?: boolean;
}

export interface VerifyContext {
  enrichByPath: (relPath: string) => {
    status: string;
    technical?: { duration?: number; width?: number; height?: number };
    frames?: Array<Record<string, unknown>>;
    aggregate?: Record<string, unknown>;
  } | null;
  fileExists: (relPath: string) => boolean;
}

function aspectOf(w: number, h: number): string {
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.08) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.08) return '9:16';
  if (Math.abs(r - 1) < 0.05) return '1:1';
  return 'other';
}

function evSupports(
  token: string,
  rec: { frames?: Array<Record<string, unknown>>; aggregate?: Record<string, unknown> } | null
): string | null {
  if (!rec) return null;
  const frames = rec.frames || [];
  const agg = rec.aggregate || {};
  const n = (k: string) => frames.filter((f) => f[k] === true).length;
  if ((token === 'dark' || token === 'night') && n('dark') > 0) {
    return `measured.dark_frames=${n('dark')}/${frames.length}`;
  }
  if ((token === 'blue') && n('blue_dominant') > 0) {
    return `measured.blue_dominant_frames=${n('blue_dominant')}/${frames.length}`;
  }
  if ((token === 'static' || token === 'still') && agg['static'] === true) {
    return 'measured.static=true';
  }
  return null;
}

export function verifyCandidate(input: VerifyInput, ctx: VerifyContext): Verification {
  const checks: VerificationCheck[] = [];
  if (!ctx.fileExists(input.relPath)) {
    checks.push({ name: 'file_present', result: 'reject', detail: 'file missing on disk' });
    return { verdict: 'REJECT', checks, reasons: ['REJECT: missing file'] };
  }
  checks.push({ name: 'file_present', result: 'pass', detail: 'file present' });
  if (input.asset_type && input.asset_type !== 'any') {
    const ext = (input.relPath.split('.').pop() || '').toLowerCase();
    const actual = normalizeAssetType(ext, input.relPath);
    const family: Record<string, string[]> = {
      video: ['video'], image: ['image'], music: ['music'],
      sfx: ['sfx', 'audio'], audio: ['audio', 'music', 'sfx'],
      font: ['font'], icon: ['icon'], model3d: ['model3d'],
    };
    const ok = (family[input.asset_type] || [input.asset_type]).includes(actual);
    checks.push({
      name: 'asset_type', result: ok ? 'pass' : 'reject',
      detail: ok ? `type ${actual}` : `type ${actual}, required ${input.asset_type}`,
    });
  }
  const rec = ctx.enrichByPath(input.relPath);
  const tech = rec?.technical || {};
  if (input.duration_min !== undefined) {
    if (tech.duration === undefined) {
      checks.push({ name: 'duration', result: 'unknown', detail: 'duration unmeasured (not enriched)' });
    } else {
      const ok = tech.duration >= (input.duration_min as number) &&
        tech.duration <= (input.duration_max as number);
      checks.push({
        name: 'duration', result: ok ? 'pass' : 'reject',
        detail: ok ? `duration ${tech.duration}s in range`
          : `duration ${tech.duration}s outside [${input.duration_min}, ${input.duration_max}]`,
      });
    }
  }
  if (input.aspect_ratio) {
    if (tech.width === undefined || tech.height === undefined) {
      checks.push({ name: 'aspect_ratio', result: 'unknown', detail: 'dimensions unmeasured (not enriched)' });
    } else {
      const ar = aspectOf(tech.width as number, tech.height as number);
      const ok = ar === input.aspect_ratio;
      checks.push({
        name: 'aspect_ratio', result: ok ? 'pass' : 'reject',
        detail: ok ? `aspect ${ar}` : `aspect ${ar}, required ${input.aspect_ratio}`,
      });
    }
  }
  if (input.resolution_min) {
    if (tech.width === undefined) {
      checks.push({ name: 'resolution', result: 'unknown', detail: 'dimensions unmeasured (not enriched)' });
    } else {
      const [mw] = (input.resolution_min as string).split('x').map(Number);
      const ok = (tech.width as number) >= mw;
      checks.push({
        name: 'resolution', result: ok ? 'pass' : 'reject',
        detail: ok ? `width ${tech.width} >= ${mw}` : `width ${tech.width} < ${mw}`,
      });
    }
  }
  for (const tok of input.semantic_requirements || []) {
    const ev = evSupports(tok, rec);
    checks.push({
      name: `semantic:${tok}`, result: ev ? 'pass' : 'unknown',
      detail: ev || 'no measured evidence (semantic unverified)',
    });
  }
  const risk = riskFor(input.relPath);
  const prov = provenanceFor(input.relPath);
  if (risk.level === 'REVIEW_REQUIRED') {
    checks.push({ name: 'provenance', result: 'reject', detail: `REVIEW_REQUIRED: ${risk.reason}` });
  } else if (prov.provenance_status === 'KNOWN') {
    checks.push({ name: 'provenance', result: 'pass', detail: `KNOWN (${prov.license_name})` });
  } else if (input.allow_unknown_provenance === false) {
    checks.push({ name: 'provenance', result: 'reject', detail: 'UNKNOWN provenance not allowed by requirement' });
  } else {
    checks.push({ name: 'provenance', result: 'caution', detail: 'provenance UNKNOWN' });
  }
  const r = (n: string) => checks.filter((c) => c.result === n).length;
  let verdict: Verdict = 'PASS';
  if (r('reject') > 0) verdict = 'REJECT';
  else if (r('unknown') > 0 && checks.some((c) => c.result === 'unknown' && c.name !== 'provenance' &&
    (c.name === 'duration' || c.name === 'aspect_ratio' || c.name === 'resolution'))) {
    verdict = 'UNKNOWN';
  } else if (r('unknown') > 0 || r('caution') > 0) verdict = 'CAUTION';
  const reasons = checks
    .filter((c) => c.result !== 'pass')
    .map((c) => `${c.result.toUpperCase()}: ${c.name} — ${c.detail}`)
    .sort();
  return { verdict, checks, reasons };
}

export function liveVerifyContext(): VerifyContext {
  const root = arsenalRoot();
  return {
    enrichByPath: (relPath: string) => {
      const rec = enrichmentFor(relPath);
      if (!rec) return null;
      return {
        status: rec.status,
        technical: (rec.technical || {}) as { duration?: number; width?: number; height?: number },
        frames: ((rec.frames || []) as unknown) as Array<Record<string, unknown>>,
        aggregate: (rec.aggregate || {}) as Record<string, unknown>,
      };
    },
    fileExists: (relPath: string) => {
      try {
        return existsSync(join(root, relPath));
      } catch {
        return false;
      }
    },
  };
}

/** File-size probe without hashing (identity layer owns hashes). */
export function fileSizeOf(relPath: string): number | null {
  try {
    return statSync(join(arsenalRoot(), relPath)).size;
  } catch {
    return null;
  }
}
