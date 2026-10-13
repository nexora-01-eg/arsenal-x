'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Play, Pause, Type as TypeIcon, Download, ExternalLink, FileArchive, Rotate3D } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { useFontLab } from './FontLab';
import CopyChip from './CopyChip';
import type { XCodeItem } from '@/lib/indexer';

const ITEMS_PER_PAGE = 48;

export function fileUrl(relPath: string) {
  return `/api/file?path=${encodeURIComponent(relPath).replace(/%2F/g, '/')}`;
}

function formatSize(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

/* ================= FONTS — family-grouped view (4098 files → 122 families) ================= */
function familyOf(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[_-]\d+pt/g, '')
    .replace(/regular|bold|italic|light|medium|black|thin|extralight|extrabold|semibold|demibold|heavy|condensed|extended|oblique|book|demi|ultra|hairline|variable|normal|roman|weight/g, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return base || name.toLowerCase();
}

function styleOf(name: string): string {
  const m = name.replace(/\.[^.]+$/, '').match(/(\d+pt|extra\s?bold|extra\s?light|semi\s?bold|demi\s?bold|bold|italic|light|medium|black|thin|heavy|condensed|extended|oblique|book|hairline|variable|regular)/gi);
  return m ? m.join(' · ') : 'Regular';
}

function prettyFam(f: string): string {
  return f.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const FAMS_PER_PAGE = 40;

function FontsView({ items }: { items: XCodeItem[] }) {
  const lab = useFontLab();
  const { text } = lab;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [compare, setCompare] = useState<string[]>([]);
  const faceIndex = useRef<Map<string, number>>(new Map());

  const toggleCompare = (fam: string) => {
    setCompare((c) => (c.includes(fam) ? c.filter((f) => f !== fam) : c.length >= 4 ? c : [...c, fam]));
  };

  const fams = useMemo(() => {
    const map = new Map<string, XCodeItem[]>();
    for (const it of items) {
      const f = familyOf(it.name);
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(it);
    }
    return [...map.entries()]
      .map(([fam, members]) => ({ fam, members }))
      .sort((a, b) => b.members.length - a.members.length || (a.fam < b.fam ? -1 : 1));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fams;
    return fams.filter(({ fam, members }) =>
      fam.includes(q) ||
      members.some((m) =>
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.relPath.toLowerCase().includes(q)
      )
    );
  }, [fams, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / FAMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * FAMS_PER_PAGE, (safePage + 1) * FAMS_PER_PAGE);

  // auto-expand families when searching by code
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (/x-fnt-\d+/i.test(q)) {
      const hit: Record<string, boolean> = {};
      for (const { fam, members } of filtered) {
        if (members.some((m) => m.code.toLowerCase().includes(q))) hit[fam] = true;
      }
      if (Object.keys(hit).length) setOpen((o) => ({ ...o, ...hit }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const css = useMemo(() => {
    const extra = compare
      .map((f) => fams.find((g) => g.fam === f))
      .filter(Boolean)
      .filter((g) => !paged.some((p) => p.fam === g!.fam)) as { fam: string; members: XCodeItem[] }[];
    const all = [...paged, ...extra];
    faceIndex.current = new Map(all.map((g, i) => [g.fam, i]));
    return all.map((g, i) => {
      const first = g.members[0];
      return `@font-face{font-family:'XFF${i}';src:url('${fileUrl(first.relPath)}');font-display:swap;}`;
    }).join('\n');
  }, [paged, compare, fams]);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass sticky top-[68px] z-20 flex flex-col gap-3 rounded-2xl p-4">
        {lab.controls}
        <div className="relative">
          <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="ابحث عن عائلة (inter…) أو كود (X-FNT-1234)…"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-4 pr-11 text-sm focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="text-center text-xs text-muted">
        <span className="font-mono-x text-base font-bold text-gold">{fams.length}</span> عائلة ·
        <span className="font-mono-x text-gold"> {items.length.toLocaleString('en-US')}</span> ملف
      </div>

      <style>{css}</style>
      {compare.length > 0 && (
        <div className="glass-gold rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black">مقارنة العائلات ({compare.length}/4)</span>
            <button onClick={() => setCompare([])} className="text-[11px] text-muted transition-colors hover:text-red-300">
              مسح المقارنة
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {compare.map((f) => {
              const fi = faceIndex.current.get(f) ?? 0;
              return (
                <div key={f} className={`rounded-xl border border-gold/20 px-4 py-4 ${lab.dark ? 'bg-black/40' : 'bg-white text-black'}`}>
                  <div className="mb-1 text-[11px] font-bold text-gold">{prettyFam(f)}</div>
                  <div className="overflow-hidden" style={{ fontFamily: `XFF${fi}`, ...lab.style }}>
                    {text || prettyFam(f)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {paged.map((g, i) => {
          const exts = [...new Set(g.members.map((m) => m.ext))].join(' · ');
          const isOpen = !!open[g.fam];
          const inCompare = compare.includes(g.fam);
          const fi = faceIndex.current.get(g.fam) ?? i;
          return (
            <div key={g.fam} className="glass card-hover overflow-hidden rounded-2xl">
              <div
                className={`flex min-h-[104px] cursor-pointer items-center justify-center overflow-hidden px-6 py-6 text-center ${lab.dark ? 'bg-black/50' : 'bg-white text-black'}`}
                style={{ fontFamily: `XFF${fi}`, ...lab.style }}
                onClick={() => setOpen((o) => ({ ...o, [g.fam]: !o[g.fam] }))}
                title="اضغط لعرض الأوزان"
              >
                {text || prettyFam(g.fam)}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-black">{prettyFam(g.fam)}</span>
                  <span className="font-mono-x text-[10px] text-muted">{g.members.length} ملف · {exts}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyChip code={g.members[0].code} />
                  <button
                    onClick={() => toggleCompare(g.fam)}
                    title={inCompare ? 'إزالة من المقارنة' : 'أضف للمقارنة (حتى 4)'}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${inCompare ? 'border-gold/60 bg-gold/20 text-gold' : 'border-white/10 text-muted hover:border-gold/40 hover:text-gold'}`}
                  >
                    {inCompare ? '✓ يقارن' : 'قارن'}
                  </button>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [g.fam]: !o[g.fam] }))}
                    className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] text-gold transition-colors hover:bg-gold/20"
                  >
                    {isOpen ? 'إخفاء' : `الأوزان (${g.members.length})`}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="max-h-64 overflow-y-auto border-t border-white/[0.06] bg-black/30">
                  {g.members.map((m) => (
                    <div key={m.code} className="flex items-center justify-between gap-2 border-b border-white/[0.04] px-4 py-2 last:border-0">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-white/75" title={m.name}>
                        {styleOf(m.name)} <span className="text-muted">· .{m.ext} · {formatSize(m.size)}</span>
                      </span>
                      <CopyChip code={m.code} />
                      <a href={fileUrl(m.relPath)} download className="text-muted transition-colors hover:text-gold" title="تحميل">
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="glass rounded-xl px-5 py-2.5 text-sm transition-all hover:border-gold/40 disabled:opacity-30"
          >
            السابق
          </button>
          <span className="font-mono-x text-sm text-muted">{safePage + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="glass rounded-xl px-5 py-2.5 text-sm transition-all hover:border-gold/40 disabled:opacity-30"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= AUDIO — music & sfx player cards ================= */
function AudioView({ items, wave }: { items: XCodeItem[]; wave: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => (
        <div key={it.code} className="glass card-hover relative overflow-hidden rounded-2xl p-4">
          <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
          <div className="relative mb-3 flex items-center justify-between gap-2">
            <CopyChip code={it.code} />
            <span className="text-[10px] text-muted">{formatSize(it.size)}</span>
          </div>
          <p className="relative mb-3 truncate text-sm font-bold" title={it.name}>{it.name}</p>
          {/* fake wave bars */}
          <div className="relative mb-3 flex h-10 items-end justify-center gap-[3px]" dir="ltr">
            {Array.from({ length: wave ? 42 : 26 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-gradient-to-t from-gold-deep via-gold to-gold-soft opacity-70"
                style={{ height: `${18 + Math.abs(Math.sin(i * 1.7 + it.code.length)) * 82}%` }}
              />
            ))}
          </div>
          <AudioPlayer src={fileUrl(it.relPath)} />
          <p className="relative mt-2 truncate text-[10px] text-muted" title={it.relPath}>{it.source} · {it.relPath}</p>
        </div>
      ))}
    </div>
  );
}

/* ================= IMAGES / BG / ICONS — masonry + lightbox ================= */
function MasonryView({ items, rounded }: { items: XCodeItem[]; rounded?: boolean }) {
  const [light, setLight] = useState<XCodeItem | null>(null);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setLight(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  return (
    <>
      <div className="masonry">
        {items.map((it) => (
          <div key={it.code} className="glass card-hover group cursor-pointer overflow-hidden rounded-2xl" onClick={() => setLight(it)}>
            <div className="relative overflow-hidden bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(it.relPath)}
                alt={it.name}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${rounded ? '' : ''}`}
              />
              <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-gold-soft">.{it.ext}</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5">
              <CopyChip code={it.code} />
              <span className="truncate text-[10px] text-muted">{formatSize(it.size)}</span>
            </div>
          </div>
        ))}
      </div>
      {light && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setLight(null)}>
          <div className="glass max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <CopyChip code={light.code} />
              <button onClick={() => setLight(null)} className="rounded-full border border-white/10 p-2 transition-colors hover:border-gold/40 hover:text-gold">
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(light.relPath)} alt={light.name} className="max-h-[65vh] w-full object-contain bg-black" />
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs text-muted">
              <span className="truncate">{light.relPath}</span>
              <span>{formatSize(light.size)} · {light.source}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= BACKGROUNDS — curated-first + thematic chips ================= */
const BG_THEME_LABEL: Record<string, string> = {
  'تدرج': 'تدرجات', 'ذهبي': 'ذهبي', 'grain': 'Grain', 'رخام': 'رخام',
  'جسيمات': 'جسيمات', 'تجريدي': 'تجريدي', 'pbr': 'PBR', 'خامات': 'خامات',
};

function BgView({ items }: { items: XCodeItem[] }) {
  const [scope, setScope] = useState<'curated' | 'all'>('curated');
  const [theme, setTheme] = useState<string>('all');
  const [limit, setLimit] = useState(96);

  const curated = useMemo(() => items.filter((it) => !(it.tags || []).includes('اختبار')), [items]);
  const testCount = items.length - curated.length;

  const themes = useMemo(() => {
    const set = new Map<string, number>();
    for (const it of (scope === 'curated' ? curated : items)) {
      for (const t of it.tags || []) {
        if (t === 'اختبار') continue;
        set.set(t, (set.get(t) || 0) + 1);
      }
    }
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, curated, scope]);

  const shown = useMemo(() => {
    const base = scope === 'curated' ? curated : items;
    if (theme === 'all') return base;
    return base.filter((it) => (it.tags || []).includes(theme));
  }, [items, curated, scope, theme]);

  return (
    <div className="flex flex-col gap-5">
      {/* scope toggle */}
      <div className="mx-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1.5">
        <button
          onClick={() => { setScope('curated'); setTheme('all'); setLimit(96); }}
          className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${scope === 'curated' ? 'bg-gradient-to-l from-[#e8c96a] to-gold text-black' : 'text-muted hover:text-gold'}`}
        >
          خامات مختارة ({curated.length.toLocaleString('en-US')})
        </button>
        <button
          onClick={() => { setScope('all'); setTheme('all'); setLimit(96); }}
          className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${scope === 'all' ? 'bg-gradient-to-l from-[#e8c96a] to-gold text-black' : 'text-muted hover:text-gold'}`}
        >
          الكل ({items.length.toLocaleString('en-US')})
        </button>
      </div>
      {scope === 'curated' && testCount > 0 && (
        <p className="text-center text-[11px] text-muted">
          أُخفيت {testCount.toLocaleString('en-US')} صورة اختبار/توثيق من مكتبات المطورين — بدّل إلى «الكل» لعرضها
        </p>
      )}
      {/* thematic chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setTheme('all')}
          className={`rounded-full border px-4 py-1.5 text-xs transition-all ${theme === 'all' ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
        >
          كل الثيمات
        </button>
        {themes.map(([t, n]) => (
          <button
            key={t}
            onClick={() => { setTheme(theme === t ? 'all' : t); setLimit(96); }}
            className={`rounded-full border px-4 py-1.5 text-xs transition-all ${theme === t ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
          >
            {BG_THEME_LABEL[t] || t} ({n.toLocaleString('en-US')})
          </button>
        ))}
      </div>
      <MasonryView items={shown.slice(0, limit)} />
      {shown.length > limit && (
        <button
          onClick={() => setLimit((l) => l + 96)}
          className="glass mx-auto rounded-full px-8 py-2.5 text-sm transition-all hover:border-gold/40 hover:text-gold"
        >
          عرض المزيد ({(shown.length - limit).toLocaleString('en-US')} متبقٍ)
        </button>
      )}
    </div>
  );
}

/* ================= ICONS — family filter ================= */
function iconFam(relPath: string): string {
  const s = relPath.toLowerCase();
  if (s.includes('/lucide/')) return 'Lucide';
  if (s.includes('/phosphor/')) return 'Phosphor';
  if (s.includes('/tabler')) return 'Tabler';
  if (s.startsWith('nk4')) return 'NK4';
  if (s.startsWith('svg/')) return 'SVG';
  return 'أخرى';
}

function IconsView({ items }: { items: XCodeItem[] }) {
  const [fam, setFam] = useState<string>('all');
  const [limit, setLimit] = useState(96);
  const fams = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(iconFam(it.relPath), (m.get(iconFam(it.relPath)) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const shown = useMemo(
    () => (fam === 'all' ? items : items.filter((it) => iconFam(it.relPath) === fam)),
    [items, fam]
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => { setFam('all'); setLimit(96); }}
          className={`rounded-full border px-4 py-1.5 text-xs transition-all ${fam === 'all' ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
        >
          كل العائلات ({items.length.toLocaleString('en-US')})
        </button>
        {fams.map(([f, n]) => (
          <button
            key={f}
            onClick={() => { setFam(fam === f ? 'all' : f); setLimit(96); }}
            className={`rounded-full border px-4 py-1.5 text-xs transition-all ${fam === f ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
          >
            {f} ({n.toLocaleString('en-US')})
          </button>
        ))}
      </div>
      <MasonryView items={shown.slice(0, limit)} />
      {shown.length > limit && (
        <button
          onClick={() => setLimit((l) => l + 96)}
          className="glass mx-auto rounded-full px-8 py-2.5 text-sm transition-all hover:border-gold/40 hover:text-gold"
        >
          عرض المزيد ({(shown.length - limit).toLocaleString('en-US')} متبقٍ)
        </button>
      )}
    </div>
  );
}

/* ================= VIDEO — hover-play grid + theater modal ================= */
function fmtDur(sec: number) {
  if (!isFinite(sec) || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

function VideoView({ items }: { items: XCodeItem[] }) {
  const [theater, setTheater] = useState<XCodeItem | null>(null);
  const [durs, setDurs] = useState<Record<string, number>>({});
  const [dims, setDims] = useState<Record<string, string>>({});
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.code} className="glass card-hover group cursor-pointer overflow-hidden rounded-2xl" onClick={() => setTheater(it)}>
            <div className="relative aspect-video overflow-hidden bg-black">
              <video
                src={fileUrl(it.relPath)}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setDurs((d) => ({ ...d, [it.code]: v.duration }));
                  if (v.videoWidth > 0) setDims((d) => ({ ...d, [it.code]: `${v.videoWidth}×${v.videoHeight}` }));
                }}
                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 transition-opacity group-hover:opacity-0">
                <span className="gold-ring flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-gold">
                  <Play size={22} className="translate-x-[-1px]" />
                </span>
              </span>
              <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-gold-soft">.{it.ext}</span>
              {durs[it.code] ? (
                <span className="font-mono-x absolute bottom-2 left-2 flex gap-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums text-white/90">
                  <span>{fmtDur(durs[it.code])}</span>
                  {dims[it.code] && <span className="text-gold-soft">{dims[it.code]}</span>}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <CopyChip code={it.code} />
              <span className="truncate text-[11px] text-muted">{it.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{formatSize(it.size)}</span>
            </div>
          </div>
        ))}
      </div>
      {theater && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4" onClick={() => setTheater(null)}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <CopyChip code={theater.code} />
              <button onClick={() => setTheater(null)} className="rounded-full border border-white/15 p-2 hover:border-gold/50 hover:text-gold">
                <X size={18} />
              </button>
            </div>
            <video src={fileUrl(theater.relPath)} controls autoPlay className="aspect-video w-full rounded-2xl border border-gold/20 bg-black" />
            <p className="mt-2 truncate text-center text-xs text-muted">{theater.relPath}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= LUT — color swatch preview ================= */
const LUT_GRADIENTS = [
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', 'linear-gradient(135deg,#42275b,#734b6d)',
  'linear-gradient(135deg,#141e30,#243b55)', 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)',
  'linear-gradient(135deg,#0ba360,#3cba92)', 'linear-gradient(135deg,#232526,#414345)',
  'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', 'linear-gradient(135deg,#000428,#004e92)',
];
function LutView({ items }: { items: XCodeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={it.code} className="glass card-hover overflow-hidden rounded-2xl">
          <div className="relative h-28" style={{ background: LUT_GRADIENTS[i % LUT_GRADIENTS.length] }}>
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3">
              <span className="font-mono text-[10px] uppercase text-white/90">.cube</span>
              <span className="text-[10px] text-white/70">{formatSize(it.size)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <CopyChip code={it.code} />
            <p className="truncate text-[11px] text-white/80" title={it.name}>{it.name}</p>
            <a href={fileUrl(it.relPath)} download className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-gold">
              <Download size={12} /> تحميل LUT
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= 3D MODELS — real viewer + download ================= */
export function ModelStage({ item }: { item: XCodeItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!document.querySelector('script[data-mv]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      s.dataset.mv = '1';
      document.head.appendChild(s);
    }
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('model-viewer' as any);
      el.setAttribute('src', fileUrl(item.relPath));
      el.setAttribute('camera-controls', '');
      el.setAttribute('auto-rotate', '');
      el.setAttribute('exposure', '1.1');
      el.setAttribute('shadow-intensity', '1');
      (el as HTMLElement).style.width = '100%';
      (el as HTMLElement).style.height = '100%';
      (el as HTMLElement).style.background = '#000';
      el.addEventListener('error', () => setFailed(true));
      ref.current.appendChild(el);
    }
  }, [item]);
  if (failed) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 bg-black text-sm text-muted">
        <span>تعذر العرض المباشر لهذه الصيغة — حمّل الموديل وافتحه في Blender</span>
        <a href={fileUrl(item.relPath)} download className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-gold">
          <Download size={14} /> تحميل {item.name}
        </a>
      </div>
    );
  }
  return <div ref={ref} className="h-[60vh] w-full bg-black" />;
}

function ModelsView({ items }: { items: XCodeItem[] }) {
  const [viewer, setViewer] = useState<XCodeItem | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => {
          const viewable = it.ext === 'glb' || it.ext === 'gltf';
          return (
            <div key={it.code} className="glass card-hover relative overflow-hidden rounded-2xl p-5 text-center">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold/10 blur-2xl" />
              <div
                className={`anim-float mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/20 to-transparent text-4xl ${viewable ? 'cursor-pointer' : ''}`}
                onClick={() => viewable && setViewer(it)}
                title={viewable ? 'اضغط للعرض ثلاثي الأبعاد' : it.ext}
              >
                {viewable ? <Rotate3D size={36} className="text-gold" /> : '🧊'}
              </div>
              <CopyChip code={it.code} className="mx-auto" />
              <p className="mt-2 truncate text-xs font-bold" title={it.name}>{it.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase text-gold/70">.{it.ext} · {formatSize(it.size)}</p>
              <p className="mt-1 truncate text-[10px] text-muted">{it.source}</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {viewable && (
                  <button onClick={() => setViewer(it)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#e8c96a] to-gold px-4 py-1.5 text-[11px] font-bold text-black transition-transform hover:scale-105">
                    <Rotate3D size={12} /> عرض 3D
                  </button>
                )}
                <a href={fileUrl(it.relPath)} download className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/20">
                  <Download size={12} /> تحميل
                </a>
              </div>
            </div>
          );
        })}
      </div>
      {viewer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4" onClick={() => setViewer(null)}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <CopyChip code={viewer.code} />
              <span className="hidden truncate px-4 text-xs text-muted md:block">{viewer.name} — اسحب للتدوير</span>
              <button onClick={() => setViewer(null)} className="rounded-full border border-white/15 p-2 hover:border-gold/50 hover:text-gold">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gold/20">
              <ModelStage item={viewer} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= ARCHIVES — downloadable packs ================= */
function ArchivesView({ items }: { items: XCodeItem[] }) {
  const [expanded, setExpanded] = useState<Record<string, { count: number; files: { name: string; size: number }[]; formats: { ext: string; n: number }[]; error?: string } | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const inspect = async (it: XCodeItem) => {
    if (expanded[it.code] !== undefined) {
      setExpanded((e) => { const n = { ...e }; delete n[it.code]; return n; });
      return;
    }
    setLoading((l) => ({ ...l, [it.code]: true }));
    try {
      const res = await fetch(`/api/archive-contents?path=${encodeURIComponent(it.relPath).replace(/%2F/g, '/')}`);
      const json = await res.json();
      setExpanded((e) => ({ ...e, [it.code]: json.error ? { count: 0, files: [], formats: [], error: String(json.error) } : json }));
    } catch {
      setExpanded((e) => ({ ...e, [it.code]: null }));
    }
    setLoading((l) => ({ ...l, [it.code]: false }));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((it) => {
        const info = expanded[it.code];
        return (
          <div key={it.code} className="glass card-hover relative overflow-hidden rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/20 to-transparent text-gold">
                <FileArchive size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <CopyChip code={it.code} />
                <p className="mt-1.5 truncate text-xs font-bold" title={it.name}>{it.name}</p>
                <p className="font-mono-x mt-0.5 text-[11px] text-gold">{formatSize(it.size)} · {it.source}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a href={fileUrl(it.relPath)} download className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#e8c96a] to-gold px-4 py-1.5 text-[11px] font-bold text-black transition-transform hover:scale-105">
                <Download size={12} /> تحميل
              </a>
              <button
                onClick={() => inspect(it)}
                disabled={!!loading[it.code]}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-[11px] text-white/75 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-40"
              >
                {loading[it.code] ? <Loader2 size={12} className="animate-spin" /> : null}
                {info ? 'إخفاء المحتويات' : 'استكشف المحتويات'}
              </button>
            </div>
            {info && !info.error && (
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/30 p-3">
                <p className="mb-2 text-[11px] text-muted">
                  {info.count.toLocaleString('en-US')} ملف داخل الحزمة
                  {info.formats.length > 0 && (
                    <> · {info.formats.map((f) => `.${f.ext}×${f.n}`).join(' ')}</>
                  )}
                </p>
                <div className="font-mono-x max-h-40 space-y-1 overflow-y-auto text-[10px] text-white/70" dir="ltr">
                  {info.files.slice(0, 60).map((f) => (
                    <div key={f.name} className="truncate" title={f.name}>{f.name}</div>
                  ))}
                  {info.count > 60 && <div className="text-muted">…+{(info.count - 60).toLocaleString('en-US')} more</div>}
                </div>
              </div>
            )}
            {info && info.error && (
              <p className="mt-3 rounded-xl border border-white/[0.07] bg-black/30 p-3 text-[11px] text-muted">
                تعذر الفحص (أجزاء مقسمة أو مشفرة) — التحميل المباشر متاح
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= TEMPLATES — live iframe modal ================= */
function packOf(relPath: string): string {
  const segs = relPath.split('/');
  // 06_Templates/<pack>/... or 06_Templates/GitClones/<pack>/...
  if (segs[1] === 'GitClones') return segs[2] || 'GitClones';
  return segs[1] || 'أخرى';
}

function TemplatesView({ items }: { items: XCodeItem[] }) {
  const [live, setLive] = useState<XCodeItem | null>(null);
  const [pack, setPack] = useState<string>('all');
  const packs = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(packOf(it.relPath), (m.get(packOf(it.relPath)) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const shown = pack === 'all' ? items : items.filter((it) => packOf(it.relPath) === pack);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setPack('all')}
          className={`rounded-full border px-4 py-1.5 text-xs transition-all ${pack === 'all' ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
        >
          كل الحزم ({items.length.toLocaleString('en-US')})
        </button>
        {packs.map(([p, n]) => (
          <button
            key={p}
            onClick={() => setPack(pack === p ? 'all' : p)}
            className={`font-mono-x rounded-full border px-4 py-1.5 text-xs transition-all ${pack === p ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-muted hover:border-gold/30 hover:text-gold'}`}
          >
            {p} ({n.toLocaleString('en-US')})
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((it) => (
          <div key={it.code} className="glass card-hover overflow-hidden rounded-2xl">
            <div className="relative h-44 overflow-hidden bg-white">
              <iframe src={fileUrl(it.relPath)} title={it.name} loading="lazy" sandbox="" className="h-full w-full scale-90 border-0" scrolling="no" />
              <div className="absolute inset-0 cursor-pointer bg-transparent" onClick={() => setLive(it)} />
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <CopyChip code={it.code} />
              <span className="truncate text-[11px] text-muted">{it.name}</span>
              <button onClick={() => setLive(it)} className="inline-flex shrink-0 items-center gap-1 text-[11px] text-gold hover:underline">
                <ExternalLink size={12} /> معاينة حية
              </button>
            </div>
          </div>
        ))}
      </div>
      {live && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-4" onClick={() => setLive(null)}>
          <div className="mx-auto mb-3 flex w-full max-w-6xl items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <CopyChip code={live.code} />
            <span className="truncate px-4 text-xs text-muted">{live.name}</span>
            <button onClick={() => setLive(null)} className="rounded-full border border-white/15 p-2 hover:border-gold/50 hover:text-gold">
              <X size={18} />
            </button>
          </div>
          <iframe src={fileUrl(live.relPath)} title={live.name} sandbox="" className="mx-auto h-full w-full max-w-6xl flex-1 rounded-2xl border border-gold/20 bg-white" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

/* ================= FX / LOTTIE ================= */
/* ================= LOTTIE STAGE (reused by drawer) ================= */
export function LottieStage({ item, height = 'h-64' }: { item: XCodeItem; height?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef<any>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lottie = (await import('lottie-web')).default;
        const res = await fetch(fileUrl(item.relPath));
        const data = await res.json();
        if (cancelled) return;
        if (data && (data.v || data.layers || data.assets) && ref.current) {
          anim.current = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: true, autoplay: true, animationData: data });
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [item]);
  if (failed) return null;
  return (
    <div>
      <div ref={ref} className={`flex ${height} items-center justify-center bg-black/50`} />
      <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] bg-black/30 px-3 py-2">
        <button
          onClick={() => {
            if (!anim.current) return;
            if (paused) { anim.current.play(); setPaused(false); }
            else { anim.current.pause(); setPaused(true); }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] text-gold transition-colors hover:bg-gold/20"
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
          {paused ? 'تشغيل' : 'إيقاف'}
        </button>
        <button
          onClick={() => {
            const order = [1, 1.5, 2, 0.5];
            const next = order[(order.indexOf(speed) + 1) % order.length];
            if (anim.current) anim.current.setSpeed(next);
            setSpeed(next);
          }}
          className="font-mono-x rounded-full border border-white/10 px-3 py-1 text-[11px] text-muted transition-colors hover:border-gold/40 hover:text-gold"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}

/* ================= FX / LOTTIE ================= */
function FxView({ items }: { items: XCodeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.code} className="glass card-hover overflow-hidden rounded-2xl">
          {it.ext === 'json' ? (
            <LottieStage item={it} height="h-36" />
          ) : (
            <div className="flex h-36 items-center justify-center bg-black/50">
              <span className="text-xs text-muted">✦ dotLottie</span>
            </div>
          )}
          <div className="flex flex-col gap-2 p-3">
            <CopyChip code={it.code} />
            <p className="truncate text-[11px] text-white/80" title={it.name}>{it.name}</p>
            {it.ext === 'lottie' && (
              <a href={fileUrl(it.relPath)} download className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-gold">
                <Download size={12} /> dotLottie
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= MAIN GRID with search + pagination ================= */
export default function GalleryGrid({ category }: { category: string }) {
  const [items, setItems] = useState<XCodeItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setItems(null); setPage(0); setError('');
    (async () => {
      try {
        const res = await fetch(`/api/${category}`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (alive) setItems(data);
      } catch (e: any) {
        if (alive) setError(e.message || 'فشل تحميل البيانات');
      }
    })();
    return () => { alive = false; };
  }, [category]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((it) =>
      it.code.toLowerCase().includes(q) ||
      it.name.toLowerCase().includes(q) ||
      it.relPath.toLowerCase().includes(q)
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  if (error) return <div className="py-20 text-center text-red-400">خطأ: {error}</div>;
  if (!items) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Loader2 className="animate-spin text-gold" size={32} />
        <span className="text-sm text-muted">جاري فهرسة الترسانة (قد يستغرق ثوانٍ للفئات الكبيرة)…</span>
        <div className="grid w-full max-w-4xl grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const isFonts = category === 'fonts';
  const isAudio = category === 'music' || category === 'sfx';
  const isMasonry = category === 'images';
  const isBg = category === 'backgrounds';
  const isIcons = category === 'icons';
  const isVideo = category === 'video';

  return (
    <div className="flex flex-col gap-6">
      {!isFonts && (
        <>
          <div className="relative mx-auto w-full max-w-xl">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="ابحث بالكود (X-IMG-001) أو بالاسم…"
              className="glass w-full rounded-full py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-muted focus:border-gold/50 focus:outline-none"
            />
          </div>

          <div className="text-center text-xs text-muted">
            <span className="font-mono-x text-base font-bold text-gold">{filtered.length.toLocaleString('en-US')}</span> عنصر
            {query ? ' مطابق للبحث' : ''}
          </div>
        </>
      )}

      {isFonts && <FontsView items={filtered} />}
      {isAudio && <AudioView items={paged} wave={category === 'music'} />}
      {isMasonry && <MasonryView items={paged} />}
      {isBg && <BgView items={filtered} />}
      {isIcons && <IconsView items={filtered} />}
      {isVideo && <VideoView items={paged} />}
      {category === 'luts' && <LutView items={paged} />}
      {category === 'models' && <ModelsView items={paged} />}
      {category === 'templates' && <TemplatesView items={paged} />}
      {category === 'fx' && <FxView items={paged} />}
      {category === 'archives' && <ArchivesView items={paged} />}

      {!isFonts && !isBg && !isIcons && (isAudio || isMasonry || isVideo || ['luts', 'models', 'templates', 'fx', 'archives'].includes(category)) && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-6">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="glass rounded-xl px-5 py-2.5 text-sm transition-all hover:border-gold/40 disabled:opacity-30"
          >
            السابق
          </button>
          <span className="font-mono-x text-sm text-muted">{safePage + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="glass rounded-xl px-5 py-2.5 text-sm transition-all hover:border-gold/40 disabled:opacity-30"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
