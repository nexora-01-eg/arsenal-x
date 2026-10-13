import { NextResponse } from 'next/server';
import { indexTemplates } from '@/lib/indexer';
import { getCached } from '@/lib/indexCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getCached('templates', indexTemplates));
}
