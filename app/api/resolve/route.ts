import { NextResponse } from 'next/server';
import {
  indexImages, indexBackgrounds, indexModels, indexLuts,
  indexFonts, indexMusic, indexSfx, indexVideo, indexTemplates, indexFx, indexIcons, indexZips,
} from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

// حل مرجع X-CODE إلى الأصل الحي — أساس المفضلة والمجموعات والمشاريع
const SOURCES: [string, () => any[]][] = [
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

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ found: false }, { status: 400 });

  for (const [slug, fn] of SOURCES) {
    let items;
    try {
      items = getCached(slug, fn);
    } catch {
      continue;
    }
    const hit = items.find((it: any) => it.code.toUpperCase() === code);
    if (hit) return NextResponse.json({ found: true, slug, item: hit });
  }
  // مفقود من القرص: يُعلَّم غير متاح بدل حذفه silently
  return NextResponse.json({ found: false, code });
}
