// Phase 20 — evidence-based asset matching.
//
// AssetSearchRequest -> AssetCandidate[]. Combines, in order:
// semantic evidence (measured only) < technical compatibility < provenance <
// quality < filename hints. Filename matching is deliberately the weakest
// signal. No evidence is ever invented: unmet requirements are listed, not
// hidden. Ranking is fully deterministic (score desc, relPath asc).
import { allItems } from './arsenalSearch';
import { enrichmentFor } from './enrichment';
import { provenanceFor, riskFor } from './assetIdentity';
import type {
  AssetCandidate,
  AssetSearchRequest,
  AssetType,
} from './assetIdentity';

export interface MatchItem {
  relPath: string;
  name: string;
  size: number;
  ext: string;
  source: string;
  code?: string;
  slug?: string;
}

export interface TechMeta {
  duration?: number;
  width?: number;
  height?: number;
}

const STOP = new Set([
  'a', 'an', 'the', 'of', 'for', 'with', 'and', 'need', 'find', 'me',
  'shot', 'clip', 'video', 'image', 'photo', 'asset', 'suitable',
]);

export interface ParsedIntent {
  duration_min?: number;
  duration_max?: number;
  aspect_ratio?: string;
  resolution_min?: string;
  asset_type: AssetType | 'any';
  semantic_tokens: string[];
}

/** Deterministic intent parsing: numbers/facets out, content tokens kept. */
export function parseIntent(intent: string): ParsedIntent {
  const t = intent.toLowerCase();
  const out: ParsedIntent = { asset_type: 'any', semantic_tokens: [] };
  let m = t.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(s|sec|second|seconds)\b/);
  if (m) {
    out.duration_min = parseFloat(m[1]);
    out.duration_max = parseFloat(m[2]);
  } else if ((m = t.match(/(\d+(?:\.\d+)?)[\s-]*(s|sec|second|seconds)\b/))) {
    out.duration_min = Math.max(0, parseFloat(m[1]) - 1);
    out.duration_max = parseFloat(m[1]) + 1;
  }
  if (/(16\s*:\s*9|landscape|widescreen)/.test(t)) out.aspect_ratio = '16:9';
  else if (/(9\s*:\s*16|vertical|portrait|shorts|reel)/.test(t)) out.aspect_ratio = '9:16';
  else if (/(1\s*:\s*1|square)/.test(t)) out.aspect_ratio = '1:1';
  if (/\b4k\b|2160/.test(t)) out.resolution_min = '3840x2160';
  else if (/\b1080p?\b|1920/.test(t)) out.resolution_min = '1920x1080';
  else if (/\b720p?\b|1280/.test(t)) out.resolution_min = '1280x720';
  if (/\b(music|song|track|background music|score)\b/.test(t)) out.asset_type = 'music';
  else if (/\b(sfx|sound effect|whoosh|riser|impact|transition sound)\b/.test(t)) out.asset_type = 'sfx';
  else if (/\b(font|typeface|caption font)\b/.test(t)) out.asset_type = 'font';
  else if (/\b(icon|logo mark)\b/.test(t)) out.asset_type = 'icon';
  else if (/\b(image|picture|background|wallpaper|texture)\b/.test(t)) out.asset_type = 'image';
  else if (/\b(video|footage|clip|shot|b-roll|broll)\b/.test(t)) out.asset_type = 'video';
  const words = t.replace(/[^a-z0-9:\s-]/g, ' ').split(/\s+/).filter(Boolean);
  out.semantic_tokens = [...new Set(words.filter(
    (w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w)))].slice(0, 12);
  return out;
}

const NAMED_COLORS: Array<[string, [number, number, number]]> = [
  ['black', [0, 0, 0]], ['white', [255, 255, 255]],
  ['red', [200, 30, 30]], ['green', [30, 160, 60]], ['blue', [40, 80, 220]],
  ['gold', [212, 175, 55]], ['gray', [128, 128, 128]],
  ['orange', [230, 120, 20]], ['teal', [0, 150, 150]],
];

function paletteNames(palette: string[]): string[] {
  const out: string[] = [];
  for (const hex of palette) {
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) continue;
    const v: [number, number, number] = [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
    ];
    let best = '';
    let bestD = Infinity;
    for (const [name, c] of NAMED_COLORS) {
      const d = (v[0] - c[0]) ** 2 + (v[1] - c[1]) ** 2 + (v[2] - c[2]) ** 2;
      if (d < bestD) { bestD = d; best = name; }
    }
    if (bestD < 3 * 90 * 90 && !out.includes(best)) out.push(best);
  }
  return out;
}

// Measured-descriptor keyword evidence. Keys are the ONLY semantic claims
// the engine may make without a VLM.
function measuredEvidence(
  token: string,
  rec: {
    status?: string;
    frames?: Array<Record<string, unknown>>;
    aggregate?: Record<string, unknown>;
  } | null
): string[] {
  if (!rec || rec.status !== 'ok') return [];
  const ev: string[] = [];
  const frames = rec.frames || [];
  const agg = rec.aggregate || {};
  const has = (k: string) => frames.some((f) => f[k] === true);
  const countTrue = (k: string) => frames.filter((f) => f[k] === true).length;
  switch (token) {
    case 'dark':
    case 'night':
      if (countTrue('dark') > 0) ev.push(`measured.dark_frames=${countTrue('dark')}/${frames.length}`);
      break;
    case 'bright':
    case 'day':
      if (countTrue('bright') > 0) ev.push(`measured.bright_frames=${countTrue('bright')}/${frames.length}`);
      break;
    case 'blue':
      if (countTrue('blue_dominant') > 0) ev.push(`measured.blue_dominant_frames=${countTrue('blue_dominant')}/${frames.length}`);
      break;
    case 'warm':
      if (countTrue('warm') > 0) ev.push('measured.warm_frames>0');
      break;
    case 'static':
    case 'still':
      if (agg['static'] === true) ev.push('measured.static=true');
      break;
    case 'cinematic':
      if (typeof agg['brightness_med'] === 'number' && (agg['brightness_med'] as number) < 0.45) {
        ev.push(`measured.brightness_med=${agg['brightness_med']}`);
      }
      break;
    default: {
      const palettes = frames.flatMap((f) => (Array.isArray(f['palette']) ? (f['palette'] as string[]) : []));
      const names = paletteNames(palettes);
      if (names.includes(token)) ev.push(`measured.palette includes ${token}`);
      break;
    }
  }
  return ev;
}

function aspectOf(w?: number, h?: number): string {
  if (!w || !h) return 'unknown';
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.08) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.08) return '9:16';
  if (Math.abs(r - 1) < 0.05) return '1:1';
  return 'other';
}

export interface MatchContext {
  items: MatchItem[];
  enrichByPath: (relPath: string) => {
    status: string;
    technical?: TechMeta;
    frames?: Array<Record<string, unknown>>;
    aggregate?: Record<string, unknown>;
  } | null;
  limit?: number;
}

function slugForType(t: AssetType | 'any'): string[] {
  switch (t) {
    case 'video': return ['video'];
    case 'image': return ['images', 'backgrounds'];
    case 'music': return ['music'];
    case 'sfx': return ['sfx'];
    case 'font': return ['fonts'];
    case 'icon': return ['icons'];
    case 'lut': return ['luts'];
    case 'model3d': return ['models'];
    case 'template': return ['templates'];
    case 'document': return [];
    case 'archive': return ['archives'];
    case 'motion': return ['fx'];
    default: return ['video', 'images', 'backgrounds', 'music', 'sfx'];
  }
}

/** Core matcher. Pure + deterministic given the context. */
export function matchAssets(req: AssetSearchRequest, ctx: MatchContext): AssetCandidate[] {
  const parsed = parseIntent(req.intent);
  // Explicit request facets override parsed ones (endpoint merges both).
  const duration_min = req.duration_min ?? parsed.duration_min;
  const duration_max = req.duration_max ?? parsed.duration_max;
  const aspect_ratio = req.aspect_ratio ?? parsed.aspect_ratio;
  const resolution_min = req.resolution_min ?? parsed.resolution_min;
  const wantType = req.asset_type !== 'any' ? req.asset_type : parsed.asset_type;
  const slugs = new Set(slugForType(wantType));
  const pool = ctx.items.filter((it) => it.slug === undefined || slugs.has(it.slug));
  const out: AssetCandidate[] = [];
  for (const it of pool) {
    const rec = ctx.enrichByPath(it.relPath) as {
      status: string; technical?: TechMeta;
      frames?: Array<Record<string, unknown>>;
      aggregate?: Record<string, unknown>;
    } | null;
    const tech = rec?.technical || {};
    const reasons: string[] = [];
    const unmet: string[] = [];
    const technical_match: Record<string, boolean> = {};
    let score = 0;
    // technical facets (measured only; unknown never excludes)
    if (duration_min !== undefined && tech.duration !== undefined) {
      const ok = (tech.duration as number) >= duration_min &&
        (tech.duration as number) <= (duration_max as number);
      technical_match['duration'] = ok;
      if (ok) { score += 20; reasons.push(`duration ${(tech.duration as number).toFixed(1)}s in range`); }
      else unmet.push('duration');
    } else {
      technical_match['duration'] = false;
      if (duration_min !== undefined) unmet.push('duration(unknown)');
    }
    if (aspect_ratio && tech.width && tech.height) {
      const ar = aspectOf(tech.width as number, tech.height as number);
      const ok = ar === aspect_ratio;
      technical_match['aspect_ratio'] = ok;
      if (ok) { score += 15; reasons.push(`aspect_ratio ${ar}`); }
      else unmet.push('aspect_ratio');
    }
    if (resolution_min && tech.width && tech.height) {
      const [mw] = (resolution_min as string).split('x').map(Number);
      const ok = (tech.width as number) >= mw;
      technical_match['resolution'] = ok;
      if (ok) { score += 10; reasons.push(`resolution ${tech.width}x${tech.height}`); }
      else unmet.push('resolution');
    }
    technical_match['asset_type'] = true;
    score += 30;
    reasons.push(`asset_type ${wantType === 'any' ? 'any' : wantType}`);
    // semantic tokens: measured evidence first, filename hint last
    for (const tok of parsed.semantic_tokens) {
      const ev = measuredEvidence(tok, rec);
      if (ev.length) {
        score += 8 * ev.length;
        reasons.push(...ev);
      } else if (req.semantic_requirements && !req.semantic_requirements.includes(tok)) {
        // free tokens without requirement force: weak hint only
        const hay = `${it.name} ${it.relPath}`.toLowerCase();
        if (hay.includes(tok)) { score += 2; reasons.push(`filename hint: ${tok}`); }
        else unmet.push(tok);
      } else {
        unmet.push(tok);
      }
    }
    for (const tok of req.semantic_requirements || []) {
      if (parsed.semantic_tokens.includes(tok)) continue;
      const ev = measuredEvidence(tok, rec);
      if (ev.length) { score += 8 * ev.length; reasons.push(...ev); }
      else unmet.push(tok);
    }
    // provenance (evidence, never invented)
    const prov = provenanceFor(it.relPath);
    const risk = riskFor(it.relPath);
    const warnings: string[] = [];
    if (risk.level === 'REVIEW_REQUIRED') {
      score -= 20;
      warnings.push(`provenance REVIEW_REQUIRED: ${risk.reason}`);
    } else if (prov.provenance_status === 'KNOWN') {
      score += 5;
      reasons.push(`provenance KNOWN (${prov.license_name})`);
    } else {
      warnings.push('provenance UNKNOWN');
    }
    if (prov.attribution_required) warnings.push(`attribution required: ${prov.attribution_text}`);
    // deterministic quality crumbs (no wall-clock)
    if (it.size > 1048576) { score += 2; reasons.push('size>1MB'); }
    if (['mp4', 'webp', 'woff2', 'glb'].includes(it.ext)) { score += 1; reasons.push(`modern format ${it.ext}`); }
    out.push({
      asset_id: it.code || it.relPath,
      path: it.relPath,
      score,
      match_reasons: reasons,
      technical_match,
      semantic_status: rec && rec.status === 'ok' ? 'PARTIAL' : 'UNKNOWN',
      provenance_status: risk.level === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : prov.provenance_status,
      warnings: [...warnings, ...unmet.map((u) => `unmet: ${u}`)],
    });
  }
  out.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1));
  return out.slice(0, ctx.limit || 25);
}

/** Live context: real index + real enrichment corpus. */
export function liveContext(limit?: number): MatchContext {
  const items: MatchItem[] = [];
  for (const g of allItems()) {
    for (const it of g.items) {
      items.push({ ...it, slug: g.slug });
    }
  }
  return {
    items,
    enrichByPath: (relPath: string) => {
      const r = enrichmentFor(relPath);
      if (!r) return null;
      return {
        status: r.status,
        technical: (r.technical || {}) as TechMeta,
        frames: ((r.frames || []) as unknown) as Array<Record<string, unknown>>,
        aggregate: (r.aggregate || {}) as Record<string, unknown>,
      };
    },
    limit,
  };
}

/** Convenience: match against the live warehouse. */
export function matchLive(req: AssetSearchRequest, limit?: number): AssetCandidate[] {
  return matchAssets(req, liveContext(limit));
}
