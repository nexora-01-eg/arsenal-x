'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Heart, FolderOpen, Briefcase, History, Bookmark,
  Plus, Trash2, Loader2, X, Search as SearchIcon,
} from 'lucide-react';
import AssetCard from '@/components/AssetCard';
import AssetDrawer from '@/components/AssetDrawer';
import { useWorkspace, type AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

type Tab = 'fav' | 'cols' | 'projs' | 'recent' | 'searches';

interface Resolved {
  ref: AssetRef;
  ok: boolean;
  item?: XCodeItem;
  slug?: string;
}

// يحوّل المراجع إلى عناصر حية + يعلّم المفقود بدل حذفه
function useResolved(refs: AssetRef[]) {
  const [out, setOut] = useState<Resolved[] | null>(null);
  useEffect(() => {
    let alive = true;
    setOut(null);
    if (!refs.length) { setOut([]); return; }
    (async () => {
      const res = await Promise.all(refs.map(async (r) => {
        try {
          const q = await fetch(`/api/resolve?code=${encodeURIComponent(r.code)}`);
          const j = await q.json();
          return j.found
            ? { ref: r, ok: true, item: j.item, slug: j.slug }
            : { ref: r, ok: false };
        } catch {
          return { ref: r, ok: false };
        }
      }));
      if (alive) setOut(res);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(refs.map((r) => r.code))]);
  return out;
}

function RefGrid({ refs, onOpen, onRemove }: {
  refs: AssetRef[];
  onOpen: (r: AssetRef) => void;
  onRemove?: (code: string) => void;
}) {
  const resolved = useResolved(refs);
  if (resolved === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted">
        <Loader2 className="animate-spin text-gold" size={20} />
        <span className="text-xs">جاري التحقق من المراجع…</span>
      </div>
    );
  }
  if (!resolved.length) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-sm font-bold">فارغ هنا</p>
        <p className="mt-2 text-xs text-muted">افتح أي أصل واضغط ♥ أو أضفه لمجموعة/مشروع من الدرج</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {resolved.map((r) => r.ok && r.item ? (
        <div key={r.ref.code} className="relative">
          <AssetCard item={r.item} slug={r.slug!} onOpen={onOpen} />
          {onRemove && (
            <button
              onClick={() => onRemove(r.ref.code)}
              title="إزالة"
              className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/70 p-1.5 text-muted transition-colors hover:border-red-400/50 hover:text-red-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <div key={r.ref.code} className="flex items-center justify-between rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
          <div>
            <span className="font-mono-x text-xs text-red-300">{r.ref.code}</span>
            <p className="mt-1 text-[11px] text-muted">غير متاح حاليًا (اختفى من القرص) — المرجع محفوظ</p>
          </div>
          {onRemove && (
            <button onClick={() => onRemove(r.ref.code)} className="text-[11px] text-muted transition-colors hover:text-red-300">
              إزالة
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WorkspacePage() {
  const ws = useWorkspace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('fav');
  const [openRef, setOpenRef] = useState<AssetRef | null>(null);
  const [newName, setNewName] = useState('');
  const [openCol, setOpenCol] = useState<string | null>(null);
  const [openProj, setOpenProj] = useState<string | null>(null);
  const [dropOver, setDropOver] = useState<string | null>(null);

  const parseDrop = (e: React.DragEvent): AssetRef | null => {
    try {
      const raw = e.dataTransfer.getData('application/x-arsenal-asset');
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && p.code && p.slug) return { code: p.code, slug: p.slug };
    } catch { /* ignore */ }
    return null;
  };

  if (!ws.ready) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-muted">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'fav', label: 'المفضلة', icon: <Heart size={15} />, count: ws.store.favorites.length },
    { id: 'cols', label: 'المجموعات', icon: <FolderOpen size={15} />, count: ws.store.collections.length },
    { id: 'projs', label: 'المشاريع', icon: <Briefcase size={15} />, count: ws.store.projects.length },
    { id: 'recent', label: 'شوهدت مؤخرًا', icon: <History size={15} />, count: ws.store.recent.length },
    { id: 'searches', label: 'بحث محفوظ', icon: <Bookmark size={15} />, count: ws.store.savedSearches.length },
  ];

  const col = ws.store.collections.find((c) => c.id === openCol);
  const proj = ws.store.projects.find((p) => p.id === openProj);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black md:text-5xl">مساحة <span className="gold-text">عملي</span></h1>
        <p className="mt-3 text-sm text-muted">مراجع خفيفة لأصولك — بلا نسخ ملفات، تنجو من إعادة الفهرسة</p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
              tab === t.id ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'
            }`}
          >
            {t.icon} {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="font-mono-x rounded-full bg-black/40 px-2 py-0.5 text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'fav' && (
        <RefGrid
          refs={ws.store.favorites}
          onOpen={setOpenRef}
          onRemove={(code) => ws.toggleFavorite({ code, slug: '' })}
        />
      )}

      {tab === 'cols' && !col && (
        <div className="flex flex-col gap-4">
          <div className="glass flex items-center gap-2 rounded-2xl p-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { ws.createCollection(newName); setNewName(''); } }}
              placeholder="اسم المجموعة الجديدة… (NEXORA، Luxury Assets…)"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={() => { if (newName.trim()) { ws.createCollection(newName); setNewName(''); } }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#e8c96a] to-gold px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              <Plus size={15} /> أنشئ
            </button>
          </div>
          {ws.store.collections.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-muted">لا مجموعات بعد — أنشئ رفك الإبداعي الأول</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ws.store.collections.map((c) => (
              <div
                key={c.id}
                onDragOver={(e) => { e.preventDefault(); setDropOver(c.id); }}
                onDragLeave={() => setDropOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropOver(null);
                  const ref = parseDrop(e);
                  if (ref) ws.addToCollection(c.id, ref);
                }}
                className={`glass card-hover rounded-2xl p-5 transition-all ${dropOver === c.id ? 'border-gold/60 bg-gold/10' : ''}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-base font-black">{c.name}</span>
                  <button onClick={() => ws.deleteCollection(c.id)} title="حذف المجموعة" className="text-muted transition-colors hover:text-red-300">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="font-mono-x mb-4 text-[11px] text-gold">{c.items.length} عنصر</p>
                <button
                  onClick={() => setOpenCol(c.id)}
                  className="w-full rounded-xl border border-gold/25 bg-gold/5 py-2 text-xs text-gold transition-colors hover:bg-gold/15"
                >
                  افتح المجموعة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'cols' && col && (
        <div>
          <button onClick={() => setOpenCol(null)} className="mb-5 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
            <ArrowRight size={14} /> كل المجموعات
          </button>
          <h2 className="mb-5 text-2xl font-black">{col.name} <span className="font-mono-x text-xs font-normal text-gold">{col.items.length}</span></h2>
          <RefGrid refs={col.items} onOpen={setOpenRef} onRemove={(code) => ws.removeFromCollection(col.id, code)} />
        </div>
      )}

      {tab === 'projs' && !proj && (
        <div className="flex flex-col gap-4">
          <div className="glass flex items-center gap-2 rounded-2xl p-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { ws.createProject(newName); setNewName(''); } }}
              placeholder="اسم المشروع الجديد… (NEXORA BRAND FILM…)"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={() => { if (newName.trim()) { ws.createProject(newName); setNewName(''); } }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#e8c96a] to-gold px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              <Plus size={15} /> أنشئ
            </button>
          </div>
          {ws.store.projects.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-muted">لا مشاريع بعد — ابدأ مساحة إنتاجك الأولى</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {ws.store.projects.map((p) => {
              const sections = [...new Set(p.items.map((i) => i.section))];
              return (
                <div
                  key={p.id}
                  onDragOver={(e) => { e.preventDefault(); setDropOver(p.id); }}
                  onDragLeave={() => setDropOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropOver(null);
                    const ref = parseDrop(e);
                    if (ref) ws.addToProject(p.id, ref, 'عام');
                  }}
                  className={`glass card-hover rounded-2xl p-5 transition-all ${dropOver === p.id ? 'border-gold/60 bg-gold/10' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-base font-black">{p.name}</span>
                    <button onClick={() => ws.deleteProject(p.id)} title="حذف المشروع" className="text-muted transition-colors hover:text-red-300">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="font-mono-x mb-1 text-[11px] text-gold">{p.items.length} عنصر</p>
                  {sections.length > 0 && <p className="mb-4 text-[11px] text-muted">الأقسام: {sections.join(' · ')}</p>}
                  <button
                    onClick={() => setOpenProj(p.id)}
                    className="w-full rounded-xl border border-gold/25 bg-gold/5 py-2 text-xs text-gold transition-colors hover:bg-gold/15"
                  >
                    افتح المشروع
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'projs' && proj && (
        <div>
          <button onClick={() => setOpenProj(null)} className="mb-5 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
            <ArrowRight size={14} /> كل المشاريع
          </button>
          <h2 className="mb-5 text-2xl font-black">{proj.name} <span className="font-mono-x text-xs font-normal text-gold">{proj.items.length}</span></h2>
          {(() => {
            const bySec = new Map<string, typeof proj.items>();
            for (const it of proj.items) {
              if (!bySec.has(it.section)) bySec.set(it.section, []);
              bySec.get(it.section)!.push(it);
            }
            return [...bySec.entries()].map(([sec, items]) => (
              <div key={sec} className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-gold">
                  <span className="h-px w-6 bg-gold/40" /> {sec} <span className="font-mono-x text-[10px] font-normal text-muted">{items.length}</span>
                </h3>
                <RefGrid refs={items} onOpen={setOpenRef} onRemove={(code) => ws.removeFromProject(proj.id, code)} />
              </div>
            ));
          })()}
          {proj.items.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-muted">أضف أصولًا من درج أي أصل (زر الحقيبة)</div>
          )}
        </div>
      )}

      {tab === 'recent' && (
        <div className="flex flex-col gap-4">
          {ws.store.recent.length > 0 && (
            <button onClick={ws.clearRecent} className="self-center text-xs text-muted transition-colors hover:text-red-300">
              مسح السجل
            </button>
          )}
          <RefGrid refs={ws.store.recent} onOpen={setOpenRef} />
        </div>
      )}

      {tab === 'searches' && (
        <div className="flex flex-col gap-3">
          {ws.store.savedSearches.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-sm text-muted">لا عمليات محفوظة — ابحث ثم احفظ بحثك من صفحة البحث</div>
          )}
          {ws.store.savedSearches.map((s) => (
            <div key={s} className="glass flex items-center justify-between rounded-2xl p-4">
              <button
                onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
                className="inline-flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-bold transition-colors hover:text-gold"
              >
                <SearchIcon size={15} className="shrink-0 text-gold" />
                <span className="truncate">{s}</span>
              </button>
              <button onClick={() => ws.removeSearch(s)} title="إزالة" className="shrink-0 text-muted transition-colors hover:text-red-300">
                <X size={14} />
              </button>
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
