import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, statSync } from 'fs';
import { join, normalize } from 'path';
import JSZip from 'jszip';
import { ROOT } from '@/lib/indexer';

export const dynamic = 'force-dynamic';

// مستكشف الأرشيف: قائمة المحتويات بلا استخراج — آمن وخفيف
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const p = sp.get('path');
  if (!p) return NextResponse.json({ error: 'missing path' }, { status: 400 });

  const root = normalize(ROOT) + '\\';
  const target = normalize(join(ROOT, p));
  if (!target.startsWith(root)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let st;
  try { st = statSync(target); } catch { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  if (!st.isFile()) return NextResponse.json({ error: 'not a file' }, { status: 400 });
  if (st.size > 500 * 1048576) {
    return NextResponse.json({ error: 'too large to inspect', size: st.size }, { status: 413 });
  }

  try {
    const buf = readFileSync(target);
    const zip = await JSZip.loadAsync(buf);
    const files: { name: string; size: number; dir: boolean }[] = [];
    zip.forEach((relPath, entry) => {
      if (relPath.endsWith('/')) return;
      files.push({ name: relPath, size: (entry as any)._data?.uncompressedSize || 0, dir: false });
    });
    files.sort((a, b) => a.name.localeCompare(b.name));
    const exts = new Map<string, number>();
    for (const f of files) {
      const m = f.name.toLowerCase().match(/\.([a-z0-9]{1,5})$/);
      if (m) exts.set(m[1], (exts.get(m[1]) || 0) + 1);
    }
    return NextResponse.json({
      count: files.length,
      files: files.slice(0, 200),
      truncated: files.length > 200,
      formats: [...exts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([ext, n]) => ({ ext, n })),
      archiveSize: st.size,
    });
  } catch {
    return NextResponse.json({ error: 'unreadable archive (maybe split parts or encrypted)' }, { status: 422 });
  }
}
