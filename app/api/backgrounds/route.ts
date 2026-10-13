import { NextResponse } from 'next/server';
import { indexBackgrounds } from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getCached('backgrounds', indexBackgrounds));
}
