import { NextRequest, NextResponse } from 'next/server';
import { enrichmentFor, enrichmentCount } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

// Phase 19: read-only enrichment records. ?path=<warehouse-relative> or
// ?code=<X-Code> (resolved via search index). No path → corpus stats.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const p = sp.get('path');
  const code = sp.get('code');
  if (!p && !code) {
    return NextResponse.json({ ...enrichmentCount(), analyzer: 'enrich-1.0.0' });
  }
  if (code) {
    const { searchAll } = await import('@/lib/arsenalSearch');
    const found: string[] = [];
    for (const g of searchAll(code, 'and', 50).groups) {
      for (const it of g.items) {
        if (it.code.toUpperCase() === code.toUpperCase()) found.push(it.relPath);
      }
    }
    if (!found.length) return NextResponse.json({ found: false }, { status: 404 });
    const rec = enrichmentFor(found[0]);
    if (!rec) return NextResponse.json({ found: false, reason: 'not-enriched' }, { status: 404 });
    return NextResponse.json({ found: true, record: rec });
  }
  const rec = enrichmentFor(p as string);
  if (!rec) return NextResponse.json({ found: false }, { status: 404 });
  return NextResponse.json({ found: true, record: rec });
}
