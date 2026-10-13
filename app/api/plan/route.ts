import { NextRequest, NextResponse } from 'next/server';
import { planRequirements } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Phase 22: editorial intent -> structured asset requirements.
// GET: ?intent= (required) &topic&style&platform&duration_s
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const intent = (sp.get('intent') || '').trim();
  if (!intent) {
    return NextResponse.json({ error: 'intent is required' }, { status: 400 });
  }
  const dur = sp.get('duration_s');
  const requirements = planRequirements({
    intent,
    topic: sp.get('topic') || undefined,
    style: sp.get('style') || undefined,
    platform: sp.get('platform') || undefined,
    target_duration_s: dur === null || dur === '' ? undefined : Number(dur),
  });
  return NextResponse.json({ intent, total: requirements.length, requirements });
}
