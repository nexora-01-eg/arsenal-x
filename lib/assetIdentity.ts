// Phase 18 — canonical asset identity, provenance, and semantic-status
// foundation. ADDITIVE: extends XCodeItem concepts without changing them.
// No filesystem access at import time. No network. Deterministic.
//
// Core rule: the original filesystem identity and the logical asset
// identity are separate concepts. Original files are never touched;
// identity travels by hash + stable codes, never by renaming.
import { createHash, type Hash } from 'crypto';
import { createReadStream, statSync } from 'fs';

export type AssetType =
  | 'video' | 'image' | 'audio' | 'music' | 'sfx' | 'font' | 'icon'
  | 'lut' | 'model3d' | 'model' | 'template' | 'document' | 'archive'
  | 'motion' | 'unknown';

export type ProvenanceStatus = 'KNOWN' | 'UNKNOWN' | 'REVIEW_REQUIRED';
export type SemanticStatus = 'UNKNOWN' | 'PARTIAL' | 'ENRICHED';
export type Sensitivity = 'standard' | 'sensitive';

export interface Provenance {
  source_name: string;
  source_type: string;
  source_url: string;
  license_name: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  provenance_status: ProvenanceStatus;
  provenance_notes: string;
  acquisition_method: string;
}

export interface AssetIdentity {
  /** Stable logical id (existing X-Code when known, else derived). */
  asset_id: string;
  original_path: string;
  original_filename: string;
  extension: string;
  asset_type: AssetType;
  size_bytes: number;
  sha256: string;
  modified_time: string;
  source: string;
  license: string;
  license_url: string;
  attribution_required: boolean;
  provenance_status: ProvenanceStatus;
  duplicate_group_id: string;
  technical_metadata: Record<string, string | number | boolean>;
  semantic_status: SemanticStatus;
  index_status: string;
  sensitivity: Sensitivity;
}

/** Extension-first asset-type normalization. Folder hints are supporting
 * evidence only; anything unrecognized stays 'unknown'. */
const EXT_TYPE: Record<string, AssetType> = {
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  m4v: 'video', mpg: 'video', mpeg: 'video',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  bmp: 'image', avif: 'image', psd: 'image', eps: 'image', ai: 'image',
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', m4a: 'audio',
  aac: 'audio', aiff: 'audio', aif: 'audio',
  ttf: 'font', otf: 'font', woff: 'font', woff2: 'font', eot: 'font',
  svg: 'icon', ico: 'icon',
  cube: 'lut',
  glb: 'model3d', gltf: 'model3d', fbx: 'model3d', obj: 'model3d',
  blend: 'model3d', dae: 'model3d', usdc: 'model3d', tres: 'model3d',
  hdr: 'model3d', exr: 'model3d',
  onnx: 'model', bin: 'model',
  html: 'template', htm: 'template',
  md: 'document', mdx: 'document', txt: 'document', pdf: 'document',
  zip: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive',
  lottie: 'motion', json: 'unknown',
};

const FOLDER_HINTS: Array<[RegExp, AssetType]> = [
  [/incompetech|موسيقى|04-music/i, 'music'],
  [/sfx|مؤثرات صوتية|transitions-pack/i, 'sfx'],
  // NOTE: SFX zips contain .wav — folder hint disambiguates from music.
];

export function normalizeAssetType(ext: string, relPath = ''): AssetType {
  const e = ext.toLowerCase().replace(/^\./, '');
  // Folder evidence first for audio (music vs sfx share extensions).
  if (e === 'mp3' || e === 'wav' || e === 'ogg' || e === 'flac') {
    for (const [re, t] of FOLDER_HINTS) {
      if (re.test(relPath)) return t;
    }
    return 'audio';
  }
  return EXT_TYPE[e] || 'unknown';
}

/** Deterministic SHA-256 over file bytes (streamed, works for GB files). */
export function sha256File(absPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let h: Hash;
    try {
      h = createHash('sha256');
    } catch (e) {
      reject(e);
      return;
    }
    const s = createReadStream(absPath);
    s.on('data', (d) => h.update(d));
    s.on('error', reject);
    s.on('end', () => {
      try {
        resolve(h.digest('hex'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/** Logical duplicate group = content hash. Same bytes => same group. */
export function duplicateGroupId(sha256Hex: string): string {
  return `dup-sha256-${sha256Hex.slice(0, 16)}`;
}

const UNKNOWN_PROVENANCE: Provenance = {
  source_name: 'UNKNOWN',
  source_type: '',
  source_url: '',
  license_name: 'UNKNOWN',
  license_url: '',
  attribution_required: false,
  attribution_text: '',
  provenance_status: 'UNKNOWN',
  provenance_notes: 'No provenance evidence on record. Do NOT treat as safe.',
  acquisition_method: 'UNKNOWN',
};

interface KnownSource {
  match: RegExp;
  provenance: Provenance;
}

// Evidence-backed sources only. Everything else stays UNKNOWN.
const KNOWN_SOURCES: KnownSource[] = [
  {
    match: /incompetech/i,
    provenance: {
      source_name: 'Incompetech (Kevin MacLeod)',
      source_type: 'music-library',
      source_url: 'https://incompetech.com',
      license_name: 'CC-BY (attribution required; verify per track)',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      attribution_required: true,
      attribution_text: 'Music: Kevin MacLeod (incompetech.com)',
      provenance_status: 'KNOWN',
      provenance_notes: 'LICENSE.txt present in 04_Music. Per-track verification still required.',
      acquisition_method: 'bulk-download',
    },
  },
  {
    match: /sonniss|gdc-?20/i,
    provenance: {
      source_name: 'Sonniss GDC Audio Bundle',
      source_type: 'sfx-bundle',
      source_url: 'https://sonniss.com/gameaudiogdc',
      license_name: 'Sonniss GDC bundle terms (verify bundle year)',
      license_url: '',
      attribution_required: false,
      attribution_text: '',
      provenance_status: 'KNOWN',
      provenance_notes: 'License manifests (pdf/txt/xlsx) ship inside the bundles. Game-audio use; verify terms before broadcast.',
      acquisition_method: 'bulk-download',
    },
  },
  {
    match: /google[\\/]fonts|fonts[\\/]ofl/i,
    provenance: {
      source_name: 'Google Fonts',
      source_type: 'font-library',
      source_url: 'https://github.com/google/fonts',
      license_name: 'OFL (verify per family via METADATA.pb)',
      license_url: 'https://openfontlicense.org',
      attribution_required: false,
      attribution_text: '',
      provenance_status: 'KNOWN',
      provenance_notes: 'METADATA.pb sidecars exist for OFL families under 01_Fonts/Google.',
      acquisition_method: 'bulk-download',
    },
  },
  {
    match: /nasa/i,
    provenance: {
      source_name: 'NASA',
      source_type: 'space-agency-media',
      source_url: 'https://www.nasa.gov',
      license_name: 'UNKNOWN (verify per item; most NASA media is public domain but not confirmed per file)',
      license_url: '',
      attribution_required: false,
      attribution_text: '',
      provenance_status: 'REVIEW_REQUIRED',
      provenance_notes: 'Filenames suggest NASA origin; per-file public-domain status NOT verified.',
      acquisition_method: 'bulk-download',
    },
  },
];

export function provenanceFor(relPath: string): Provenance {
  for (const k of KNOWN_SOURCES) {
    if (k.match.test(relPath)) return { ...k.provenance };
  }
  return { ...UNKNOWN_PROVENANCE };
}

// ---- risk / review flags (additive; reuses no existing mechanism because
// none exists — quality.ts scores quality, not risk) ----

export interface RiskFlag {
  level: 'REVIEW_REQUIRED' | 'OK';
  reason: string;
}

// Audit 2026-09-19 evidence: these music files contain baked YouTube
// outro speech ("thank you for watching… subscribe") — provenance
// contaminated. Paths are audit evidence, not guesses.
const REVIEW_PATH_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /04_Music[\\/]Incompetech[\\/](Revival|Suave Standpipe|Dreamy Flashback)\.mp3$/i,
    reason: 'Whisper probe 2026-09-19 detected baked YouTube outro speech; provenance contaminated.',
  },
];

export function riskFor(relPath: string): RiskFlag {
  for (const r of REVIEW_PATH_PATTERNS) {
    if (r.re.test(relPath)) return { level: 'REVIEW_REQUIRED', reason: r.reason };
  }
  return { level: 'OK', reason: '' };
}

// ---- sensitivity (mechanism + documented seed; no personal data stored) ----

// Audit 2026-09-19: one Arabic official-certificate scan with visible
// personal data exists under MH images. It must never be served as a
// generic stock image. The list pattern below is the mechanism; entries
// reference audit evidence only.
const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /MH - محتوى بصري[\\/]01-صور[\\/].*certificate.*\.jpe?g$/i,
];

export function sensitivityFor(relPath: string): Sensitivity {
  // Exact known item (audit evidence 2026-09-19: Arabic certificate scan).
  // Kept as an explicit entry so future moves force re-review.
  if (/MH - محتوى بصري[\\/]01-صور[\\/]736x1040 light-gray-vertical-photo-8\.jpg$/i.test(relPath)) {
    return 'sensitive';
  }
  for (const re of SENSITIVE_PATH_PATTERNS) {
    if (re.test(relPath)) return 'sensitive';
  }
  return 'standard';
}

/** Build a full identity record. Hash is computed on demand (async). */
export async function identifyAsset(params: {
  absPath: string;
  relPath: string;
  assetId?: string;
  source?: string;
}): Promise<AssetIdentity> {
  const st = statSync(params.absPath);
  const name = params.absPath.split(/[/\\]/).pop() || '';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  const sha = await sha256File(params.absPath);
  const prov = provenanceFor(params.relPath);
  const risk = riskFor(params.relPath);
  return {
    asset_id: params.assetId || '',
    original_path: params.absPath,
    original_filename: name,
    extension: ext,
    asset_type: normalizeAssetType(ext, params.relPath),
    size_bytes: st.size,
    sha256: sha,
    modified_time: new Date(st.mtimeMs).toISOString(),
    source: params.source || '',
    license: prov.license_name,
    license_url: prov.license_url,
    attribution_required: prov.attribution_required,
    provenance_status: risk.level === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : prov.provenance_status,
    duplicate_group_id: duplicateGroupId(sha),
    technical_metadata: { size_bytes: st.size },
    semantic_status: 'UNKNOWN',
    index_status: 'identified',
    sensitivity: sensitivityFor(params.relPath),
  };
}

// ---- future semantic-enrichment interface (contract only) ----

export interface SemanticEnrichment {
  description: string;
  tags: string[];
  subjects: string[];
  environments: string[];
  actions: string[];
  visual_attributes: Record<string, string>;
  audio_attributes: Record<string, string>;
  embedding_ref: string;
  analyzer: string;
  analyzed_at: string;
  confidence: number;
}

/** Enrichment entry point contract. Phase 18 provides the shape only;
 * a future analyzer implements `enrichAsset` without touching Arsenal-X. */
export type EnrichAsset = (
  identity: AssetIdentity
) => Promise<SemanticEnrichment>;

// ---- future visual-lens search contract (types only) ----

export interface AssetSearchRequest {
  intent: string;
  asset_type: AssetType | 'any';
  duration_min?: number;
  duration_max?: number;
  aspect_ratio?: string;
  resolution_min?: string;
  semantic_requirements?: string[];
  technical_requirements?: Record<string, string | number>;
  provenance_requirements?: { allow_unknown?: boolean; require_attribution_ok?: boolean };
}

export interface AssetCandidate {
  asset_id: string;
  path: string;
  score: number;
  match_reasons: string[];
  technical_match: Record<string, boolean>;
  semantic_status: SemanticStatus;
  provenance_status: ProvenanceStatus;
  warnings: string[];
}
