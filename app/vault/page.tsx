'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Gem, Loader2, Info } from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AssetDrawer from '@/components/AssetDrawer';
import type { AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

interface Shelf {
  key: string; label: string; slug: string; items: (XCodeItem & { badges?: string[] })[];
}

interface Section {
  id: string; title: string; blurb: string;
  items: (XCodeItem & { slug: string; prefix: string; reasons?: string[] })[];
}

export default function VaultPage() {
  const [shelves, setShelves] = useState<Shelf[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [method, setMethod] = useState('');
  const [openRef, setOpenRef] = useState<AssetRef | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/vault');
        const json = await res.json();
        setShelves(json.shelves || []);
        setSections(json.sections || []);
        setMethod(json.method || '');
      } catch { setShelves([]); }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-l from-gold/[0.1] via-transparent to-transparent p-8 text-center md:p-12">
        <div className="hero-grid absolute inset-0" />
        <div className="relative">
          <span className="gold-ring mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 text-gold">
            <Gem size={26} />
          </span>
          <h1 className="text-4xl font-black md:text-6xl">الخزانة <span className="gold-text">THE VAULT</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
            أقوى الأصول في كل فئة — مختارة خوارزميًا من مخزونك الحقيقي، لا عشوائيًا.
          </p>
          {method && (
            <p className="font-mono-x mx-auto mt-5 max-w-2xl rounded-xl border border-gold/15 bg-black/40 p-3 text-[11px] leading-6 text-gold-soft">
              المنهجية: {method}
            </p>
          )}
        </div>
      </div>

      {!shelves ? (
        <div className="flex items-center justify-center gap-3 py-24 text-muted">
          <Loader2 className="animate-spin text-gold" size={26} />
          <span className="text-sm">جاري تقييم الترسانة…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((sec) => (
            <section key={sec.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Gem size={17} className="text-gold" /> {sec.title}
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted">{sec.blurb}</p>
              <div className="rail" dir="ltr">
                {sec.items.map((it) => (
                  <div key={it.code} dir="rtl">
                    <AssetCard item={it} slug={it.slug} onOpen={setOpenRef} badges={(it as any).reasons?.slice(0, 1)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {shelves.map((sh) => (
            <section key={sh.key}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Gem size={17} className="text-gold" /> أفضل {sh.label}
                </h2>
                <Link href={`/${sh.slug}`} className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-gold">
                  الفئة كاملة <ArrowRight size={12} className="rotate-180" />
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sh.items.map((it) => (
                  <AssetCard key={it.code} item={it} slug={sh.slug} onOpen={setOpenRef} badges={it.badges} />
                ))}
              </div>
            </section>
          ))}
          <div className="glass mx-auto flex max-w-xl items-start gap-3 rounded-2xl p-5 text-xs leading-7 text-muted">
            <Info size={16} className="mt-1 shrink-0 text-gold" />
            <span>الخزانة انعكاس حي لمخزونك: أضف أصولًا جديدة وستظهر هنا تلقائيًا إن استحقت — بلا أي أرقام مزيفة.</span>
          </div>
        </div>
      )}
      {openRef && (
        <AssetDrawer asset={openRef} onClose={() => setOpenRef(null)} onSelect={setOpenRef} />
      )}
    </div>
  );
}
