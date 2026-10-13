import { NextRequest, NextResponse } from 'next/server';
import { matchLive, parseIntent } from '@/lib/match';
import type { AssetSearchRequest } from '@/lib/assetIdentity';

export const dynamic = 'force-dynamic';

// Phase 20: AssetSearchRequest -> AssetCandidate[] with evidence.
// GET params: intent (required), type, dur_min, dur_max, ar, res,
// require[] (repeatable semantic requirements), limit.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const intent = (sp.get('intent') || '').trim();
  if (!intent) {
    return NextResponse.json({ error: 'intent is required' }, { status: 400 });
  }
  const parsed = parseIntent(intent);
  const request: AssetSearchRequest = {
    intent,
    asset_type: (sp.get('type') as AssetSearchRequest['asset_type']) || 'any',
    duration_min: sp.get('dur_min') ? Number(sp.get('dur_min')) : parsed.duration_min,
    duration_max: sp.get('dur_max') ? Number(sp.get('dur_max')) : parsed.duration_max,
    aspect_ratio: sp.get('ar') || parsed.aspect_ratio,
    resolution_min: sp.get('res') || parsed.resolution_min,
    semantic_requirements: sp.getAll('require'),
    technical_requirements: {},
    provenance_requirements: {},
  };
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 25));
  const candidates = matchLive(request, limit);
  return NextResponse.json({
    intent,
    parsed,
    total: candidates.length,
    candidates,
  });
}
