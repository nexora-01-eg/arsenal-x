import { NextResponse } from 'next/server';
import { allItems } from '@/lib/arsenalSearch';

export const dynamic = 'force-dynamic';

// فجوات الترسانة: تحليل صادق من المخزون — نقاط قوة وضعف yarقام حقيقية
export async function GET() {
  const cats = allItems();
  const by = new Map(cats.map((c) => [c.prefix, c.items]));
  const get = (p: string) => by.get(p) || [];

  const sfx = get('SFX');
  const trans = sfx.filter((i) => /whoosh|riser|impact|transition|logo|swoosh|reveal|intro/i.test(i.name));
  const music = get('AUD');
  const ambient = music.filter((i) => /ambient|calm|relax|piano|meditat|sleep/i.test(i.name));
  const fonts = get('FNT');
  const arFams = new Set(
    fonts
      .filter((f) => /amiri|aref|cairo|tajawal|almarai|arab|kufi|naskh|ruqaa|thuluth|droid.*arab|noto.*arab/i.test(f.name + ' ' + f.relPath))
      .map((f) => f.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_](regular|bold|italic|light|medium).*/i, ''))
  );
  const icons = get('ICN');
  const bg = get('BG');
  const seamless = bg.filter((i) => /seamless|tileable|repeat/i.test(i.name + ' ' + i.relPath));
  const video = get('VID');
  const videoGB = video.reduce((a, i) => a + i.size, 0) / 1073741824;
  const musicGB = music.reduce((a, i) => a + i.size, 0) / 1073741824;
  const models = get('3D');
  const luts = get('LUT');
  const tpl = get('TPL');

  const gaps: { area: string; status: 'strong' | 'ok' | 'gap'; detail: string; count: number }[] = [
    {
      area: 'المؤثرات الانتقالية',
      status: trans.length >= 10 ? 'ok' : 'gap',
      detail: trans.length >= 10 ? `${trans.length} مؤثر انتقال (whoosh/riser/impact) — كافٍ للوجوهات` : `${trans.length} فقط من أصل ${sfx.length} — الوجوهات والانتقالات تحتاج دعمًا`,
      count: trans.length,
    },
    {
      area: 'الخطوط العربية',
      status: arFams.size >= 15 ? 'strong' : arFams.size >= 6 ? 'ok' : 'gap',
      detail: `${arFams.size} عائلة بأسماء عربية — المحتوى العربي يحتاج المزيد دائمًا`,
      count: arFams.size,
    },
    {
      area: 'الخامات المتصلة',
      status: seamless.length >= 5 ? 'ok' : 'gap',
      detail: seamless.length >= 5 ? `${seamless.length} خامة متصلة للبلاط` : `لا خامات متصلة تقريبًا — مهمة لخلفيات الويب والفيديو`,
      count: seamless.length,
    },
    {
      area: 'الأجواء الصوتية',
      status: ambient.length >= 5 ? 'ok' : 'gap',
      detail: ambient.length >= 5 ? `${ambient.length} مقطع أجواء هادئة` : `مكتبة الموسيقى (${musicGB.toFixed(1)}GB) بلا أجواء هادئة كافية`,
      count: ambient.length,
    },
    {
      area: 'الفيديو السينمائي',
      status: video.length >= 100 ? 'strong' : video.length >= 20 ? 'ok' : 'gap',
      detail: `${video.length} مقطعًا (${videoGB.toFixed(1)}GB) — مخزون ${video.length >= 100 ? 'قوي' : 'محدود'}`,
      count: video.length,
    },
    {
      area: 'الأيقونات',
      status: icons.length >= 1000 ? 'strong' : 'ok',
      detail: `${icons.length.toLocaleString('en-US')} أيقونة في 3 عائلات رئيسية — تغطية ممتازة`,
      count: icons.length,
    },
    {
      area: 'الموديلات ثلاثية الأبعاد',
      status: models.length >= 100 ? 'ok' : 'gap',
      detail: `${models.length} موديلًا — كافٍ للبدء، والتوسع يفيد المشاهد المعقدة`,
      count: models.length,
    },
    {
      area: 'عدسات الألوان',
      status: luts.length >= 100 ? 'strong' : 'ok',
      detail: `${luts.length} عدسة LUT — تغطية ممتازة للجريد السينمائي`,
      count: luts.length,
    },
    {
      area: 'القوالب',
      status: tpl.length >= 100 ? 'strong' : 'ok',
      detail: `${tpl.length} قالبًا حيًا — أساس قوي لمواقع وهويات`,
      count: tpl.length,
    },
  ];

  return NextResponse.json({ gaps });
}
