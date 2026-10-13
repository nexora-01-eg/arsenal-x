// Phase 22 — asset requirement planner.
//
// Translates editorial intent into structured AssetSearchRequests.
// Deterministic and rule-based (no LLM, no network): keyword triggers +
// platform/style defaults. Every requirement cites its trigger, so the
// editor can trace each request back to the intent. Nothing is downloaded.
import type { AssetSearchRequest } from './assetIdentity';

export type RequirementKind =
  | 'BROLL' | 'BACKGROUND' | 'MUSIC' | 'SFX' | 'TRANSITION'
  | 'INTRO' | 'OUTRO' | 'CAPTION_FONT' | 'TITLE_GRAPHIC';

export interface AssetRequirement {
  id: string;
  kind: RequirementKind;
  label: string;
  source_intent: string;
  trigger: string;
  priority: 'primary' | 'supporting';
  request: AssetSearchRequest;
}

export interface PlanInput {
  intent: string;
  topic?: string;
  style?: string;
  platform?: string;
  target_duration_s?: number;
}

interface TopicPack {
  match: RegExp;
  name: string;
  brolls: Array<{ label: string; require: string[] }>;
}

const TOPIC_PACKS: TopicPack[] = [
  {
    match: /\b(ai|artificial intelligence|infrastructure|server|data center|datacenter|technology|tech|chip|cloud|network)\b/i,
    name: 'technology',
    brolls: [
      { label: 'futuristic server room', require: ['dark'] },
      { label: 'AI chip close-up', require: [] },
      { label: 'data-center corridor', require: [] },
      { label: 'subtle technology background', require: [] },
    ],
  },
  {
    match: /\b(finance|money|market|stock|trading|gold|bank|invest)\b/i,
    name: 'finance',
    brolls: [
      { label: 'stock market trading screens', require: [] },
      { label: 'gold bars macro', require: [] },
      { label: 'business handshake', require: [] },
    ],
  },
  {
    match: /\b(city|urban|skyline|downtown|street|traffic)\b/i,
    name: 'city',
    brolls: [
      { label: 'city aerial day', require: [] },
      { label: 'city night traffic', require: ['dark'] },
    ],
  },
  {
    match: /\b(space|nasa|earth|planet|star|galaxy|astronaut|iss)\b/i,
    name: 'space',
    brolls: [
      { label: 'earth from space', require: [] },
      { label: 'star field night sky', require: ['dark'] },
    ],
  },
  {
    match: /\b(business|office|meeting|team|corporate|startup|work)\b/i,
    name: 'business',
    brolls: [
      { label: 'modern office team', require: [] },
      { label: 'laptop close-up work', require: [] },
    ],
  },
];

const STYLE_MOOD: Array<[RegExp, string]> = [
  [/cinematic/i, 'cinematic'],
  [/corporate/i, 'corporate'],
  [/ambient|calm|relax/i, 'ambient'],
  [/energetic|dynamic|sport/i, 'energetic'],
  [/dark|dramatic/i, 'dark'],
];

const HAS_ARABIC = /[\u0600-\u06FF]/;

export function planRequirements(input: PlanInput): AssetRequirement[] {
  const text = `${input.intent} ${input.topic || ''} ${input.style || ''}`;
  const platform = (input.platform || 'youtube').toLowerCase();
  const vertical = /shorts|reel|tiktok|vertical|9:16/.test(platform);
  const ar = vertical ? '9:16' : '16:9';
  const styleLower = (input.style || '').toLowerCase();
  const darkStyle = /dark|cinematic|night/.test(styleLower) || /dark|night/.test(text.toLowerCase());
  const out: AssetRequirement[] = [];
  let seq = 0;
  const push = (
    kind: RequirementKind, label: string, trigger: string,
    request: AssetSearchRequest, priority: 'primary' | 'supporting' = 'supporting'
  ) => {
    seq += 1;
    out.push({
      id: `req-${String(seq).padStart(3, '0')}`,
      kind, label,
      source_intent: input.intent,
      trigger, priority, request,
    });
  };
  const packs = TOPIC_PACKS.filter((p) => p.match.test(text));
  const usedPacks = packs.length ? packs : [];
  for (const pack of usedPacks) {
    for (const b of pack.brolls) {
      push('BROLL', b.label, `topic:${pack.name}`, {
        intent: b.label,
        asset_type: 'video',
        aspect_ratio: ar,
        duration_min: 4,
        duration_max: 30,
        semantic_requirements: [...b.require],
        technical_requirements: {},
        provenance_requirements: {},
      }, 'primary');
    }
  }
  if (darkStyle) {
    push('BACKGROUND', 'dark technology background', 'style:dark', {
      intent: 'dark technology background loop',
      asset_type: 'video',
      aspect_ratio: ar,
      semantic_requirements: ['dark'],
      technical_requirements: {},
      provenance_requirements: {},
    });
  }
  let mood = 'corporate';
  for (const [re, m] of STYLE_MOOD) {
    if (re.test(text)) { mood = m; break; }
  }
  push('MUSIC', `${mood} background music`, `style:${mood}`, {
    intent: `${mood} background music`,
    asset_type: 'music',
    semantic_requirements: [mood],
    technical_requirements: {},
    provenance_requirements: {},
  });
  push('TRANSITION', 'whoosh transition sfx', 'default:transition-kit', {
    intent: 'whoosh transition sound effect',
    asset_type: 'sfx',
    duration_min: 0,
    duration_max: 5,
    semantic_requirements: [],
    technical_requirements: {},
    provenance_requirements: {},
  });
  const arabic = HAS_ARABIC.test(text);
  push('CAPTION_FONT', arabic ? 'arabic caption font' : 'latin caption font', arabic ? 'script:arabic-detected' : 'default:latin', {
    intent: arabic ? 'arabic caption font' : 'caption font',
    asset_type: 'font',
    semantic_requirements: [],
    technical_requirements: {},
    provenance_requirements: {},
  });
  if (!vertical) {
    push('INTRO', 'channel intro sting', 'platform:longform-default', {
      intent: 'logo intro sting',
      asset_type: 'video',
      duration_min: 1,
      duration_max: 8,
      semantic_requirements: [],
      technical_requirements: {},
      provenance_requirements: {},
    });
    push('OUTRO', 'thank-you outro card', 'platform:longform-default', {
      intent: 'thank you for watching outro',
      asset_type: 'video',
      duration_min: 3,
      duration_max: 10,
      semantic_requirements: [],
      technical_requirements: {},
      provenance_requirements: {},
    });
  }
  return out;
}
