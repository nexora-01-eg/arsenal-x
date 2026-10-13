'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Radar, Loader2, TrendingUp, Minus, AlertTriangle } from 'lucide-react';

interface Gap {
  area: string;
  status: 'strong' | 'ok' | 'gap';
  detail: string;
  count: number;
}

const STYLE = {
  strong: { border: 'border-emerald-400/25', bg: 'bg-emerald-400/5', text: 'text-emerald-300', icon: <TrendingUp size={18} />, label: 'قوي' },
  ok: { border: 'border-gold/25', bg: 'bg-gold/5', text: 'text-gold', icon: <Minus size={18} />, label: 'كافٍ' },
  gap: { border: 'border-red-400/25', bg: 'bg-red-400/5', text: 'text-red-300', icon: <AlertTriangle size={18} />, label: 'فجوة' },
};

export default function GapsPage() {
  const [gaps, setGaps] = useState<Gap[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gaps');
        const json = await res.json();
        setGaps(json.gaps || []);
      } catch { setGaps([]); }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-10 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5 text-xs text-gold">
          <Radar size={13} /> تحليل استراتيجي حي
        </span>
        <h1 className="text-4xl font-black md:text-5xl">فجوات <span className="gold-text">الترسانة</span></h1>
        <p className="mt-3 text-sm text-muted">أين أنت قوي وأين تحتاج الدعم — بأرقام حقيقية لا تخمين</p>
      </div>

      {!gaps ? (
        <div className="flex items-center justify-center gap-3 py-24 text-muted">
          <Loader2 className="animate-spin text-gold" size={26} />
          <span className="text-sm">جاري تحليل الترسانة…</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {gaps.map((g) => {
            const s = STYLE[g.status];
            return (
              <div key={g.area} className={`rounded-2xl border ${s.border} ${s.bg} p-5`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-base font-black">{g.area}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${s.border} ${s.text}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
                <p className="text-xs leading-6 text-white/70">{g.detail}</p>
                <p className="font-mono-x mt-2 text-[11px] text-muted">{g.count.toLocaleString('en-US')}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass mx-auto mt-10 max-w-2xl rounded-2xl p-6 text-center">
        <p className="text-xs leading-7 text-muted">
          التوسع المسؤول فقط: مكتبات مفتوحة الترخيص (Google Fonts · Lucide · Phosphor · Tabler · LottieFiles المجانية) —
          بلا كسر paywall أو DRM أو حقوق. أي استيراد مستقبلي سيحفظ المصدر والترخيص والتاريخ.
        </p>
      </div>
    </div>
  );
}
