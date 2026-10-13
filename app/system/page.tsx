'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, Loader2, Database, HardDrive, ShieldCheck, RefreshCw } from 'lucide-react';

interface SysData {
  counts: { prefix: string; count: number; gb: number }[];
  total: number;
  totalGB: number;
  cache: { keys: string[]; ageSec: Record<string, number> };
  quarantine: { files: number; gb: number };
  disk: { freeGB: number | null; totalGB: number | null };
}

export default function SystemPage() {
  const [data, setData] = useState<SysData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (reindex = false) => {
    setRefreshing(true);
    try {
      if (reindex) await fetch('/api/reindex', { method: 'POST' });
      const res = await fetch('/api/system');
      setData(await res.json());
    } catch { /* keep */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-gold">
        <ArrowRight size={14} /> عودة للترسانة
      </Link>

      <div className="mb-10 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-muted">
          <Activity size={13} /> منطقة utility — قراءة فقط
        </span>
        <h1 className="text-4xl font-black md:text-5xl">صحة <span className="gold-text">النظام</span></h1>
      </div>

      {!data ? (
        <div className="flex items-center justify-center gap-3 py-24 text-muted">
          <Loader2 className="animate-spin text-gold" size={26} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass rounded-2xl p-5 text-center">
              <Database size={18} className="mx-auto mb-2 text-gold" />
              <div className="font-mono-x text-2xl font-bold tabular-nums">{data.total.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] text-muted">أصل مفهرس ({data.totalGB} GB)</div>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <ShieldCheck size={18} className="mx-auto mb-2 text-gold" />
              <div className="font-mono-x text-2xl font-bold tabular-nums">{data.quarantine.files.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] text-muted">في الحجر ({data.quarantine.gb} GB)</div>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <HardDrive size={18} className="mx-auto mb-2 text-gold" />
              <div className="font-mono-x text-2xl font-bold tabular-nums">
                {data.disk.freeGB !== null ? `${data.disk.freeGB} GB` : '—'}
              </div>
              <div className="mt-1 text-[11px] text-muted">مساحة حرة على القرص</div>
            </div>
            <div className="glass rounded-2xl p-5 text-center">
              <Activity size={18} className="mx-auto mb-2 text-gold" />
              <div className="font-mono-x text-2xl font-bold tabular-nums">{data.cache.keys.length}/12</div>
              <div className="mt-1 text-[11px] text-muted">فئات مخزنة مؤقتًا</div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black">الفئات والأحجام</h2>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-[11px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                إعادة فهرسة
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.counts.map((c) => (
                <div key={c.prefix} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs">
                  <span className="font-mono-x text-gold">X-{c.prefix}</span>
                  <span className="tabular-nums">{c.count.toLocaleString('en-US')} · {c.gb} GB</span>
                </div>
              ))}
            </div>
            {Object.keys(data.cache.ageSec).length > 0 && (
              <p className="font-mono-x mt-4 text-[10px] leading-5 text-muted" dir="ltr">
                cache age: {Object.entries(data.cache.ageSec).map(([k, v]) => `${k}:${v}s`).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
