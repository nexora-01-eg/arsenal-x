import { notFound } from 'next/navigation';
import GalleryGrid from '@/components/GalleryGrid';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const META: Record<string, { title: string; sub: string; code: string }> = {
  fonts: { title: 'الخطوط', sub: 'معاينة كتابة حية — اكتب نصك وشاهده بكل خط فورًا', code: 'X-FNT' },
  images: { title: 'الصور', sub: 'مكتبة بصرية Masonry — اضغط أي صورة للعرض الكامل', code: 'X-IMG' },
  backgrounds: { title: 'خلفيات ونسيج', sub: 'خامات سينمائية — اضغط أي خامة للعرض الكامل', code: 'X-BG' },
  icons: { title: 'الأيقونات', sub: 'أيقونات SVG و PNG شفافة — اضغط للمعاينة الكاملة', code: 'X-ICN' },
  models: { title: 'ثلاثي الأبعاد', sub: 'موديلات glTF و FBX و OBJ — حمّل مباشرة', code: 'X-3D' },
  luts: { title: 'LUT', sub: 'عدسات ألوان لعملية الجريد — حمّل ملف .cube', code: 'X-LUT' },
  fx: { title: 'مؤثرات متحركة', sub: 'تحريكات Lottie تعمل حيًا داخل البطاقة', code: 'X-FX' },
  music: { title: 'الموسيقى', sub: 'مشغل صوتي مدمج — استمع وحمّل مباشرة', code: 'X-AUD' },
  sfx: { title: 'المؤثرات الصوتية', sub: 'مؤثرات قصيرة — استمع وحمّل مباشرة', code: 'X-SFX' },
  video: { title: 'الفيديو', sub: 'مرّر للمعاينة الفورية — اضغط للمسرح الكامل', code: 'X-VID' },
  templates: { title: 'القوالب', sub: 'قوالب HTML تعمل حيًا داخل البطاقة — اضغط للملء الكامل', code: 'X-TPL' },
  archives: { title: 'الأرشيفات والحزم', sub: 'حزم SFX والقوالب والموديلات المضغوطة — تحميل مباشر', code: 'X-ZIP' },
};

const VALID = Object.keys(META);

export function generateStaticParams() {
  return VALID.map((c) => ({ category: c }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: cat } = await params;
  if (!VALID.includes(cat)) notFound();
  const meta = META[cat];
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-l from-gold/[0.08] via-transparent to-transparent p-8 text-center md:p-12">
        <div className="hero-grid absolute inset-0" />
        <div className="relative">
          <span className="font-mono-x mb-4 inline-block rounded-full border border-gold/30 bg-black/50 px-4 py-1.5 text-xs text-gold">
            {meta.code}-0001 → …
          </span>
          <h1 className="text-4xl font-black md:text-6xl">
            <span className="gold-text">{meta.title}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">{meta.sub}</p>
        </div>
      </div>
      <GalleryGrid category={cat} />
    </div>
  );
}
