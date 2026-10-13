import { NextResponse } from 'next/server';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { arsenalRoot } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface ToolDef {
  name: string;
  group: 'montage' | 'code';
  desc: string;
  paths: string[];
}

const TOOLS: ToolDef[] = [
  { name: 'Premiere Pro', group: 'montage', desc: 'مونتاج الفيديو الأساسي', paths: ['C:\\Program Files\\Adobe\\Adobe Premiere Pro 2024\\Adobe Premiere Pro.exe', 'C:\\Program Files\\Adobe\\Adobe Premiere Pro 2025\\Adobe Premiere Pro.exe', 'C:\\Program Files\\Adobe\\Adobe Premiere Pro 2023\\Adobe Premiere Pro.exe'] },
  { name: 'After Effects', group: 'montage', desc: 'موشن جرافيك ومؤثرات', paths: ['C:\\Program Files\\Adobe\\Adobe After Effects 2024\\Support Files\\AfterFX.exe', 'C:\\Program Files\\Adobe\\Adobe After Effects 2025\\Support Files\\AfterFX.exe'] },
  { name: 'Photoshop', group: 'montage', desc: 'معالجة الصور والأغلفة', paths: ['C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe', 'C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe'] },
  { name: 'Audition', group: 'montage', desc: 'هندسة الصوت', paths: ['C:\\Program Files\\Adobe\\Adobe Audition 2024\\Adobe Audition.exe'] },
  { name: 'Media Encoder', group: 'montage', desc: 'ترميز وتصدير الفيديو', paths: ['C:\\Program Files\\Adobe\\Adobe Media Encoder 2024\\Adobe Media Encoder.exe'] },
  { name: 'DaVinci Resolve', group: 'montage', desc: 'تلوين ومونتاج سينمائي', paths: ['C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe'] },
  { name: 'CapCut', group: 'montage', desc: 'مونتاج سريع للسوشيال', paths: ['C:\\Program Files\\CapCut\\CapCut.exe'] },
  { name: 'Blender', group: 'montage', desc: 'نمذجة وتحريك ثلاثي الأبعاد', paths: ['C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe', 'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe', 'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe'] },
  { name: 'OBS Studio', group: 'montage', desc: 'تسجيل وبث الشاشة', paths: ['C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'] },
  { name: 'VS Code', group: 'code', desc: 'محرر الأكواد الأساسي', paths: ['C:\\Program Files\\Microsoft VS Code\\Code.exe', 'C:\\Users\\fagr\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'] },
  { name: 'Cursor', group: 'code', desc: 'محرر AI للبرمجة', paths: ['C:\\Users\\fagr\\AppData\\Local\\Programs\\Cursor\\Cursor.exe'] },
  { name: 'Node.js', group: 'code', desc: 'بيئة تشغيل JavaScript', paths: ['C:\\Program Files\\nodejs\\node.exe'] },
  { name: 'Python', group: 'code', desc: 'لغة البرمجة والأتمتة', paths: ['C:\\Program Files\\Python312\\python.exe', 'C:\\Program Files\\Python311\\python.exe', 'C:\\Users\\fagr\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'] },
  { name: 'Git', group: 'code', desc: 'إدارة النسخ والمشاريع', paths: ['C:\\Program Files\\Git\\bin\\git.exe'] },
  { name: 'FFmpeg', group: 'code', desc: 'معالجة الفيديو والصوت من الطرفية', paths: ['C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'] },
];

export async function GET() {
  const tools = TOOLS.map((t) => {
    const found = t.paths.find((p) => {
      try { return existsSync(p); } catch { return false; }
    });
    return { name: t.name, group: t.group, desc: t.desc, installed: !!found, path: found || null };
  });

  // Phase 18: model dirs derive from the configured Arsenal root.
  const root = arsenalRoot();
  const AI_MODELS = [
    { name: 'Whisper (large-turbo + small + base)', use: 'تفريغ صوتي للفيديوهات', dir: join(root, '07_AI_Models', 'whisper-ggml') },
    { name: 'Rembg (isnet + u2net)', use: 'إزالة خلفية الصور', dir: join(root, '07_AI_Models', 'rembg') },
  ];
  const ai = AI_MODELS.map((m) => {
    let size = 0; let files = 0; let present = false;
    try {
      if (existsSync(m.dir)) {
        present = true;
        for (const f of readdirSync(m.dir)) {
          try {
            const st = statSync(join(m.dir, f as string));
            if (st.isFile()) { size += st.size; files++; }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
    return { ...m, present, files, sizeGB: +(size / 1073741824).toFixed(2) };
  });

  // عين X: مرجع MDN المحلي
  const mdnPath = join(root, '09_Docs', 'mdn-content');
  const mdnPresent = existsSync(mdnPath);

  return NextResponse.json({ tools, ai, mdn: { present: mdnPresent, path: mdnPath }, arsenalRoot: root });
}
