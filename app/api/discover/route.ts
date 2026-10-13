import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/arsenalSearch';
import type { XCodeItem } from '@/lib/indexer';

export const dynamic = 'force-dynamic';

// Discover: نية إبداعية ← أقسام منظمة (بصريات/خطوط/موشن/صوت/جرافيك/3D/قوالب)
const INTENT: [RegExp, string][] = [
  [/luxury|premium|elegant|فاخر|فخم|ذهبي|راق/i, 'gold luxury premium elegant marble'],
  [/dark|داكن|أسود|ليلي|moody/i, 'dark black night'],
  [/cinematic|film|movie|سينمائي|فيلم/i, 'cinematic film movie documentary'],
  [/arabic|عربي|خطوط/i, 'arabic amiri cairo tajawal almarai خطوط'],
  [/restaurant|food|مطعم|طعام|menu|chef/i, 'food restaurant menu'],
  [/tech|تقني|futur|ذكاء|ai\b/i, 'tech abstract futuristic circuit'],
  [/medical|طبي|health|doctor/i, 'medical health doctor'],
  [/fashion|أزياء|editorial|portrait/i, 'fashion editorial portrait'],
  [/nature|طبيعة|landscape|mountain/i, 'nature landscape mountain forest'],
  [/minimal|clean|بسيط|هادئ/i, 'minimal clean simple'],
  [/corporate|business|شركات|أعمال|office/i, 'corporate business office'],
  [/social|سوشيال|instagram|reels/i, 'social portrait vertical'],
  [/wedding|زفاف|bride/i, 'wedding bride'],
  [/sport|رياضة|fitness/i, 'sport fitness'],
  [/music|موسيقى|piano/i, 'music piano ambient'],
  [/gold/i, 'gold golden'],
  [/gradient/i, 'gradient'],
];

const BUCKETS: { id: string; title: string; slugs: string[] }[] = [
  { id: 'visuals', title: 'بصريات', slugs: ['images', 'backgrounds'] },
  { id: 'type', title: 'خطوط', slugs: ['fonts'] },
  { id: 'motion', title: 'موشن', slugs: ['video', 'fx'] },
  { id: 'sound', title: 'صوت', slugs: ['music', 'sfx'] },
  { id: 'graphics', title: 'جرافيك', slugs: ['icons'] },
  { id: 'models', title: 'ثلاثي الأبعاد', slugs: ['models'] },
  { id: 'templates', title: 'قوالب', slugs: ['templates'] },
];

export async function GET(req: Request) {
  const intent = (new URL(req.url).searchParams.get('intent') || '').trim();
  if (intent.length < 2) return NextResponse.json({ intent, sections: [] });

  let expanded = intent;
  for (const [re, add] of INTENT) {
    if (re.test(intent)) { expanded += ' ' + add; break; }
  }

  const { groups } = searchAll(expanded, 'or', 12);
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const sections = BUCKETS.map((b) => {
    const items: { item: XCodeItem; slug: string; key: string }[] = [];
    let total = 0;
    for (const s of b.slugs) {
      const g = bySlug.get(s);
      if (!g) continue;
      total += g.count;
      for (const it of g.items.slice(0, 6)) items.push({ item: it, slug: s, key: g.key });
    }
    return { id: b.id, title: b.title, total, items: items.slice(0, 12) };
  }).filter((s) => s.items.length > 0);

  const total = sections.reduce((a, s) => a + s.total, 0);
  return NextResponse.json({ intent, expanded, total, sections });
}
