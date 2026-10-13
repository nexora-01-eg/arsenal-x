'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AssetDrawer from '@/components/AssetDrawer';
import type { AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

interface SmartCol {
  id: string; title: string; blurb: string; query: string; total: number;
  groups: { key: string; label: string; slug: string; count: number }[];
  sample: { item: XCodeItem; slug: string }[];
}

export default function CollectionsPage() {
  const [cols, setCols] = useState<SmartCol[] | null>(null);
  const [openRef, setOpenRef] = useState<AssetRef | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/collections');
        const json = await res.json();
        setCols(json.collections || []);
      } catch { setCols([]); }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-10 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5 text-xs text-gold">
          <Layers size={13} /> مولّدة حيًا من مخزونك
        </span>
        <h1 className="text-4xl font-black md:text-5xl">مجموعات <span className="gold-text">ذكية</span></h1>
        <p className="mt-3 text-sm text-muted">حالات استخدام حقيقية — لا تظهر مجموعة إلا بوجود ≥10 عناصر فعلية خلفها</p>
      </div>

      {!cols ? (
        <div className="flex items-center justify-center gap-3 py-24 text-muted">
          <Loader2 className="animate-spin text-gold" size={26} />
          <span className="text-sm">جاري توليد المجموعات من الترسانة…</span>
        </div>
      ) : cols.length === 0 ? (
        <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
          <p className="font-bold">لا مجموعات كافية بعد</p>
          <p className="mt-2 text-xs text-muted">أضف أصولًا وستتولد المجموعات تلقائيًا</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {cols.map((c) => (
            <div key={c.id} className="glass card-hover overflow-hidden rounded-3xl p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-xl font-black">{c.title}</h2>
                <span className="font-mono-x rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] text-gold">
                  {c.total.toLocaleString('en-US')}
                </span>
              </div>
              <p className="mb-2 text-xs text-muted">{c.blurb}</p>
              <p className="mb-4 text-[11px] text-muted">
                {c.groups.map((g) => `${g.label} ${g.count.toLocaleString('en-US')}`).join(' · ')}
              </p>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {c.sample.map((s) => (
                  <button
                    key={s.item.code}
                    onClick={() => setOpenRef({ code: s.item.code, slug: s.slug })}
                    className="relative h-20 overflow-hidden rounded-xl bg-black/50 transition-transform hover:scale-[1.03]"
                    title={s.item.name}
                  >
                    {['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(s.item.ext) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/file?path=${encodeURIComponent(s.item.relPath).replace(/%2F/g, '/')}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-mono-x flex h-full w-full items-center justify-center text-[10px] uppercase text-gold/80">
                        .{s.item.ext}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/search?q=${encodeURIComponent(c.query.split(' ')[0])}`}
                  className="flex-1 rounded-xl bg-gradient-to-l from-[#e8c96a] to-gold py-2.5 text-center text-xs font-black text-black transition-transform hover:scale-[1.02]"
                >
                  افتح كمجموعة بحث
                </Link>
                <Link
                  href="/workspace"
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70 transition-colors hover:border-gold/40 hover:text-gold"
                >
                  مساحتي
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {openRef && (
        <AssetDrawer asset={openRef} onClose={() => setOpenRef(null)} onSelect={setOpenRef} />
      )}
    </div>
  );
}
