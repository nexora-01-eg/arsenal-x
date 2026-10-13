import { NextResponse } from 'next/server';
import {
  CATEGORIES, indexImages, indexBackgrounds, indexModels, indexLuts,
  indexFonts, indexMusic, indexSfx, indexVideo, indexTemplates, indexFx, indexIcons, indexZips,
  type XCodeItem,
} from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';
import { qualityOf } from '@/lib/quality';

export const dynamic = 'force-dynamic';

// Vault 2.0: أقسام تحريرية من محرك الجودة الفئوية — كل اختيار مسبب
const MODERN = new Set(['avif', 'webp', 'woff2', 'glb', 'mp4', 'svg', 'woff', 'm4v']);

function famOf(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[_-]\d+pt/g, '')
    .replace(/regular|bold|italic|light|medium|black|thin|extralight|extrabold|semibold|demibold|heavy|condensed|extended|oblique|book|demi|ultra|hairline|variable|normal|roman|weight/g, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ') || name.toLowerCase();
}

const PER_SHELF = 12;

interface Scored {
  item: XCodeItem;
  slug: string;
  prefix: string;
  s: number;
  reasons: string[];
}

export async function GET() {
  const defs: [string, string, () => XCodeItem[]][] = [
    ['images', 'IMG', indexImages],
    ['backgrounds', 'BG', indexBackgrounds],
    ['icons', 'ICN', indexIcons],
    ['models', '3D', indexModels],
    ['luts', 'LUT', indexLuts],
    ['fx', 'FX', indexFx],
    ['music', 'AUD', indexMusic],
    ['sfx', 'SFX', indexSfx],
    ['video', 'VID', indexVideo],
    ['templates', 'TPL', indexTemplates],
    ['fonts', 'FNT', indexFonts],
    ['archives', 'ZIP', indexZips],
  ];

  // سياق العائلات لكل فئة
  const scored: Scored[] = [];
  const shelves: { key: string; label: string; slug: string; items: any[] }[] = [];

  for (const [slug, prefix, fn] of defs) {
    let items: XCodeItem[];
    try {
      items = getCached(slug, fn);
    } catch {
      continue;
    }
    const famCount = new Map<string, number>();
    for (const it of items) famCount.set(famOf(it.name), (famCount.get(famOf(it.name)) || 0) + 1);
    const srcCount = new Map<string, number>();
    for (const it of items) srcCount.set(it.source, (srcCount.get(it.source) || 0) + 1);

    const ranked = items.map((it) => {
      const q = qualityOf(prefix, it, { famCount: famCount.get(famOf(it.name)) || 1, famSize: srcCount.get(it.source) || 1 });
      const badges: string[] = [];
      if (q.reasons.includes('دقة عالية') || q.reasons.includes('مقطع غني') || q.reasons.includes('تفاصيل غنية')) badges.push('دقة عالية');
      if (q.reasons.includes('صيغة حديثة') || q.reasons.includes('فيكتور قابل للتحجيم') || q.reasons.includes('عرض مباشر') || q.reasons.includes('تشغيل فوري')) badges.push('صيغة حديثة');
      if (q.reasons.includes('عائلة مكتملة')) badges.push('عائلة مكتملة');
      if ((srcCount.get(it.source) || 99) <= 3) badges.push('نادر');
      if (q.reasons.includes('مختارة')) badges.push('مختارة');
      if (q.reasons.includes('تغطية عربية')) badges.push('عربي');
      return { it, s: q.score, reasons: q.reasons, badges: badges.slice(0, 2) };
    });

    ranked.sort((a, b) => b.s - a.s);
    const meta = CATEGORIES.find((c) => c.codePrefix === prefix);
    shelves.push({
      key: prefix, label: meta?.label || prefix, slug,
      items: ranked.slice(0, PER_SHELF).map((r) => ({ ...r.it, badges: r.badges, reasons: r.reasons })),
    });
    for (const r of ranked) scored.push({ item: r.it, slug, prefix, s: r.s, reasons: r.reasons });
  }

  scored.sort((a, b) => b.s - a.s);

  // عد المصادر مرة واحدة (لا فحص تربيعي)
  const srcKeyCount = new Map<string, number>();
  for (const s of scored) {
    const k = s.prefix + '|' + s.item.source;
    srcKeyCount.set(k, (srcKeyCount.get(k) || 0) + 1);
  }

  // أقسام تحريرية — لا يظهر قسم بلا بيانات حقيقية
  const seen = new Set<string>();
  const pick = (n: number, fn: (s: Scored) => boolean) => {
    const out = [];
    for (const s of scored) {
      if (out.length >= n) break;
      if (seen.has(s.item.code)) continue;
      if (!fn(s)) continue;
      seen.add(s.item.code);
      out.push({ ...s.item, slug: s.slug, prefix: s.prefix, reasons: s.reasons.slice(0, 2) });
    }
    return out;
  };

  const now = Date.now();
  const sections = [
    {
      id: 'featured', title: 'مختارات المحرر', blurb: 'أعلى الدرجات عبر الترسانة كلها',
      items: pick(8, () => true),
    },
    {
      id: 'rare', title: 'نوادر', blurb: 'من مصادر نادرة (≤3 عناصر)',
      items: pick(8, (s) => (srcKeyCount.get(s.prefix + '|' + s.item.source) || 99) <= 3),
    },
    {
      id: 'families', title: 'عائلات مكتملة', blurb: 'خطوط وأيقونات بعائلات غنية',
      items: pick(8, (s) => (s.prefix === 'FNT' || s.prefix === 'ICN') && s.reasons.some((r) => r.includes('مكتملة') || r.includes('ضخمة'))),
    },
    {
      id: 'recent', title: 'اكتشافات حديثة', blurb: 'وصلت خلال 90 يومًا وبجودة عالية',
      items: pick(8, (s) => (s.item.mtimeMs || 0) > now - 90 * 86400000 && s.s > 6),
    },
    {
      id: 'gems', title: 'جواهر مخفية', blurb: 'درجة عالية من مصادر صغيرة',
      items: pick(8, (s) => (srcKeyCount.get(s.prefix + '|' + s.item.source) || 99) <= 12 && s.s > 7),
    },
  ].filter((sec) => sec.items.length >= 3);

  return NextResponse.json({
    shelves,
    sections,
    method: 'محرك جودة فئوية: كل نوع بمنطقه (الدقة للصور، العائلة للخطوط، الصيغة للموديلات…) + الحداثة − صور الاختبار.',
  });
}
