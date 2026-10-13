import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { arsenalRoot } from './config';

// Phase 18: single authoritative root (config.ts). Kept as a live `let`
// binding so existing `import { ROOT }` callers keep working; refresh via
// refreshRoot() after setArsenalRoot(). Do NOT hardcode a drive here.
export let ROOT: string = arsenalRoot();
export function refreshRoot(): string {
  ROOT = arsenalRoot();
  return ROOT;
}

export type XCategory = 'IMG' | 'VID' | 'ICN' | 'FNT' | 'AUD' | 'SFX' | '3D' | 'LUT' | 'BG' | 'TPL' | 'FX' | 'ZIP';

export interface XCodeItem {
  code: string;
  name: string;
  path: string;
  relPath: string;
  size: number;
  ext: string;
  source: string;
  tags?: string[];
  mtimeMs?: number;
}

export interface XCategoryMeta {
  key: XCategory;
  label: string;
  codePrefix: string;
  icon: string;
  description: string;
  count: number;
}

const FONT_EXT = ['.ttf', '.otf', '.woff', '.woff2', '.eot'];
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.svg'];
const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
const AUDIO_EXT = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.aiff'];
const MODEL_EXT = ['.glb', '.gltf', '.fbx', '.obj', '.blend', '.dae', '.usdc', '.tres'];
const SFX_EXT = ['.mp3', '.wav', '.flac', '.ogg', '.aiff', '.aif'];
const LUT_EXT = ['.cube'];
const BG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.psd', '.eps', '.ai'];
const TPL_EXT = ['.html', '.htm'];
const FX_EXT = ['.json', '.lottie'];
const ZIP_EXT = ['.zip', '.gz'];

// عين X: تخطي مجلدات النظام/البناء فقط — لا أسماء عامة (src/assets/...)
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'target',
  '.github', '.idea', '.vscode', '.husky', '.cspell', '.vercel', '.yarn',
  '_logs', '_tmp', '_projects',
]);

function walk(dir: string, exts: string[], out: XCodeItem[], source: string, baseDir: string) {
  let raw: any[] = [];
  try { raw = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of raw) {
    if (e && e.name !== undefined && SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, exts, out, source, baseDir);
    } else {
      const dot = e.name.lastIndexOf('.');
      if (dot < 0) continue;
      const ext = e.name.slice(dot).toLowerCase();
      if (exts.includes(ext)) {
        try {
          const st = statSync(full);
          out.push({
            code: '',
            name: e.name,
            path: full,
            relPath: full.replace(baseDir + '\\', '').replace(/\\/g, '/'),
            size: st.size,
            ext: ext.slice(1),
            source,
            mtimeMs: Math.round(st.mtimeMs),
          });
        } catch { /* skip */ }
      }
    }
  }
}

const ROBUST_PAD = (n: number) => String(n).padStart(4, '0');

function collect(roots: { dir: string; source: string }[], exts: string[]): XCodeItem[] {
  const out: XCodeItem[] = [];
  for (const r of roots) {
    if (existsSync(r.dir)) walk(r.dir, exts, out, r.source, ROOT);
    else continue;
  }
  // من الأصغر للأكبر بالاسم ثم المسار — كود ثابت لنفس الملف
  out.sort((a, b) => {
    const na = (a.name || '').toLowerCase();
    const nb = (b.name || '').toLowerCase();
    if (na !== nb) return na < nb ? -1 : 1;
    return a.path < b.path ? -1 : 1;
  });
  return out;
}

function assignCodes(prefix: string, items: XCodeItem[]): XCodeItem[] {
  items.forEach((it, i) => {
    it.code = `X-${prefix}-${ROBUST_PAD(i + 1)}`;
  });
  return items;
}

export const CATEGORIES: XCategoryMeta[] = [
  { key: 'FNT', label: 'الخطوط', codePrefix: 'FNT', icon: 'Type', description: 'خطوط عربية وأجنبية بأصنافها', count: 0 },
  { key: 'IMG', label: 'الصور', codePrefix: 'IMG', icon: 'Image', description: 'صور فوتوغرافية من محتوى بصري', count: 0 },
  { key: 'BG', label: 'خلفيات ونسيج', codePrefix: 'BG', icon: 'Palette', description: 'خلفيات وخامات ومصادر تصميم', count: 0 },
  { key: 'ICN', label: 'الأيقونات', codePrefix: 'ICN', icon: 'Shapes', description: 'أيقونات SVG و PNG شفافة', count: 0 },
  { key: '3D', label: 'ثلاثي الأبعاد', codePrefix: '3D', icon: 'Box', description: 'موديلات glTF و Blender', count: 0 },
  { key: 'LUT', label: 'LUT', codePrefix: 'LUT', icon: 'Sliders', description: 'عدسات ألوان لعملية الجريد', count: 0 },
  { key: 'FX', label: 'مؤثرات ومتحركات', codePrefix: 'FX', icon: 'Sparkles', description: 'Lottie وتحريكات جاهزة', count: 0 },
  { key: 'AUD', label: 'الموسيقى', codePrefix: 'AUD', icon: 'Music', description: 'موسيقى خلفية', count: 0 },
  { key: 'SFX', label: 'المؤثرات الصوتية', codePrefix: 'SFX', icon: 'AudioLines', description: 'مؤثرات صوتية قصيرة', count: 0 },
  { key: 'VID', label: 'الفيديو', codePrefix: 'VID', icon: 'Video', description: 'لقطات فيديو ستوك', count: 0 },
  { key: 'TPL', label: 'القوالب', codePrefix: 'TPL', icon: 'LayoutTemplate', description: 'قوالب مواقع جاهزة', count: 0 },
  { key: 'ZIP', label: 'الأرشيفات والحزم', codePrefix: 'ZIP', icon: 'Archive', description: 'حزم مضغوطة جاهزة للتحميل', count: 0 },
];

export function indexImages(): XCodeItem[] {
  // عين X: صور فوتوغرافية فقط — NK4 والخلفيات والمواد لها فئاتها (منع التكرار)
  return assignCodes('IMG', collect([
    { dir: join(ROOT, 'MH - محتوى بصري', '01-صور'), source: 'محتوى بصري' },
  ], IMG_EXT));
}

export function indexBackgrounds(): XCodeItem[] {
  const items = collect([
    { dir: join(ROOT, '2 - خلفيات ونسيج'), source: 'خلفيات ونسيج' },
    { dir: join(ROOT, '3 - مواد ثلاثية الأبعاد'), source: 'مواد ثلاثية' },
    { dir: join(ROOT, 'خامات ومؤثرات 3D'), source: 'خامات 3D' },
    { dir: join(ROOT, '10_MotionDesign'), source: 'MotionDesign' },
    { dir: join(ROOT, '08_3D_Assets'), source: 'Textures' },
  ], BG_EXT);
  // عين X: وسم صادق — فصل الخامات المختارة عن صور الاختبار/التوثيق
  for (const it of items) {
    const p = (it.relPath + '/' + it.name).toLowerCase();
    const tags: string[] = [];
    if (/threejs|codrops|lottie|meteocons|blender-demos|\/manual\/|\/examples\/|screenshot|\/docs\/|\/tests?\/|playground|_gifs|\/gifs\//.test(p)) tags.push('اختبار');
    if (/albedo|normal|roughness|\bao\b|metallic|displacement|emissive|pbr/.test(p)) tags.push('pbr');
    if (/gradient/.test(p)) tags.push('تدرج');
    if (/gold/.test(p)) tags.push('ذهبي');
    if (/grain|noise|stipple/.test(p)) tags.push('grain');
    if (/marble/.test(p)) tags.push('رخام');
    if (/particle|bokeh|smoke|fire|nebula|glitter|spark/.test(p)) tags.push('جسيمات');
    if (/abstract/.test(p)) tags.push('تجريدي');
    if (!tags.length) tags.push('خامات');
    it.tags = tags;
  }
  return assignCodes('BG', items);
}

export function indexModels(): XCodeItem[] {
  return assignCodes('3D', collect([
    { dir: join(ROOT, '10_MotionDesign'), source: 'MotionDesign' },
    { dir: join(ROOT, '08_3D_Assets'), source: '3D' },
    { dir: join(ROOT, '3 - مواد ثلاثية الأبعاد'), source: 'مواد' },
    { dir: join(ROOT, 'خامات ومؤثرات 3D'), source: 'خامات 3D' },
  ], MODEL_EXT));
}

export function indexLuts(): XCodeItem[] {
  return assignCodes('LUT', collect([
    { dir: join(ROOT, '08_3D_Assets', 'LUTs-Camera', 'luts'), source: 'Camera' },
    { dir: join(ROOT, '08_3D_Assets', 'LUTs-Film', 'luts'), source: 'Film' },
    { dir: join(ROOT, '10_MotionDesign', 'threejs', 'examples', 'luts'), source: 'three.js' },
    { dir: join(ROOT, '10_MotionDesign', 'threejs', 'manual', 'examples', 'resources', 'luts'), source: 'three.js' },
  ], LUT_EXT));
}

export function indexFonts(): XCodeItem[] {
  return assignCodes('FNT', collect([
    { dir: join(ROOT, '01_Fonts'), source: '01_Fonts' },
    { dir: join(ROOT, 'Fonts-Organized'), source: 'Fonts-Organized' },
    { dir: join(ROOT, '1 - خطوط'), source: 'خطوط' },
    { dir: join(ROOT, '03-خطوط'), source: '03-خطوط' },
    { dir: join(ROOT, 'Google Fonts'), source: 'Google Fonts' },
  ], FONT_EXT));
}

export function indexMusic(): XCodeItem[] {
  return assignCodes('AUD', collect([
    { dir: join(ROOT, '04_Music'), source: 'Incompetech' },
    { dir: join(ROOT, 'موسيقى'), source: 'موسيقى' },
    { dir: join(ROOT, '04-صوتيات'), source: 'صوتيات' },
  ], AUDIO_EXT));
}

export function indexSfx(): XCodeItem[] {
  return assignCodes('SFX', collect([
    { dir: join(ROOT, '03_SFX'), source: 'SFX' },
    { dir: join(ROOT, 'مؤثرات صوتية'), source: 'مؤثرات صوتية' },
  ], SFX_EXT));
}

export function indexVideo(): XCodeItem[] {
  return assignCodes('VID', collect([
    { dir: join(ROOT, '05_VideoAssets'), source: 'VideoAssets' },
    { dir: join(ROOT, 'MH - محتوى بصري', '02-فيديو'), source: 'محتوى بصري' },
    { dir: join(ROOT, '10_MotionDesign'), source: 'MotionDesign' },
  ], VIDEO_EXT));
}

export function indexTemplates(): XCodeItem[] {
  return assignCodes('TPL', collect([
    { dir: join(ROOT, '06_Templates'), source: 'Templates' },
  ], TPL_EXT));
}

export function indexFx(): XCodeItem[] {
  // عين X: mega يحوي ~700 sample حقيقي + خردة scaffolding + نسخ مكررة عبر SDKs
  // meteocons مستبعد عمدًا — صيغة خاصة {targets} لا تعمل بمشغل Lottie
  const JUNK = new Set([
    'package-lock.json', 'jsconfig.json', 'manifest.json',
    'bower.json', 'biome.json',
  ]);
  const isJunk = (n: string) =>
    JUNK.has(n) ||
    n.startsWith('.') ||         // dotfiles (.babelrc, .eslintrc…)
    n.startsWith('package') ||   // package.json variants
    n.startsWith('tsconfig') ||  // tsconfig.* scaffolding
    /\.schema\.json$/i.test(n) ||
    /\.config\.json$/i.test(n);
  const items = collect([
    { dir: join(ROOT, '10_MotionDesign', 'lottie-library'), source: 'Lottie' },
    { dir: join(ROOT, '10_MotionDesign', 'lottie-mega'), source: 'Lottie-SDK-Samples' },
    { dir: join(ROOT, '05-أخرى'), source: '05-أخرى' },
    { dir: join(ROOT, 'lottie'), source: 'lottie' },
  ], FX_EXT);
  const seen = new Set<string>();
  const clean: XCodeItem[] = [];
  for (const it of items) {
    const n = it.name.toLowerCase();
    if (isJunk(n)) continue;
    const k = n + '|' + it.size; // نفس النسخة عبر repos = كود واحد
    if (seen.has(k)) continue;
    seen.add(k);
    clean.push(it);
  }
  return assignCodes('FX', clean);
}

export function indexIcons(): XCodeItem[] {
  return assignCodes('ICN', collect([
    { dir: join(ROOT, '02_Icons'), source: '02_Icons' },
    { dir: join(ROOT, 'svg'), source: 'svg' },
    { dir: join(ROOT, 'NK4 - png'), source: 'NK4' },
  ], ['.svg', '.png', '.ico', '.webp', '.jpg', '.jpeg']));
}

export function indexZips(): XCodeItem[] {
  // عين X: جذور مستهدفة فقط — كاش yarn ومجلدات SDK مستبعدة
  return assignCodes('ZIP', collect([
    { dir: join(ROOT, '03_SFX'), source: 'حزم SFX' },
    { dir: join(ROOT, '05_VideoAssets'), source: 'حزم فيديو' },
    { dir: join(ROOT, '06_Templates', 'HTML5UP'), source: 'حزم قوالب' },
    { dir: join(ROOT, '08_3D_Assets'), source: 'حزم 3D' },
    { dir: join(ROOT, '06_Templates', 'GitClones', 'shadcn-ui', 'apps', 'v4', 'public', 'r', 'templates'), source: 'shadcn' },
    { dir: join(ROOT, '10_MotionDesign', 'gltf-assets'), source: 'حزم موديلات' },
  ], ZIP_EXT));
}
