'use client';

import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import CopyChip from './CopyChip';
import { fileUrl } from './GalleryGrid';
import type { XCodeItem } from '@/lib/indexer';

function formatSize(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

// بطاقة موحدة لنتائج البحث والخزانة — معاينة حية + كود + دخول للفئة
export default function AssetCard({ item, slug, onOpen, badges }: {
  item: XCodeItem;
  slug: string;
  onOpen?: (ref: { code: string; slug: string }) => void;
  badges?: string[];
}) {
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'].includes(item.ext);
  const isVideo = ['mp4', 'webm', 'mov', 'm4v'].includes(item.ext);

  return (
    <div
      className="glass card-hover flex items-center gap-4 overflow-hidden rounded-2xl p-3"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-arsenal-asset', JSON.stringify({ code: item.code, slug }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title="اسحب إلى مجموعة أو مشروع في مساحتي"
    >
      <div
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/50"
        {...(onOpen ? { onClick: () => onOpen({ code: item.code, slug }), role: 'button' as const, style: { cursor: 'pointer' } } : {})}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(item.relPath)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        ) : isVideo ? (
          <video src={fileUrl(item.relPath)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center gap-1 text-gold/80">
            <FileText size={18} />
            <span className="font-mono text-[10px] uppercase">.{item.ext}</span>
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CopyChip code={item.code} />
          <span className="text-[10px] text-muted">{item.source} · {formatSize(item.size)}</span>
        </div>
        <p className="truncate text-xs text-white/75" title={item.relPath}>{item.name}</p>
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <span key={b} className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[9px] text-gold">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        href={`/${slug}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 bg-gold/5 px-3 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/15"
      >
        الفئة <ArrowLeft size={12} />
      </Link>
    </div>
  );
}
