import {
  indexImages, indexBackgrounds, indexModels, indexLuts,
  indexFonts, indexMusic, indexSfx, indexVideo, indexTemplates, indexFx, indexIcons, indexZips,
  CATEGORIES, type XCodeItem,
} from './indexer';
import { getCached } from './indexCache';

// محرك البحث المشترك — مصدر واحد للحقيقة (search, collections, gaps)
export const SOURCES: [string, string, () => XCodeItem[]][] = [
  ['images', 'IMG', indexImages],
  ['backgrounds', 'BG', indexBackgrounds],
  ['icons', 'ICN', indexIcons],
  ['models', '3D', indexModels],
  ['luts', 'LUT', indexLuts],
  ['fx', 'FX', indexFx],
  ['music', 'AUD', indexMusic],
  ['sfx', 'SFX', indexSfx],
  ['video', 'VID', indexVideo],
  ['templates', 'TPL', indexTemplates],
  ['fonts', 'FNT', indexFonts],
  ['archives', 'ZIP', indexZips],
];

export function allItems(): { slug: string; prefix: string; items: XCodeItem[] }[] {
  return SOURCES.map(([slug, prefix, fn]) => {
    try {
      return { slug, prefix, items: getCached(slug, fn) };
    } catch {
      return { slug, prefix, items: [] as XCodeItem[] };
    }
  });
}

export function labelOf(prefix: string): string {
  return CATEGORIES.find((c) => c.codePrefix === prefix)?.label || prefix;
}

function tokenScore(it: XCodeItem, t: string): number {
  const code = it.code.toLowerCase();
  const name = it.name.toLowerCase();
  const rel = it.relPath.toLowerCase();
  const src = (it.source || '').toLowerCase();
  const ext = (it.ext || '').toLowerCase();
  const tags = (it.tags || []).join(' ').toLowerCase();
  if (!t) return 0;
  if (code === t || code === `x-${t}`) return 100;
  if (code.includes(t)) return 60;
  if (name.startsWith(t)) return 50;
  if (name.includes(t)) return 35;
  if (ext === t) return 30;
  if (tags.includes(t)) return 25;
  if (src.includes(t)) return 15;
  if (rel.includes(t)) return 10;
  return -1;
}

export interface Scored {
  it: XCodeItem;
  slug: string;
  prefix: string;
  s: number;
}

// mode AND: كل التوكنز (بحث دقيق) — mode OR: أي توكن (مجموعات)
export function searchAll(query: string, mode: 'and' | 'or' = 'and', perCat = 24): { total: number; groups: { key: string; label: string; slug: string; count: number; items: XCodeItem[] }[] } {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const groups: { key: string; label: string; slug: string; count: number; items: XCodeItem[] }[] = [];
  let total = 0;
  for (const { slug, prefix, items } of allItems()) {
    const ranked: Scored[] = [];
    for (const it of items) {
      let s = 0;
      let ok = mode === 'and';
      for (const t of tokens) {
        const ts = tokenScore(it, t);
        if (mode === 'and') {
          if (ts < 0) { ok = false; break; }
          s += ts;
        } else {
          if (ts >= 0) { ok = true; s += ts; }
        }
      }
      if (!ok || !tokens.length) continue;
      if (it.size > 1048576) s += 3;
      if (['webp', 'avif', 'woff2', 'glb', 'mp4'].includes(it.ext)) s += 2;
      ranked.push({ it, slug, prefix, s });
    }
    if (!ranked.length) continue;
    ranked.sort((a, b) => b.s - a.s || (a.it.name < b.it.name ? -1 : 1));
    total += ranked.length;
    groups.push({ key: prefix, label: labelOf(prefix), slug, count: ranked.length, items: ranked.slice(0, perCat).map((r) => r.it) });
  }
  groups.sort((a, b) => b.count - a.count);
  return { total, groups };
}
