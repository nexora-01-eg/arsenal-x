'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Wrench, CheckCircle2, XCircle, Loader2, Clapperboard, Code2, BrainCircuit, BookOpen } from 'lucide-react';

interface Tool {
  name: string; group: string; desc: string; installed: boolean; path: string | null;
}

interface AiModel {
  name: string; use: string; dir: string; present: boolean; files: number; sizeGB: number;
}

interface Data {
  tools: Tool[]; ai: AiModel[]; mdn: { present: boolean; path: string };
}

export default function ToolsPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tools');
        setData(await res.json());
      } catch { setData({ tools: [], ai: [], mdn: { present: false, path: '' } }); }
    })();
  }, []);

  const tools = data?.tools || [];
  const montage = tools.filter((t) => t.group === 'montage');
  const code = tools.filter((t) => t.group === 'code');
  const installedCount = tools.filter((t) => t.installed).length;

  const Group = ({ title, icon, list }: { title: string; icon: React.ReactNode; list: Tool[] }) => (
    <div className="mb-10">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black">{icon}{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <div
            key={t.name}
            className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
              t.installed
                ? 'glass card-hover border-emerald-400/20'
                : 'border-white/[0.07] bg-white/[0.02] opacity-75'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-black">{t.name}</span>
              {t.installed
                ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> مثبتة</span>
                : <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-muted"><XCircle size={11} /> ناقصة</span>}
            </div>
            <p className="text-xs text-muted">{t.desc}</p>
            {t.path && <p className="font-mono-x mt-2 truncate text-[10px] text-gold/60" dir="ltr" title={t.path}>{t.path}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-l from-gold/[0.08] via-transparent to-transparent p-8 text-center md:p-12">
        <div className="hero-grid absolute inset-0" />
        <div className="relative">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/50 px-4 py-1.5 text-xs text-gold">
            <Wrench size={13} /> مرجع القدرات
          </span>
          <h1 className="text-4xl font-black md:text-6xl"><span className="gold-text">قدراتي</span> وأدواتي</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
            فحص حي لبرامج الجهاز — المثبت يعمل فورًا مع عناصر الترسانة، والناقص مقترح للتثبيت.
          </p>
          {tools && (
            <div className="font-mono-x mt-5 inline-block rounded-full border border-emerald-400/25 bg-emerald-400/5 px-5 py-2 text-sm text-emerald-300">
              {installedCount} / {tools.length} مثبت
            </div>
          )}
        </div>
      </div>

      {!data ? (
        <div className="flex items-center justify-center gap-3 py-24 text-muted">
          <Loader2 className="animate-spin text-gold" size={24} />
          <span className="text-sm">جاري فحص برامج الجهاز…</span>
        </div>
      ) : (
        <>
          <Group title="أدوات المونتاج" icon={<Clapperboard size={20} className="text-gold" />} list={montage} />
          <Group title="أدوات البرمجة" icon={<Code2 size={20} className="text-gold" />} list={code} />

          {/* نماذج AI المحلية */}
          <div className="mb-10">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-black">
              <BrainCircuit size={20} className="text-gold" /> نماذج AI المحلية
              <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] font-normal text-gold">أسلحة الترسانة</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.ai.map((m) => (
                <div key={m.name} className="glass card-hover relative overflow-hidden rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-base font-black">{m.name}</span>
                    {m.present
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> جاهز</span>
                      : <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-muted"><XCircle size={11} /> ناقص</span>}
                  </div>
                  <p className="text-xs text-muted">{m.use} — {m.files} ملف · {m.sizeGB} GB</p>
                  <p className="font-mono-x mt-2 truncate text-[10px] text-gold/60" dir="ltr" title={m.dir}>{m.dir}</p>
                </div>
              ))}
              {/* مرجع MDN */}
              <div className="glass card-hover relative overflow-hidden rounded-2xl p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base font-black"><BookOpen size={18} className="text-gold" /> مرجع MDN المحلي</span>
                  {data.mdn.present
                    ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300"><CheckCircle2 size={11} /> موجود</span>
                    : <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-muted"><XCircle size={11} /> ناقص</span>}
                </div>
                <p className="text-xs text-muted">توثيق الويب الكامل — مرجع البرمجة البصرية</p>
                <p className="font-mono-x mt-2 truncate text-[10px] text-gold/60" dir="ltr" title={data.mdn.path}>{data.mdn.path}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
