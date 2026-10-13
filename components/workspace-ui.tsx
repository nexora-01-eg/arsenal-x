'use client';

import { useState } from 'react';
import { Heart, FolderPlus, Check, Plus, Briefcase } from 'lucide-react';
import { useWorkspace, type AssetRef } from '@/lib/workspace';

export function FavoriteToggle({ asset, size = 16 }: { asset: AssetRef; size?: number }) {
  const { toggleFavorite, isFavorite } = useWorkspace();
  const on = isFavorite(asset.code);
  return (
    <button
      onClick={() => toggleFavorite(asset)}
      title={on ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
      className={`inline-flex items-center justify-center rounded-full border p-2 transition-all ${
        on
          ? 'border-gold/60 bg-gold/20 text-gold'
          : 'border-white/10 text-muted hover:border-gold/40 hover:text-gold'
      }`}
    >
      <Heart size={size} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

export function AddToCollection({ asset }: { asset: AssetRef }) {
  const { store, createCollection, addToCollection } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [done, setDone] = useState('');

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setDone(''); }}
        title="أضف لمجموعة"
        className="inline-flex items-center justify-center rounded-full border border-white/10 p-2 text-muted transition-all hover:border-gold/40 hover:text-gold"
      >
        <FolderPlus size={16} />
      </button>
      {open && (
        <div className="glass absolute bottom-11 left-0 z-30 w-56 overflow-hidden rounded-2xl p-2">
          <p className="px-2 py-1 text-[11px] text-muted">أضف إلى مجموعة</p>
          <div className="max-h-40 overflow-y-auto">
            {store.collections.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-muted">لا مجموعات بعد — أنشئ واحدة</p>
            )}
            {store.collections.map((c) => {
              const has = c.items.some((i) => i.code === asset.code);
              return (
                <button
                  key={c.id}
                  onClick={() => { if (!has) { addToCollection(c.id, asset); setDone(c.name); } }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-gold/10"
                >
                  <span className="truncate">{c.name}</span>
                  {has ? <Check size={13} className="shrink-0 text-emerald-300" /> : <Plus size={13} className="shrink-0 text-muted" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 border-t border-white/10 p-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { createCollection(name); setName(''); } }}
              placeholder="مجموعة جديدة…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={() => { if (name.trim()) { createCollection(name); setName(''); } }}
              className="rounded-lg bg-gold/15 px-2.5 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/25"
            >
              أنشئ
            </button>
          </div>
          {done && <p className="px-2 py-1 text-[11px] text-emerald-300">أُضيف إلى {done} ✓</p>}
        </div>
      )}
    </div>
  );
}

export function AddToProject({ asset }: { asset: AssetRef }) {
  const { store, createProject, addToProject } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [done, setDone] = useState('');

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setDone(''); }}
        title="أضف لمشروع"
        className="inline-flex items-center justify-center rounded-full border border-white/10 p-2 text-muted transition-all hover:border-gold/40 hover:text-gold"
      >
        <Briefcase size={16} />
      </button>
      {open && (
        <div className="glass absolute bottom-11 left-0 z-30 w-60 overflow-hidden rounded-2xl p-2">
          <p className="px-2 py-1 text-[11px] text-muted">أضف إلى مشروع</p>
          <div className="max-h-36 overflow-y-auto">
            {store.projects.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-muted">لا مشاريع بعد — أنشئ واحدًا</p>
            )}
            {store.projects.map((p) => {
              const has = p.items.some((i) => i.code === asset.code);
              return (
                <button
                  key={p.id}
                  onClick={() => { if (!has) { addToProject(p.id, asset, section.trim() || 'عام'); setDone(p.name); } }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-gold/10"
                >
                  <span className="truncate">{p.name}</span>
                  {has ? <Check size={13} className="shrink-0 text-emerald-300" /> : <Plus size={13} className="shrink-0 text-muted" />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-white/10 p-1.5">
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="القسم (عام، صور، موسيقى…)"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] focus:border-gold/40 focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { createProject(name); setName(''); } }}
                placeholder="مشروع جديد…"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] focus:border-gold/40 focus:outline-none"
              />
              <button
                onClick={() => { if (name.trim()) { createProject(name); setName(''); } }}
                className="rounded-lg bg-gold/15 px-2.5 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/25"
              >
                أنشئ
              </button>
            </div>
          </div>
          {done && <p className="px-2 py-1 text-[11px] text-emerald-300">أُضيف إلى {done} ✓</p>}
        </div>
      )}
    </div>
  );
}
