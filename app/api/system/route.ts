import { NextResponse } from 'next/server';
import { readdirSync, statSync, existsSync, statfsSync } from 'fs';
import { join, sep } from 'path';
import { allItems } from '@/lib/arsenalSearch';
import { cacheStats } from '@/lib/indexCache';
import { ROOT } from '@/lib/indexer';
import { arsenalRootStatus } from '@/lib/config';

export const dynamic = 'force-dynamic';

// صفحة النظام: حالة الفهرس والحجر والقرص — قراءة فقط
function quarantineStats() {
  const q = join(ROOT, 'المتكرر 00');
  let files = 0;
  let bytes = 0;
  const walk = (dir: string) => {
    let entries: any[] = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else {
        if (e.name === '_REPORT.txt') continue;
        try { bytes += statSync(full).size; files++; } catch { /* skip */ }
      }
    }
  };
  try {
    if (existsSync(q)) walk(q);
  } catch { /* missing */ }
  return { files, gb: +(bytes / 1073741824).toFixed(2) };
}

function diskFree() {
  try {
    const st = statfsSync(ROOT);
    if (st && typeof (st as any).bavail === 'number') {
      const s = st as any;
      const free = (s.bavail * s.bsize) / 1073741824;
      const total = (s.blocks * s.bsize) / 1073741824;
      return { freeGB: +free.toFixed(2), totalGB: +total.toFixed(2) };
    }
  } catch { /* unsupported */ }
  return { freeGB: null as number | null, totalGB: null as number | null };
}

export async function GET() {
  const rootStatus = arsenalRootStatus();
  const cats = allItems();
  const counts = cats.map((c) => ({
    prefix: c.prefix,
    count: c.items.length,
    gb: +(c.items.reduce((a, i) => a + i.size, 0) / 1073741824).toFixed(2),
  }));
  const total = counts.reduce((a, c) => a + c.count, 0);
  const totalGB = +(counts.reduce((a, c) => a + c.gb, 0).toFixed(2));

  return NextResponse.json({
    counts,
    total,
    totalGB,
    cache: cacheStats(),
    quarantine: quarantineStats(),
    disk: diskFree(),
    // Phase 18: explicit root provenance (additive; legacy `roots` kept).
    arsenalRoot: rootStatus.root,
    arsenalRootOk: rootStatus.exists,
    arsenalRootSource: rootStatus.source,
    roots: [`${rootStatus.root} (12 فئة + حجر المتكرر 00)`],
    sep,
  });
}
