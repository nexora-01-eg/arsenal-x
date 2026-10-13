import { NextResponse } from 'next/server';
import { invalidateAll, cacheStats } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, cache: cacheStats() });
}

export async function POST() {
  invalidateAll();
  return NextResponse.json({ ok: true, reindexed: true });
}
