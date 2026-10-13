import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { join, normalize } from 'path';
import { ROOT } from '@/lib/indexer';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', m4a: 'audio/mp4',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', eot: 'application/vnd.ms-fontobject',
  glb: 'model/gltf-binary', gltf: 'model/gltf+json', cube: 'text/plain', json: 'application/json',
  html: 'text/html', htm: 'text/html', lottie: 'application/zip', zip: 'application/zip',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo', aiff: 'audio/aiff', aif: 'audio/aiff',
  aac: 'audio/aac', psd: 'image/vnd.adobe.photoshop', eps: 'application/postscript',
  ai: 'application/postscript', onnx: 'application/octet-stream', bin: 'application/octet-stream',
  gz: 'application/gzip', tgz: 'application/gzip',
  blend: 'application/octet-stream', tres: 'application/octet-stream', usdc: 'application/octet-stream',
};

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const p = sp.get('path');
  if (!p) return new NextResponse('missing path', { status: 400 });

  const root = normalize(ROOT) + '\\';
  const target = normalize(join(ROOT, p));
  if (!target.startsWith(root)) return new NextResponse('forbidden', { status: 403 });

  let st;
  try { st = statSync(target); } catch { return new NextResponse('not found', { status: 404 }); }
  if (!st.isFile()) return new NextResponse('not a file', { status: 400 });

  const ext = p.split('.').pop()!.toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  // Support Range requests for video/audio streaming
  const range = req.headers.get('range');
  if (range && /^bytes=/i.test(range) && ext in { mp4: 1, webm: 1, mov: 1, mp3: 1, wav: 1, m4a: 1, ogg: 1, flac: 1, aac: 1 }) {
    const m = range.replace(/bytes=/, '').match(/^(\d+)-(\d*)$/);
    let start = m ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (start > end || end >= st.size) end = st.size - 1;
    const chunk = createReadStream(target, { start, end });
    const headers = new Headers();
    headers.set('Content-Range', `bytes ${start}-${end}/${st.size}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Content-Type', mime);
    headers.set('Cache-Control', 'no-store');
    return new NextResponse(chunk as any, { status: 206, headers });
  }

  const headers = new Headers();
  headers.set('Content-Type', mime);
  headers.set('Content-Length', String(st.size));
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'no-store');
  return new NextResponse(createReadStream(target) as any, { status: 200, headers });
}
