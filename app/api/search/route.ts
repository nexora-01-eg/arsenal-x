import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/arsenalSearch';

export const dynamic = 'force-dynamic';

const PER_CAT = 24;
const TOTAL_CAP = 240;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') || '';
  const query = q.trim();
  if (query.length < 2) {
    return NextResponse.json({ query: q, total: 0, groups: [] });
  }
  const { total, groups } = searchAll(query, 'and', PER_CAT);
  const capped: typeof groups = [];
  let n = 0;
  for (const g of groups) {
    capped.push(g);
    n += g.items.length;
    if (n >= TOTAL_CAP) break;
  }
  return NextResponse.json({ query: q, total, groups: capped });
}
