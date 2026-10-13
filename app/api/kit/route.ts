import { NextResponse } from 'next/server';
import { getCached } from '@/lib/indexCache';
import {
  indexImages, indexBackgrounds, indexFonts, indexMusic, indexSfx,
  indexVideo, indexIcons, indexTemplates, indexFx, type XCodeItem,
} from '@/lib/indexer';

export const dynamic = 'force-dynamic';

// ابنِ طقمًا: من أصل واحد → اقتراح متوافق عبر الفئات (مراجع فقط)
function biggest(items: XCodeItem[]): XCodeItem | null {
  if (!items.length) return null;
  return items.reduce((a, b) => (b.size > a.size ? b : a));
}

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ kit: [] }, { status: 400 });

  const get = (key: string, fn: () => XCodeItem[]): XCodeItem[] => {
    try { return getCached(key, fn); } catch { return []; }
  };
  const images = get('images', indexImages);
  const bg = get('backgrounds', indexBackgrounds).filter((i) => !(i.tags || []).includes('اختبار'));
  const fonts = get('fonts', indexFonts);
  const music = get('music', indexMusic);
  const sfx = get('sfx', indexSfx);
  const video = get('video', indexVideo);
  const icons = get('icons', indexIcons).filter((i) => i.ext === 'svg');
  const templates = get('templates', indexTemplates);
  const fx = get('fx', indexFx);

  // base
  const all: { item: XCodeItem; slug: string }[] = [
    ...images.map((item) => ({ item, slug: 'images' })),
    ...bg.map((item) => ({ item, slug: 'backgrounds' })),
    ...fonts.map((item) => ({ item, slug: 'fonts' })),
    ...music.map((item) => ({ item, slug: 'music' })),
    ...sfx.map((item) => ({ item, slug: 'sfx' })),
    ...video.map((item) => ({ item, slug: 'video' })),
    ...icons.map((item) => ({ item, slug: 'icons' })),
  ];
  const base = all.find((a) => a.item.code.toUpperCase() === code);
  if (!base) return NextResponse.json({ kit: [] }, { status: 404 });

  const fam = new Map<string, XCodeItem[]>();
  for (const f of fonts) {
    const k = f.name.toLowerCase().replace(/\.[^.]+$/, '');
    if (!fam.has(k)) fam.set(k, []);
    fam.get(k)!.push(f);
  }
  let bestFam: XCodeItem[] = [];
  for (const v of fam.values()) if (v.length > bestFam.length) bestFam = v;

  const smallestVideo = video.length ? video.reduce((a, b) => (b.size < a.size ? b : a)) : null;
  const logoSfx = sfx.find((s) => /logo|reveal|intro|impact|whoosh/i.test(s.name)) || sfx[0];

  const kit: { slot: string; item: XCodeItem; slug: string }[] = [
    { slot: 'البطل', item: base.item, slug: base.slug },
  ];
  const push = (slot: string, item: XCodeItem | null | undefined, slug: string) => {
    if (item && item.code !== base.item.code) kit.push({ slot, item, slug });
  };
  push('خامة', biggest(bg), 'backgrounds');
  if (bestFam.length) push('خط', bestFam[0], 'fonts');
  push('موسيقى', biggest(music), 'music');
  if (logoSfx) push('مؤثر صوتي', logoSfx, 'sfx');
  push('أيقونة', icons[0], 'icons');
  push('فيديو قصير', smallestVideo, 'video');
  push('قالب', templates[0], 'templates');
  push('موشن', fx[0], 'fx');

  return NextResponse.json({
    base: { code: base.item.code, name: base.item.name },
    kit: kit.map((k) => ({ slot: k.slot, slug: k.slug, item: k.item })),
  });
}
