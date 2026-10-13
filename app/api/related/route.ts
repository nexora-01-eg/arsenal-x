import { NextResponse } from 'next/server';
import {
  indexImages, indexBackgrounds, indexModels, indexLuts,
  indexFonts, indexMusic, indexSfx, indexVideo, indexTemplates, indexFx, indexIcons, indexZips,
  type XCodeItem,
} from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

// أصول مرتبطة: نفس المصدر/النوع/الوسم/روح الاسم — لا عشوائية
const SOURCES: [string, () => XCodeItem[]][] = [
  ['images', indexImages],
  ['backgrounds', indexBackgrounds],
  ['icons', indexIcons],
  ['models', indexModels],
  ['luts', indexLuts],
  ['fx', indexFx],
  ['music', indexMusic],
  ['sfx', indexSfx],
  ['video', indexVideo],
  ['templates', indexTemplates],
  ['fonts', indexFonts],
  ['archives', indexZips],
];

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .split(/[^a-z0-9\u0600-\u06FF]+/u)
    .filter((w) => w.length > 3)
    .slice(0, 8);
}

function relate(base: XCodeItem, baseSlug: string, it: XCodeItem, slug: string): { s: number; why: string } | null {
  if (it.code === base.code) return null;
  const tags = it.tags || [];
  const btags = base.tags || [];
  if (slug === baseSlug && it.source === base.source) return { s: 50, why: 'نفس المصدر' };
  if (slug === baseSlug && it.ext === base.ext) {
    const bt = tokens(base.name);
    const overlap = tokens(it.name).filter((w) => bt.includes(w)).length;
    if (overlap > 0) return { s: 30 + overlap * 10, why: 'روح الاسم' };
    return { s: 12, why: 'نفس النوع' };
  }
  const sharedTag = tags.find((t) => btags.includes(t) && t !== 'خامات');
  if (sharedTag) return { s: 22, why: `وسم: ${sharedTag}` };
  if (slug === baseSlug) return { s: 8, why: 'نفس الفئة' };
  return null;
}

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ items: [] }, { status: 400 });

  let base: XCodeItem | null = null;
  let baseSlug = '';
  const pools = new Map<string, XCodeItem[]>();
  for (const [slug, fn] of SOURCES) {
    let items: XCodeItem[];
    try {
      items = getCached(slug, fn);
    } catch {
      continue;
    }
    pools.set(slug, items);
    if (!base) {
      const hit = items.find((it) => it.code.toUpperCase() === code);
      if (hit) { base = hit; baseSlug = slug; }
    }
  }
  if (!base) return NextResponse.json({ items: [] });

  const out: { item: XCodeItem; slug: string; why: string }[] = [];
  const perSlug = new Map<string, number>();
  const ranked: { item: XCodeItem; slug: string; s: number; why: string }[] = [];
  for (const [slug, items] of pools) {
    for (const it of items) {
      const r = relate(base, baseSlug, it, slug);
      if (r) ranked.push({ item: it, slug, s: r.s, why: r.why });
    }
  }
  ranked.sort((a, b) => b.s - a.s);
  for (const r of ranked) {
    if (out.length >= 12) break;
    const n = perSlug.get(r.slug) || 0;
    if (n >= 4) continue; // تنويع عبر الفئات
    perSlug.set(r.slug, n + 1);
    out.push({ item: r.item, slug: r.slug, why: r.why });
  }

  // يعمل جيدًا مع: مكمّلات حتمية عبر الفئات (قواعد صريحة لا عشوائية)
  const pool = (slug: string) => pools.get(slug) || [];
  const biggest = (slug: string) => {
    const arr = pool(slug);
    return arr.length ? arr.reduce((a, b) => (b.size > a.size ? b : a)) : null;
  };
  const firstSvg = () => pool('icons').find((i) => i.ext === 'svg') || pool('icons')[0] || null;
  const curatedBg = () => pool('backgrounds').find((i) => !(i.tags || []).includes('اختبار')) || pool('backgrounds')[0] || null;
  const logoSfx = () => pool('sfx').find((s) => /logo|reveal|intro|impact|whoosh/i.test(s.name)) || pool('sfx')[0] || null;
  const fontRep = () => {
    const fonts = pool('fonts');
    if (!fonts.length) return null;
    const fam = new Map<string, XCodeItem[]>();
    for (const f of fonts) {
      const k = f.name.toLowerCase().replace(/\.[^.]+$/, '');
      if (!fam.has(k)) fam.set(k, []);
      fam.get(k)!.push(f);
    }
    let best: XCodeItem[] = [];
    for (const v of fam.values()) if (v.length > best.length) best = v;
    return best[0] || fonts[0];
  };
  const smallVideo = () => {
    const v = pool('video');
    return v.length ? v.reduce((a, b) => (b.size < a.size ? b : a)) : null;
  };

  const complements: { item: XCodeItem; slug: string; why: string; slot: string }[] = [];
  const pushC = (slot: string, item: XCodeItem | null | undefined, slug: string, why: string) => {
    if (item && item.code !== base.code && complements.length < 6) {
      complements.push({ item, slug, why, slot });
    }
  };
  const cb = baseSlug;
  if (cb === 'images' || cb === 'backgrounds') {
    const fr = fontRep(); if (fr) pushC('خط', fr, 'fonts', 'للهوية البصرية');
    const mu = biggest('music'); if (mu) pushC('موسيقى', mu, 'music', 'للأجواء');
    const tx = curatedBg(); if (tx && tx.code !== base.code) pushC('خامة', tx, 'backgrounds', 'للعمق');
    const ic = firstSvg(); if (ic) pushC('أيقونة', ic, 'icons', 'للواجهة');
    const tp = pool('templates')[0]; if (tp) pushC('قالب', tp, 'templates', 'للعرض');
  } else if (cb === 'fonts') {
    const tx = curatedBg(); if (tx) pushC('خلفية', tx, 'backgrounds', 'للعرض');
    const tp = pool('templates')[0]; if (tp) pushC('قالب', tp, 'templates', 'للعلامة');
    const ic = firstSvg(); if (ic) pushC('أيقونة', ic, 'icons', 'للهوية');
  } else if (cb === 'video') {
    const mu = biggest('music'); if (mu) pushC('موسيقى تصويرية', mu, 'music', 'للصوت');
    const ls = logoSfx(); if (ls) pushC('مؤثر', ls, 'sfx', 'للانتقالات');
    const fr = fontRep(); if (fr) pushC('خط عناوين', fr, 'fonts', 'للنصوص');
  } else if (cb === 'music' || cb === 'sfx') {
    const sv = smallVideo(); if (sv) pushC('فيديو', sv, 'video', 'للمزامنة');
    const fr = fontRep(); if (fr) pushC('خط', fr, 'fonts', 'للغلاف');
    const tx = curatedBg(); if (tx) pushC('خلفية', tx, 'backgrounds', 'للغلاف');
  } else {
    const fr = fontRep(); if (fr) pushC('خط', fr, 'fonts', 'مكمل');
    const tx = curatedBg(); if (tx && tx.code !== base.code) pushC('خامة', tx, 'backgrounds', 'مكمل');
    const mu = biggest('music'); if (mu) pushC('موسيقى', mu, 'music', 'مكمل');
  }

  return NextResponse.json({ items: out, complements });
}
