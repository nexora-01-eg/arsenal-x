import { NextRequest, NextResponse } from 'next/server';
import { verifyCandidate, liveVerifyContext } from '@/lib/verify';

export const dynamic = 'force-dynamic';

// Phase 21: verify one candidate.
// GET: ?path=<relPath> (or ?code=<X-Code>) + dur_min/dur_max/ar/res/type/
// require[] (repeatable) + strict_provenance=1.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  let relPath = sp.get('path') || '';
  const code = sp.get('code') || '';
  if (!relPath && !code) {
    return NextResponse.json({ error: 'path or code is required' }, { status: 400 });
  }
  if (!relPath && code) {
    const { searchAll } = await import('@/lib/arsenalSearch');
    for (const g of searchAll(code, 'and', 50).groups) {
      const hit = g.items.find((it) => it.code.toUpperCase() === code.toUpperCase());
      if (hit) { relPath = hit.relPath; break; }
    }
    if (!relPath) return NextResponse.json({ found: false }, { status: 404 });
  }
  const num = (k: string) => {
    const v = sp.get(k);
    return v === null || v === '' ? undefined : Number(v);
  };
  const verification = verifyCandidate(
    {
      relPath,
      asset_type: sp.get('type') || undefined,
      duration_min: num('dur_min'),
      duration_max: num('dur_max'),
      aspect_ratio: sp.get('ar') || undefined,
      resolution_min: sp.get('res') || undefined,
      semantic_requirements: sp.getAll('require'),
      allow_unknown_provenance: sp.get('strict_provenance') !== '1',
    },
    liveVerifyContext()
  );
  return NextResponse.json({ path: relPath, ...verification });
}
