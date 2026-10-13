'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Loader2, Play } from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AssetDrawer from '@/components/AssetDrawer';
import AudioPlayer from '@/components/AudioPlayer';
import { fileUrl } from '@/components/GalleryGrid';
import type { AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

interface Section {
  id: string; title: string; total: number;
  items: { item: XCodeItem; slug: string; key: string }[];
}

const PRESETS = ['dark luxury', 'cinematic technology', 'Arabic premium branding', 'minimal restaurant', 'medical corporate', 'fashion editorial', 'gold'];

export default function DiscoverPage() {
  const [intent, setIntent] = useState('');
  const [deb, setDeb] = useState('');
  const [data, setData] = useState<{ total: number; sections: Section[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [openRef, setOpenRef] = useState<AssetRef | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDeb(intent.trim()), 450);
    return () => clearTimeout(t);
  }, [intent]);

  useEffect(() => {
    if (deb.length < 2) { setData(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/discover?intent=${encodeURIComponent(deb)}`);
        const json = await res.json();
        if (alive) setData(json);
      } catch { if (alive) setData({ total: 0, sections: [] }); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [deb]);

  const renderSection = (sec: Section) => {
    if (sec.id === 'visuals') {
      return (
        <div className="masonry">
          {sec.items.map(({ item, slug }) => (
            <div key={item.code} className="glass card-hover group cursor-pointer overflow-hidden rounded-2xl" onClick={() => setOpenRef({ code: item.code, slug })}>
              {['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.ext) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(item.relPath)} alt={item.name} loading="lazy" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-28 items-center justify-center bg-black/40 font-mono text-xs uppercase text-gold/70">.{item.ext}</div>
              )}
              <div className="p-2.5 text-[11px]">
                <span className="font-mono-x text-gold">{item.code}</span>
                <span className="mr-2 truncate text-muted">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (sec.id === 'type') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {sec.items.slice(0, 6).map(({ item, slug }) => (
            <TypeRow key={item.code} item={item} slug={slug} onOpen={() => setOpenRef({ code: item.code, slug })} />
          ))}
        </div>
      );
    }
    if (sec.id === 'sound') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {sec.items.slice(0, 4).map(({ item, slug }) => (
            <div key={item.code} className="glass rounded-2xl p-3">
              <button onClick={() => setOpenRef({ code: item.code, slug })} className="mb-2 flex w-full items-center justify-between gap-2 text-right">
                <span className="font-mono-x text-[11px] text-gold">{item.code}</span>
                <span className="truncate text-xs text-white/75">{item.name}</span>
              </button>
              <AudioPlayer src={fileUrl(item.relPath)} />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {sec.items.map(({ item, slug }) => (
          <AssetCard key={item.code} item={item} slug={slug} onOpen={setOpenRef} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5 text-xs text-gold">
          <Compass size={13} /> اتجاه إبداعي — لا مجرد نتائج
        </span>
        <h1 className="text-4xl font-black md:text-5xl">اكتشف <span className="gold-text">بنية</span></h1>
        <p className="mt-3 text-sm text-muted">صِف الفكرة — والترسانة تقترح البصريات والخطوط والموشن والصوت معًا</p>
      </div>

      <div className="glass sticky top-[68px] z-20 rounded-2xl p-3">
        <div className="relative">
          <Compass size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" />
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="dark luxury · Arabic premium branding · minimal restaurant …"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-4 pl-4 pr-14 text-base focus:border-gold/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 px-2 pb-2 pt-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setIntent(p)}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-muted transition-all hover:border-gold/40 hover:text-gold"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted">
            <Loader2 className="animate-spin text-gold" size={24} />
            <span className="text-sm">جاري تأليف الاتجاه الإبداعي…</span>
          </div>
        )}
        {!loading && data && (
          <>
            <p className="mb-8 text-center text-sm text-muted">
              <span className="font-mono-x text-xl font-bold text-gold">{data.total.toLocaleString('en-US')}</span> أصل
              لـ <span className="text-white">«{deb}»</span>
            </p>
            {data.sections.length === 0 && (
              <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
                <p className="font-bold">لا اتجاه واضح</p>
                <p className="mt-2 text-xs text-muted">جرّب كلمات مثل: فاخر، سينمائي، داكن، عربي، مطعم</p>
              </div>
            )}
            <div className="flex flex-col gap-10">
              {data.sections.map((sec) => (
                <section key={sec.id}>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="text-xl font-black">{sec.title}</h2>
                    <span className="font-mono-x text-xs text-gold">{sec.total.toLocaleString('en-US')}</span>
                  </div>
                  {renderSection(sec)}
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

function TypeRow({ item, slug, onOpen }: { item: XCodeItem; slug: string; onOpen: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const fam = 'DiscoverFont' + item.code.replace(/[^A-Za-z0-9]/g, '');
    try {
      const st = document.createElement('style');
      st.textContent = `@font-face{font-family:'${fam}';src:url('${fileUrl(item.relPath)}');font-display:swap;}`;
      document.head.appendChild(st);
      setReady(true);
      return () => { document.head.removeChild(st); };
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.code]);
  return (
    <button onClick={onOpen} className="glass card-hover overflow-hidden rounded-2xl p-4 text-center">
      <div className="mb-1 font-mono-x text-[10px] text-gold">{item.code}</div>
      <div className="truncate text-xl leading-relaxed" style={ready ? { fontFamily: `'DiscoverFont${item.code.replace(/[^A-Za-z0-9]/g, '')}'` } : undefined}>
        {ready ? 'ترسانة NEXORA الذهبية ABC 123' : <Play size={16} className="mx-auto animate-pulse text-muted" />}
      </div>
    </button>
  );
}
