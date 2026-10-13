'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Type, Image as ImageIcon, Palette, Box, Sliders, Sparkles,
  Music, AudioLines, Video, LayoutTemplate, Loader2, Crosshair,
  Shapes, ArrowLeft, Copy, Wrench, Film, Layers, Archive, Gem, History, Compass,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Type, Image: ImageIcon, Palette, Box, Sliders, Sparkles,
  Music, AudioLines, Video, LayoutTemplate, Shapes, Archive,
};

interface Card {
  key: string; label: string; codePrefix: string; icon: string; description: string; count: number;
}

const fallbackCards: Card[] = [
  { key: 'FNT', label: 'الخطوط', codePrefix: 'FNT', icon: 'Type', description: 'خطوط عربية وأجنبية', count: 0 },
  { key: 'IMG', label: 'الصور', codePrefix: 'IMG', icon: 'Image', description: 'صور وأصول بصرية', count: 0 },
  { key: 'BG', label: 'خلفيات ونسيج', codePrefix: 'BG', icon: 'Palette', description: 'خلفيات ومواد', count: 0 },
  { key: 'ICN', label: 'الأيقونات', codePrefix: 'ICN', icon: 'Shapes', description: 'أيقونات SVG و PNG', count: 0 },
  { key: '3D', label: 'ثلاثي الأبعاد', codePrefix: '3D', icon: 'Box', description: 'موديلات glTF', count: 0 },
  { key: 'LUT', label: 'LUT', codePrefix: 'LUT', icon: 'Sliders', description: 'عدسات ألوان', count: 0 },
  { key: 'FX', label: 'مؤثرات متحركة', codePrefix: 'FX', icon: 'Sparkles', description: 'Lottie وتحريكات', count: 0 },
  { key: 'AUD', label: 'الموسيقى', codePrefix: 'AUD', icon: 'Music', description: 'موسيقى خلفية', count: 0 },
  { key: 'SFX', label: 'مؤثرات صوتية', codePrefix: 'SFX', icon: 'AudioLines', description: 'مؤثرات قصيرة', count: 0 },
  { key: 'VID', label: 'الفيديو', codePrefix: 'VID', icon: 'Video', description: 'لقطات ستوك', count: 0 },
  { key: 'TPL', label: 'القوالب', codePrefix: 'TPL', icon: 'LayoutTemplate', description: 'قوالب مواقع', count: 0 },
  { key: 'ZIP', label: 'الأرشيفات', codePrefix: 'ZIP', icon: 'Archive', description: 'حزم مضغوطة', count: 0 },
];

function fileUrl(relPath: string) {
  return `/api/file?path=${encodeURIComponent(relPath).replace(/%2F/g, '/')}`;
}

function Filmstrip() {
  const [shots, setShots] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/images');
        const data = await res.json();
        if (Array.isArray(data)) {
          const imgs = data
            .filter((d: any) => !/\.svg$/i.test(d.name))
            .slice(0, 24)
            .map((d: any) => fileUrl(d.relPath));
          setShots(imgs);
        }
      } catch { /* silent */ }
    })();
  }, []);
  if (!shots.length) return null;
  const doubled = [...shots, ...shots];
  return (
    <div className="relative mt-14 overflow-hidden" dir="ltr">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#08080d] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#08080d] to-transparent" />
      <div className="marquee-track">
        {doubled.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={s}
            alt=""
            loading="lazy"
            className="h-28 w-44 shrink-0 rounded-xl border border-white/10 object-cover opacity-70 transition-opacity hover:opacity-100"
          />
        ))}
      </div>
    </div>
  );
}

function ContinueStrip() {
  const [items, setItems] = useState<{ code: string; slug: string; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('arsenal-x-workspace-v1');
        const recent = raw ? JSON.parse(raw).recent || [] : [];
        if (!recent.length) return;
        const out = [];
        for (const r of recent.slice(0, 8)) {
          try {
            const res = await fetch(`/api/resolve?code=${encodeURIComponent(r.code)}`);
            const j = await res.json();
            if (j.found) out.push({ code: j.item.code, slug: j.slug, name: j.item.name });
          } catch { /* skip */ }
        }
        setItems(out);
      } catch { /* no workspace */ }
    })();
  }, []);
  if (!items.length) return null;
  return (
    <section className="mx-auto mb-16 max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <History size={17} className="text-gold" /> تابع الإبداع
        </h2>
        <Link href="/workspace" className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-gold">
          مساحتي <ArrowLeft size={12} />
        </Link>
      </div>
      <div className="marquee-track" dir="ltr" style={{ animationDuration: '60s' }}>
        {items.map((it) => (
          <Link
            key={it.code}
            href={`/search?q=${encodeURIComponent(it.code)}`}
            className="glass flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-2 pr-4 transition-colors hover:border-gold/40"
          >
            <span className="font-mono-x rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">{it.code}</span>
            <span className="max-w-44 truncate text-xs text-white/75">{it.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ago(ms?: number) {
  if (!ms) return '';
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d < 30) return `منذ ${d} يوم`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'منذ شهر' : `منذ ${m} شهر`;
}

function NewestStrip() {
  const [items, setItems] = useState<{ code: string; slug: string; name: string; mtimeMs?: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/newest?limit=10');
        const j = await res.json();
        setItems(j.items || []);
      } catch { /* silent */ }
    })();
  }, []);
  if (!items.length) return null;
  return (
    <section className="mx-auto mb-16 max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Sparkles size={17} className="text-gold" /> وصل حديثًا
        </h2>
      </div>
      <div className="marquee-track" dir="ltr" style={{ animationDuration: '70s' }}>
        {items.map((it) => (
          <Link
            key={it.code}
            href={`/search?q=${encodeURIComponent(it.code)}`}
            className="glass flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-2 pr-4 transition-colors hover:border-gold/40"
            title={it.name}
          >
            <span className="font-mono-x rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">{it.code}</span>
            <span className="max-w-44 truncate text-xs text-white/75">{it.name}</span>
            {it.mtimeMs ? <span className="text-[10px] text-muted">{ago(it.mtimeMs)}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function DiscoverCTA() {
  return (
    <section className="mx-auto mb-16 max-w-5xl">
      <Link
        href="/discover"
        className="glass card-hover group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl px-8 py-10 text-center"
      >
        <div className="absolute -top-20 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-[80px]" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5 text-xs text-gold">
          <Compass size={13} /> اكتشف بنية إبداعية
        </span>
        <span className="relative text-2xl font-black md:text-3xl">
          صِف الفكرة… <span className="gold-text">واستلم الاتجاه كاملًا</span>
        </span>
        <span className="relative text-xs text-muted">بصريات + خطوط + موشن + صوت — من نية واحدة مثل «dark luxury»</span>
      </Link>
    </section>
  );
}

function CollectionsTeaser() {
  const [cols, setCols] = useState<{ id: string; title: string; total: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/collections');
        const j = await res.json();
        setCols((j.collections || []).slice(0, 6).map((c: any) => ({ id: c.id, title: c.title, total: c.total })));
      } catch { /* silent */ }
    })();
  }, []);
  if (!cols.length) return null;
  return (
    <section className="mx-auto mb-16 max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Layers size={17} className="text-gold" /> مجموعات مختارة
        </h2>
        <Link href="/collections" className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-gold">
          الكل <ArrowLeft size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cols.map((c) => (
          <Link
            key={c.id}
            href="/collections"
            className="glass card-hover rounded-2xl p-4 text-center"
          >
            <div className="text-sm font-black">{c.title}</div>
            <div className="font-mono-x mt-1 text-[11px] text-gold">{c.total.toLocaleString('en-US')}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function VaultTeaser() {  const [tops, setTops] = useState<{ code: string; slug: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/vault');
        const j = await res.json();
        const all: { code: string; slug: string }[] = [];
        for (const sh of (j.shelves || []).slice(0, 6)) {
          for (const it of (sh.items || []).slice(0, 2)) all.push({ code: it.code, slug: sh.slug });
        }
        setTops(all.slice(0, 12));
      } catch { /* silent */ }
    })();
  }, []);
  if (!tops.length) return null;
  return (
    <section className="mx-auto mb-16 max-w-6xl text-center">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Gem size={17} className="text-gold" />
        <h2 className="text-lg font-black">من <span className="gold-text">الخزانة</span></h2>
        <Link href="/vault" className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-gold">
          الكل <ArrowLeft size={12} />
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tops.map((t) => (
          <Link
            key={t.code}
            href={`/search?q=${encodeURIComponent(t.code)}`}
            className="font-mono-x rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-[11px] text-gold transition-all hover:scale-105 hover:bg-gold/15"
          >
            {t.code}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>(fallbackCards);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Phase 18: display root comes from /api/system, never hardcoded.
  const [rootPath, setRootPath] = useState('…');
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (data.cards) {
          setCards(data.cards.map((c: any) => ({
            key: c.codePrefix, label: c.label, codePrefix: c.codePrefix,
            icon: c.icon, description: c.description, count: c.count,
          })));
          setTotal(data.total || 0);
        }
      } catch { /* keep fallback */ }
      try {
        const res = await fetch('/api/system');
        const data = await res.json();
        if (data.arsenalRoot) setRootPath(data.arsenalRoot);
      } catch { /* keep placeholder */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24">
      {/* ============ CINEMATIC HERO ============ */}
      <section className="relative flex min-h-[86vh] flex-col items-center justify-center overflow-visible py-16 text-center">
        <div className="hero-grid absolute inset-0" />
        {/* orbiting glow */}
        <div className="anim-float pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-[100px]" />

        <div className="anim-fade-up relative mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-5 py-2 text-xs font-semibold text-gold shadow-[0_0_30px_rgba(212,175,55,0.15)]">
          <Crosshair size={14} className="animate-pulse" />
          النسخة الواحدة النهائية · نظام أكواد X المرجعي
          <span className="font-mono-x rounded bg-gold/15 px-2 py-0.5 text-[10px]">X-XXX-0000</span>
        </div>

        <h1 className="anim-fade-up-1 relative text-6xl font-black leading-[1.05] tracking-tight md:text-8xl">
          <span className="gold-text drop-shadow-[0_0_40px_rgba(212,175,55,0.25)]">Arsenal</span>{' '}
          <span className="text-white">X</span>
        </h1>

        <p className="anim-fade-up-2 relative mt-6 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
          ترسانة أصول NEXORA الكاملة — <span className="font-bold text-gold">كل ملف</span> في{' '}
          <span className="font-mono-x text-sm text-white/80">{rootPath}</span> حي أمامك،
          كل فئة بطريقة عرض مميزة، وكل عنصر له كود مرجعي قابل للنسخ.
        </p>

        <div className="anim-fade-up-3 relative mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#cats"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-[#e8c96a] via-gold to-[#9a7b1e] px-9 py-3.5 text-sm font-black text-black shadow-[0_10px_40px_rgba(212,175,55,0.35)] transition-transform hover:scale-105"
          >
            استعرض الترسانة
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </a>
          <Link
            href="/tools"
            className="glass inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-sm font-bold text-white/85 transition-all hover:border-gold/40 hover:text-gold"
          >
            <Wrench size={16} />
            مرجع أدواتي
          </Link>
        </div>

        {/* live counter */}
        <div className="anim-fade-up-4 relative mt-12">
          {loading ? (
            <div className="glass flex items-center gap-3 rounded-2xl px-8 py-5 text-muted">
              <Loader2 className="animate-spin text-gold" size={20} />
              <span className="text-sm">جاري فهرسة الترسانة حيًا من القرص…</span>
            </div>
          ) : (
            <div className="glass-gold flex items-center gap-8 rounded-2xl px-10 py-5">
              <div>
                <div className="gold-text text-5xl font-black tabular-nums md:text-6xl">
                  {total.toLocaleString('en-US')}
                </div>
                <div className="mt-1 text-xs tracking-widest text-muted">أصل حي في الترسانة</div>
              </div>
              <div className="h-14 w-px bg-gold/20" />
              <div>
                <div className="text-5xl font-black tabular-nums text-white md:text-6xl">{cards.length}</div>
                <div className="mt-1 text-xs tracking-widest text-muted">فئة بطريقة عرض مميزة</div>
              </div>
            </div>
          )}
        </div>

        <Filmstrip />
      </section>

      <ContinueStrip />
      <NewestStrip />
      <VaultTeaser />
      <DiscoverCTA />
      <CollectionsTeaser />

      {/* ============ HOW X-CODE WORKS ============ */}
      <section id="how" className="anim-fade-up mx-auto mb-20 max-w-5xl">
        <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-10">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-gold/10 blur-[80px]" />
          <div className="relative mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Layers size={20} />
            </span>
            <div>
              <h2 className="text-2xl font-black">كيف يعمل كود X؟</h2>
              <p className="text-xs text-muted">ثلاث خطوات فقط — من الترسانة إلى مشروعك</p>
            </div>
          </div>
          <div className="relative grid gap-4 md:grid-cols-3">
            {[
              { n: '1', t: 'اختر الفئة', d: 'ادخل لأي فئة من خريطة الكنز — كل فئة لها معاينة حية مخصصة' },
              { n: '2', t: 'ابحث واختر', d: 'ابحث بالكود X-IMG-0042 أو بالاسم وشاهد المعاينة الحية فورًا' },
              { n: '3', t: 'انسخ الكود', d: `اضغط على الكود لنسخه — ثم استخدم مساره من ${rootPath}` },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 transition-colors hover:border-gold/30">
                <span className="font-mono-x flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-sm font-bold text-gold">
                  {s.n}
                </span>
                <div className="mt-3 text-sm font-bold">{s.t}</div>
                <div className="mt-1 text-xs leading-6 text-muted">{s.d}</div>
              </div>
            ))}
          </div>
          <p className="font-mono-x relative mt-6 rounded-xl border border-gold/20 bg-black/40 p-4 text-center text-xs text-gold-soft" dir="ltr">
            X-IMG-0042 = item #42 in images · X-FNT-0007 = font #7 · X-VID-0110 = video #110
          </p>
        </div>
      </section>

      {/* ============ TREASURE MAP ============ */}
      <section id="cats">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-xs tracking-[0.3em] text-gold">
            <Film size={14} /> TREASURE MAP
          </div>
          <h2 className="text-4xl font-black md:text-5xl">خريطة <span className="gold-text">الكنز</span></h2>
          <p className="mt-3 text-sm text-muted">12 فئة — كل واحدة بطريقة عرض سينمائية مميزة</p>
        </div>
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = iconMap[c.icon] || Crosshair;
            const slug =
              c.key === 'AUD' ? 'music' :
              c.key === 'SFX' ? 'sfx' :
              c.key === '3D' ? 'models' :
              c.key === 'ICN' ? 'icons' :
              c.key === 'FNT' ? 'fonts' :
              c.key === 'IMG' ? 'images' :
              c.key === 'BG' ? 'backgrounds' :
              c.key === 'LUT' ? 'luts' :
              c.key === 'FX' ? 'fx' :
              c.key === 'VID' ? 'video' :
              c.key === 'TPL' ? 'templates' :
              c.key === 'ZIP' ? 'archives' : c.key.toLowerCase();
            const big = c.key === 'IMG' || c.key === 'VID';
            return (
              <Link
                key={c.key}
                href={`/${slug}`}
                className={`glass card-hover group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 ${big ? 'sm:col-span-2 lg:col-span-2' : ''}`}
              >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold/0 blur-2xl transition-all group-hover:bg-gold/15" />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/20 to-gold/5 text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                    <Icon size={24} />
                  </span>
                  <span className="font-mono-x inline-flex items-center gap-1 rounded-full border border-gold/20 bg-black/40 px-2.5 py-1 text-[10px] text-gold/70 transition-colors group-hover:border-gold/50 group-hover:text-gold">
                    <Copy size={10} /> X-{c.codePrefix}
                  </span>
                </div>
                <div className="relative">
                  <div className="text-lg font-black">{c.label}</div>
                  <div className="mt-1 text-xs text-muted">{c.description}</div>
                </div>
                <div className="relative mt-auto flex items-end justify-between">
                  <span className="font-mono-x text-xl font-bold tabular-nums text-gold">
                    {loading ? '…' : c.count < 0 ? '!' : c.count.toLocaleString('en-US')}
                    <span className="mr-1 text-[10px] font-normal text-muted">عنصر</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted transition-all group-hover:gap-2 group-hover:text-gold">
                    ادخل <ArrowLeft size={13} />
                  </span>
                </div>
              </Link>
            );
          })}

          {/* tools card */}
          <Link
            href="/tools"
            className="glass-gold card-hover group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5"
          >
            <div className="relative flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep text-black">
                <Wrench size={24} />
              </span>
              <span className="font-mono-x rounded-full border border-gold/30 bg-black/40 px-2.5 py-1 text-[10px] text-gold">REF</span>
            </div>
            <div className="relative">
              <div className="text-lg font-black">قدراتي وأدواتي</div>
              <div className="mt-1 text-xs text-muted">مرجع برامج المونتاج والبرمجة — مثبت / ناقص</div>
            </div>
            <div className="relative mt-auto inline-flex items-center gap-1 text-xs text-gold">
              افتح المرجع <ArrowLeft size={13} />
            </div>
          </Link>

          {/* vault card */}
          <Link
            href="/vault"
            className="glass-gold card-hover group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5"
          >
            <div className="relative flex items-center justify-between">
              <span className="gold-ring flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 text-gold">
                <Gem size={24} />
              </span>
              <span className="font-mono-x rounded-full border border-gold/30 bg-black/40 px-2.5 py-1 text-[10px] text-gold">TOP</span>
            </div>
            <div className="relative">
              <div className="text-lg font-black">الخزانة</div>
              <div className="mt-1 text-xs text-muted">أقوى الأصول في كل فئة — مختارة خوارزميًا</div>
            </div>
            <div className="relative mt-auto inline-flex items-center gap-1 text-xs text-gold">
              افتح الخزانة <ArrowLeft size={13} />
            </div>
          </Link>
        </div>
      </section>

      {/* ============ FOOTNOTE ============ */}
      <section className="mx-auto mt-20 max-w-3xl text-center">
        <div className="glass rounded-2xl px-8 py-6">
          <p className="text-xs leading-7 text-muted">
            أسماء عناصر الترسانة الأصلية محفوظة كما هي — كود X مرجع إضافي لا يغيّر أي اسم.
            المعاينات تُبث حيًا من <span className="font-mono-x text-gold-soft">{rootPath}</span> دون نسخ أو نقل.
          </p>
        </div>
      </section>
    </div>
  );
}
