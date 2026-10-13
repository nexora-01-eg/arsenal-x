import { NextResponse } from 'next/server';
import { allItems } from '@/lib/arsenalSearch';

export const dynamic = 'force-dynamic';

// وصل حديثًا: الأحدث تعديلًا عبر الترسانة كلها
export async function GET(req: Request) {
  const limit = Math.min(24, Math.max(4, parseInt(new URL(req.url).searchParams.get('limit') || '12', 10) || 12));
  const flat: { item: any; slug: string }[] = [];
  for (const { slug, items } of allItems()) {
    for (const it of items) {
      flat.push({ item: it, slug });
    }
  }
  flat.sort((a, b) => (b.item.mtimeMs || 0) - (a.item.mtimeMs || 0));
  return NextResponse.json({
    items: flat.slice(0, limit).map((f) => ({ ...f.item, slug: f.slug })),
  });
}
