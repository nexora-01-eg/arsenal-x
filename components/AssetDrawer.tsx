'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Download, Loader2, ExternalLink, PackagePlus, Check } from 'lucide-react';
import CopyChip from './CopyChip';
import { fileUrl, ModelStage, LottieStage } from './GalleryGrid';
import { FavoriteToggle, AddToCollection, AddToProject } from './workspace-ui';
import AudioPlayer from './AudioPlayer';
import { useFontLab } from './FontLab';
import { useWorkspace, type AssetRef } from '@/lib/workspace';
import type { XCodeItem } from '@/lib/indexer';

interface Related {
  item: XCodeItem;
  slug: string;
  why: string;
}

function formatSize(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

const isImg = (e: string) => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg'].includes(e);
const isVid = (e: string) => ['mp4', 'webm', 'mov', 'm4v'].includes(e);
const isAud = (e: string) => ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'aiff', 'aif'].includes(e);

// درج تفاصيل موحد — المسرح حسب النوع + بيانات + إجراءات + مرتبط
export default function AssetDrawer({ asset, onClose, onSelect }: {
  asset: AssetRef;
  onClose: () => void;
  onSelect: (ref: AssetRef) => void;
}) {
  const [item, setItem] = useState<XCodeItem | null>(null);
  const [slug, setSlug] = useState(asset.slug);
  const [missing, setMissing] = useState(false);
  const [related, setRelated] = useState<Related[]>([]);
  const [complements, setComplements] = useState<{ item: XCodeItem; slug: string; why: string; slot: string }[]>([]);
  const [kitState, setKitState] = useState<'idle' | 'busy' | 'done'>('idle');
  const lab = useFontLab();
  const { recordRecent, createKitProject } = useWorkspace();

  const buildKit = async () => {
    if (!item || kitState === 'busy') return;
    setKitState('busy');
    try {
      const res = await fetch(`/api/kit?code=${encodeURIComponent(item.code)}`);
      const json = await res.json();
      const kit = json.kit || [];
      if (!kit.length) { setKitState('idle'); return; }
      createKitProject(
        `طقم: ${item.name.slice(0, 40)}`,
        kit.map((k: any) => ({ code: k.item.code, slug: k.slug, section: k.slot }))
      );
      setKitState('done');
      setTimeout(() => setKitState('idle'), 2500);
    } catch {
      setKitState('idle');
    }
  };

  useEffect(() => {
    let alive = true;
    setItem(null); setMissing(false); setRelated([]); setComplements([]);
    (async () => {
      try {
        const res = await fetch(`/api/resolve?code=${encodeURIComponent(asset.code)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.found) {
          setItem(json.item);
          setSlug(json.slug);
          recordRecent({ code: json.item.code, slug: json.slug });
          try {
            const rr = await fetch(`/api/related?code=${encodeURIComponent(json.item.code)}`);
            const rj = await rr.json();
            if (alive) {
              setRelated(rj.items || []);
              setComplements(rj.complements || []);
            }
          } catch { /* related optional */ }
        } else {
          setMissing(true);
        }
      } catch { if (alive) setMissing(true); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.code]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const isFont = slug === 'fonts';
  const css = isFont && item
    ? `@font-face{font-family:'DrawerFont';src:url('${fileUrl(item.relPath)}');font-display:swap;}`
    : '';

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass flex w-full max-w-xl flex-col overflow-hidden border-gold/20 md:rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          {item ? <CopyChip code={item.code} /> : <span className="font-mono-x text-xs text-muted">{asset.code}</span>}
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 transition-colors hover:border-gold/40 hover:text-gold">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!item && !missing && (
            <div className="flex items-center justify-center gap-3 py-24 text-muted">
              <Loader2 className="animate-spin text-gold" size={24} />
              <span className="text-sm">جاري فتح الأصل…</span>
            </div>
          )}
          {missing && (
            <div className="p-8 text-center">
              <p className="text-lg font-black">الأصل غير متاح</p>
              <p className="mt-2 text-xs leading-6 text-muted">اختفى من القرص بعد حفظه — المرجع محفوظ ويمكن إزالته من مساحتك.</p>
            </div>
          )}
          {item && (
            <>
              {/* stage */}
              <div className="relative bg-black/60">
                {isImg(item.ext) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(item.relPath)} alt={item.name} className="max-h-[46vh] w-full object-contain" />
                )}
                {isVid(item.ext) && (
                  <video src={fileUrl(item.relPath)} controls playsInline preload="metadata" className="max-h-[46vh] w-full bg-black" />
                )}
                {isAud(item.ext) && (
                  <div className="flex flex-col gap-4 p-8 text-center">
                    <div className="font-mono-x text-5xl text-gold">♪</div>
                    <AudioPlayer src={fileUrl(item.relPath)} />
                  </div>
                )}
                {isFont && (
                  <>
                    <style>{css}</style>
                    <div className="flex flex-col gap-3 p-6">
                      {lab.controls}
                      <div className={`overflow-hidden rounded-xl px-4 py-6 text-center ${lab.dark ? 'bg-black/50' : 'bg-white text-black'}`} style={{ fontFamily: 'DrawerFont', ...lab.style }}>
                        {lab.text || item.name}
                      </div>
                    </div>
                  </>
                )}
                {(item.ext === 'glb' || item.ext === 'gltf') && <ModelStage item={item} />}
                {slug === 'fx' && item.ext === 'json' && (
                  <div className="border-b border-white/[0.07]">
                    <LottieStage item={item} height="h-64" />
                  </div>
                )}
                {!isImg(item.ext) && !isVid(item.ext) && !isAud(item.ext) && !isFont && item.ext !== 'glb' && item.ext !== 'gltf' && (
                  <div className="flex flex-col items-center gap-2 p-10 text-gold/80">
                    <span className="font-mono text-2xl uppercase">.{item.ext}</span>
                    <span className="text-xs text-muted">معاينة التنزيل متاحة بالأسفل</span>
                  </div>
                )}
              </div>

              {/* meta */}
              <div className="border-b border-white/[0.07] p-5">
                <h2 className="break-words text-base font-black leading-7">{item.name}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    ['الصيغة', '.' + item.ext],
                    ['الحجم', formatSize(item.size)],
                    ['المصدر', item.source],
                    ['الفئة', slug],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                      <div className="text-muted">{k}</div>
                      <div className="mt-0.5 truncate font-bold" title={String(v)}>{v}</div>
                    </div>
                  ))}
                </div>
                <p className="font-mono-x mt-3 break-all text-[10px] leading-5 text-muted" dir="ltr">{item.relPath}</p>
              </div>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] p-5">
                <FavoriteToggle asset={{ code: item.code, slug }} />
                <AddToCollection asset={{ code: item.code, slug }} />
                <AddToProject asset={{ code: item.code, slug }} />
                <a
                  href={fileUrl(item.relPath)}
                  download
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs text-gold transition-colors hover:bg-gold/20"
                >
                  <Download size={13} /> تحميل
                </a>
                <Link
                  href={`/${slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition-colors hover:border-gold/40 hover:text-gold"
                >
                  <ExternalLink size={13} /> الفئة
                </Link>
                <button
                  onClick={buildKit}
                  disabled={kitState === 'busy'}
                  title="أنشئ مشروع طقم متوافق من هذا الأصل"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[#e8c96a] to-gold px-4 py-2 text-xs font-bold text-black transition-transform hover:scale-105 disabled:opacity-50"
                >
                  {kitState === 'done' ? <Check size={13} /> : <PackagePlus size={13} />}
                  {kitState === 'done' ? 'تم إنشاء الطقم!' : kitState === 'busy' ? 'يبني…' : 'ابنِ طقمًا'}
                </button>
              </div>

              {/* related */}
              {related.length > 0 && (
                <div className="border-b border-white/[0.07] p-5">
                  <h3 className="mb-3 text-sm font-black">قد تحتاج أيضًا <span className="text-[10px] font-normal text-muted">مرتبط ذكيًا</span></h3>
                  <div className="flex flex-col gap-2">
                    {related.map((r) => (
                      <button
                        key={r.item.code}
                        onClick={() => onSelect({ code: r.item.code, slug: r.slug })}
                        className="glass card-hover flex items-center gap-3 rounded-xl p-2.5 text-right"
                      >
                        <span className="font-mono-x shrink-0 rounded-full border border-gold/25 bg-black/40 px-2 py-0.5 text-[10px] text-gold">
                          {r.item.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-white/80">{r.item.name}</span>
                        <span className="shrink-0 text-[10px] text-muted">{r.why}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* works well with */}
              {complements.length > 0 && (
                <div className="p-5">
                  <h3 className="mb-3 text-sm font-black">يعمل جيدًا مع <span className="text-[10px] font-normal text-muted">مكمّلات عبر الفئات</span></h3>
                  <div className="flex flex-col gap-2">
                    {complements.map((r) => (
                      <button
                        key={r.slot + r.item.code}
                        onClick={() => onSelect({ code: r.item.code, slug: r.slug })}
                        className="glass-gold card-hover flex items-center gap-3 rounded-xl p-2.5 text-right"
                      >
                        <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                          {r.slot}
                        </span>
                        <span className="font-mono-x shrink-0 rounded-full border border-gold/25 bg-black/40 px-2 py-0.5 text-[10px] text-gold">
                          {r.item.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-white/80">{r.item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
