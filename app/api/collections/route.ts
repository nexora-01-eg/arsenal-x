import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/arsenalSearch';

export const dynamic = 'force-dynamic';

// مجموعات ذكية: قواعد OR على المخزون الحقيقي — تُعرض فقط عند ≥10 عناصر
const RULES: { id: string; title: string; blurb: string; query: string }[] = [
  { id: 'cinematic', title: 'سينمائي', blurb: 'لقطات وصور وموسيقى بروح الأفلام', query: 'cinematic film movie' },
  { id: 'gold', title: 'ذهبي فاخر', blurb: 'خامات وخلفيات وعناصر ذهبية للبراندات الفاخرة', query: 'gold golden luxury' },
  { id: 'arabic', title: 'عربي', blurb: 'خطوط ومحتوى بروح عربية', query: 'amiri aref cairo tajawal almarai arabic خطوط' },
  { id: 'dark', title: 'داكن', blurb: 'خلفيات ولقطات داكنة مزاجية', query: 'dark black night' },
  { id: 'gradients', title: 'تدرجات', blurb: 'خلفيات متدرجة جاهزة', query: 'gradient' },
  { id: 'textures', title: 'خامات', blurb: 'نسيج وخامات للتصميم ثلاثي الأبعاد والخلفيات', query: 'texture grain marble noise' },
  { id: 'motion', title: 'موشن', blurb: 'تحريكات Lottie وفيديو حي', query: 'lottie mp4 json' },
  { id: 'sfx-trans', title: 'مؤثرات انتقالية', blurb: 'whoosh وriser وimpact للوجوهات والانتقالات', query: 'whoosh riser impact transition logo swoosh' },
  { id: 'models3d', title: 'ثلاثي الأبعاد', blurb: 'موديلات جاهزة للعرض والتحميل', query: 'glb gltf' },
  { id: 'icons', title: 'أيقونات', blurb: 'مكتبات الأيقونات الكاملة', query: 'svg icon' },
  { id: 'templates', title: 'قوالب', blurb: 'قوالب مواقع جاهزة للمعاينة الحية', query: 'html template' },
  { id: 'ambient', title: 'أجواء صوتية', blurb: 'موسيقى خلفية وأجواء', query: 'ambient calm relax piano' },
  { id: 'branding', title: 'للعلامات التجارية', blurb: 'شعارات وفخامة وهويات', query: 'logo brand luxury gold' },
  { id: 'websites', title: 'لمواقع الويب', blurb: 'قوالب وواجهات جاهزة', query: 'html template landing ui' },
  { id: 'presentations', title: 'للعروض التقديمية', blurb: 'شرائح وقوالب corporate', query: 'presentation slide corporate' },
  { id: 'documentary', title: 'وثائقي', blurb: 'طبيعة وتاريخ ولقطات واقعية', query: 'documentary nature history' },
  { id: 'education', title: 'تعليمي', blurb: 'مدارس وشروحات', query: 'education school tutorial' },
];

const MIN_COUNT = 10;
const SAMPLE = 6;

export async function GET() {
  const out = [];
  for (const r of RULES) {
    try {
      const { total, groups } = searchAll(r.query, 'or', SAMPLE);
      if (total < MIN_COUNT) continue;
      const sample = groups.slice(0, 3).flatMap((g) =>
        g.items.slice(0, 2).map((it) => ({ item: it, slug: g.slug }))
      ).slice(0, SAMPLE);
      const topGroups = groups.slice(0, 4).map((g) => ({ key: g.key, label: g.label, slug: g.slug, count: g.count }));
      out.push({ id: r.id, title: r.title, blurb: r.blurb, query: r.query, total, groups: topGroups, sample });
    } catch { /* skip failing rule */ }
  }
  out.sort((a, b) => b.total - a.total);
  return NextResponse.json({ collections: out });
}
