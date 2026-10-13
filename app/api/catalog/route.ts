import { NextResponse } from 'next/server';
import {
  CATEGORIES, indexImages, indexBackgrounds, indexModels, indexLuts,
  indexFonts, indexMusic, indexSfx, indexVideo, indexTemplates, indexFx, indexIcons, indexZips,
} from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const counts: Record<string, number> = {};

  const runners: [string, string, () => any[]][] = [
    ['IMG', 'images', indexImages],
    ['BG', 'backgrounds', indexBackgrounds],
    ['ICN', 'icons', indexIcons],
    ['3D', 'models', indexModels],
    ['LUT', 'luts', indexLuts],
    ['FNT', 'fonts', indexFonts],
    ['AUD', 'music', indexMusic],
    ['SFX', 'sfx', indexSfx],
    ['VID', 'video', indexVideo],
    ['TPL', 'templates', indexTemplates],
    ['FX', 'fx', indexFx],
    ['ZIP', 'archives', indexZips],
  ];

  const cards = CATEGORIES.map((c) => ({ ...c }));
  for (const [key, cacheKey, fn] of runners) {
    try {
      counts[key] = getCached(cacheKey, fn).length;
    } catch (e) {
      counts[key] = -1;
      console.error(`index ${key} failed`, e);
    }
  }

  cards.forEach((c) => {
    c.count = counts[c.codePrefix] ?? 0;
  });

  const total = runners.reduce((acc, [k]) => acc + (counts[k] > 0 ? counts[k] : 0), 0);

  return NextResponse.json({ cards, total });
}
