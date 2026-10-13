'use client';

import { useState, type CSSProperties } from 'react';
import { Type as TypeIcon } from 'lucide-react';

// مختبر خطوط موحد: نص/حجم/تباعد/ارتفاع/محاذاة/حالة/خلفية — يُستخدم في العائلات والمقارنة والدرج
export function useFontLab() {
  const [text, setText] = useState('ترسانة NEXORA الذهبية 0123456789 ABC');
  const [size, setSize] = useState(30);
  const [tracking, setTracking] = useState(0);
  const [lh, setLh] = useState(1.6);
  const [align, setAlign] = useState<'center' | 'right' | 'left'>('center');
  const [upper, setUpper] = useState(false);
  const [dark, setDark] = useState(true);

  const style: CSSProperties = {
    fontSize: size,
    letterSpacing: `${tracking}px`,
    lineHeight: lh,
    textAlign: align,
    textTransform: upper ? 'uppercase' : 'none',
  };

  const controls = (
    <div className="flex flex-col gap-3">
      <div className="relative flex-1">
        <TypeIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gold" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-4 pr-11 text-sm focus:border-gold/50 focus:outline-none"
          placeholder="اكتب نص المعاينة…"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <label className="flex items-center gap-2">
          <span>الحجم</span>
          <input type="range" min={14} max={72} value={size} onChange={(e) => setSize(+e.target.value)} className="w-24" />
          <span className="font-mono-x text-gold">{size}</span>
        </label>
        <label className="flex items-center gap-2">
          <span>التباعد</span>
          <input type="range" min={-2} max={12} step={0.5} value={tracking} onChange={(e) => setTracking(+e.target.value)} className="w-20" />
          <span className="font-mono-x text-gold">{tracking}</span>
        </label>
        <label className="flex items-center gap-2">
          <span>الارتفاع</span>
          <input type="range" min={1} max={2.5} step={0.1} value={lh} onChange={(e) => setLh(+e.target.value)} className="w-20" />
          <span className="font-mono-x text-gold">{lh.toFixed(1)}</span>
        </label>
        <div className="flex items-center gap-1">
          {(['right', 'center', 'left'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAlign(a)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${align === a ? 'border-gold/50 bg-gold/15 text-gold' : 'border-white/10 hover:border-gold/30'}`}
            >
              {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUpper((u) => !u)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${upper ? 'border-gold/50 bg-gold/15 text-gold' : 'border-white/10 hover:border-gold/30'}`}
        >
          AA
        </button>
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] transition-colors hover:border-gold/30"
        >
          {dark ? '◑ داكن' : '◐ فاتح'}
        </button>
      </div>
    </div>
  );

  return { text, size, tracking, lh, align, upper, dark, style, controls };
}
