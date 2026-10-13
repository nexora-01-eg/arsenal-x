'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, ArrowRight, Sparkles, BookmarkPlus, Check } from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AssetDrawer from '@/components/AssetDrawer';
import { useWorkspace, type AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

interface Group {
  key: string; label: string; slug: string; count: number; items: XCodeItem[];
}

const IDEAS = ['gold', 'lottie', 'Inter', 'X-IMG', 'cinematic', 'glb', 'svg', 'texture'];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center gap-3 py-32 text-muted"><Loader2 className="animate-spin text-gold" size={24} /></div>}>
      <SearchBody />
    </Suspense>
  );
}

function SearchBody() {
  const params = useSearchParams();
  const initial = params.get('q') || '';
  const [q, setQ] = useState(initial);
  const [deb, setDeb] = useState(initial.trim());
  const [data, setData] = useState<{ total: number; groups: Group[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [openRef, setOpenRef] = useState<AssetRef | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveSearch } = useWorkspace();

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDeb(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // "/" focuses search
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  useEffect(() => {
    if (deb.length < 2) { setData(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(deb)}`);
        const json = await res.json();
        if (alive) setData(json);
      } catch { if (alive) setData({ total: 0, groups: [] }); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [deb]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5 text-xs text-gold">
          <Sparkles size={13} /> بحث واحد — الترسانة كلها
        </span>
        <h1 className="text-4xl font-black md:text-5xl">
          ابحث <span className="gold-text">بذكاء</span>
        </h1>
        <p className="mt-3 text-sm text-muted">بالكود أو الاسم أو الصيغة أو المصدر — عبر 38 ألف أصل في 12 فئة</p>
      </div>

      <div className="glass sticky top-[68px] z-20 rounded-2xl p-3">
        <div className="relative">
          <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جرّب: gold · lottie · X-IMG-0042 · glb · cinematic …  ( / للتركيز )"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-black/40 py-4 pl-4 pr-14 text-base focus:border-gold/50 focus:outline-none"
          />
        </div>
        {!deb && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-2 pb-2 pt-3">
            {IDEAS.map((w) => (
              <button
                key={w}
                onClick={() => setQ(w)}
                className="font-mono-x rounded-full border border-white/10 px-3 py-1 text-[11px] text-muted transition-all hover:border-gold/40 hover:text-gold"
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted">
            <Loader2 className="animate-spin text-gold" size={24} />
            <span className="text-sm">جاري البحث في الترسانة…</span>
          </div>
        )}
        {!loading && data && (
          <>
            <p className="mb-6 flex items-center justify-center gap-3 text-center text-sm text-muted">
              <span>
                <span className="font-mono-x text-xl font-bold text-gold">{data.total.toLocaleString('en-US')}</span> نتيجة
                لـ <span className="text-white">«{deb}»</span>
              </span>
              <button
                onClick={() => { saveSearch(deb); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
                title="حفظ هذا البحث"
                className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/20"
              >
                {saved ? <Check size={12} /> : <BookmarkPlus size={12} />}
                {saved ? 'حُفظ' : 'حفظ البحث'}
              </button>
            </p>
            {data.groups.length === 0 && (
              <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
                <p className="font-bold">لا نتائج مطابقة</p>
                <p className="mt-2 text-xs leading-6 text-muted">جرّب كلمة أقصر، أو كود X مباشر، أو صيغة ملف مثل mp4 و svg</p>
              </div>
            )}
            <div className="flex flex-col gap-8">
              {data.groups.map((g) => (
                <section key={g.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-black">
                      {g.label} <span className="font-mono-x text-xs font-normal text-gold">X-{g.key} · {g.count.toLocaleString('en-US')}</span>
                    </h2>
                    <Link href={`/${g.slug}`} className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-gold">
                      عرض الكل <ArrowRight size={12} className="rotate-180" />
                    </Link>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {g.items.map((it) => (
                      <AssetCard key={it.code} item={it} slug={g.slug} onOpen={setOpenRef} />
                    ))}
                  </div>
                  {g.count > g.items.length && (
                    <p className="mt-2 text-center text-[11px] text-muted">
                      +{(g.count - g.items.length).toLocaleString('en-US')} نتيجة أخرى في <Link href={`/${g.slug}`} className="text-gold hover:underline">الفئة</Link>
                    </p>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      {openRef && (
        <AssetDrawer asset={openRef} onClose={() => setOpenRef(null)} onSelect={setOpenRef} />
      )}
    </div>
  );
}
