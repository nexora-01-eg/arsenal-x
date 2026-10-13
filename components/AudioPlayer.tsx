'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

// مشغل صوتي احترافي: تشغيل/إيقاف/تقديم/مدة/صوت — بلا تحميل مسبق ثقيل
export default function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onT = () => setCur(el.currentTime);
    const onM = () => setDur(el.duration || 0);
    const onE = () => setPlaying(false);
    el.addEventListener('timeupdate', onT);
    el.addEventListener('loadedmetadata', onM);
    el.addEventListener('ended', onE);
    return () => {
      el.removeEventListener('timeupdate', onT);
      el.removeEventListener('loadedmetadata', onM);
      el.removeEventListener('ended', onE);
    };
  }, [src]);

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = vol;
      ref.current.muted = muted;
    }
  }, [vol, muted]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    // lazy waveform decode on first play
    if (!peaks && !decoding) {
      setDecoding(true);
      (async () => {
        try {
          const res = await fetch(src);
          const buf = await res.arrayBuffer();
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new Ctx();
          const audio = await ctx.decodeAudioData(buf);
          const ch = audio.getChannelData(0);
          const N = 96;
          const step = Math.max(1, Math.floor(ch.length / N));
          const out: number[] = [];
          for (let i = 0; i < N; i++) {
            let m = 0;
            const start = i * step;
            for (let j = start; j < Math.min(start + step, ch.length); j += 7) {
              const v = Math.abs(ch[j]);
              if (v > m) m = v;
            }
            out.push(m);
          }
          const max = Math.max(0.01, ...out);
          setPeaks(out.map((v) => v / max));
          ctx.close().catch(() => {});
        } catch { /* keep decorative bars */ }
        setDecoding(false);
      })();
    }
    el.play().catch(() => {});
    setPlaying(true);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5" dir="ltr">
      <div className="flex h-9 items-end justify-center gap-[2px]" title={decoding ? 'جاري تحليل الموجة…' : peaks ? 'موجة حقيقية' : 'اضغط تشغيل لتحليل الموجة'}>
        {(peaks || Array.from({ length: 96 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.3)) * 0.5)).map((v, i) => {
          const played = dur > 0 && peaks ? (i / 96) * dur <= cur : false;
          return (
            <span
              key={i}
              onClick={(e) => {
                if (!peaks || !ref.current || !dur) return;
                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                ref.current.currentTime = Math.max(0, Math.min(dur, ratio * dur));
              }}
              className={`w-[3px] shrink-0 rounded-full transition-colors ${peaks ? 'cursor-pointer' : ''} ${played ? 'bg-gold' : 'bg-gold/35'}`}
              style={{ height: `${Math.max(8, v * 100)}%`, opacity: decoding ? 0.4 : 1 }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2.5">
      <audio ref={ref} src={src} preload="metadata" className="hidden" />
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8c96a] to-gold text-black transition-transform hover:scale-105"
        title={playing ? 'إيقاف' : 'تشغيل'}
      >
        {playing ? <Pause size={15} /> : <Play size={15} className="translate-x-[1px]" />}
      </button>
      <span className="font-mono-x w-10 shrink-0 text-center text-[10px] tabular-nums text-white/80">{fmt(cur)}</span>
      <input
        type="range"
        min={0}
        max={dur || 0}
        step={0.1}
        value={Math.min(cur, dur || 0)}
        onChange={(e) => {
          const v = +e.target.value;
          if (ref.current) ref.current.currentTime = v;
          setCur(v);
        }}
        className="min-w-0 flex-1"
      />
      <span className="font-mono-x w-10 shrink-0 text-center text-[10px] tabular-nums text-muted">{fmt(dur)}</span>
      <button onClick={() => setMuted((m) => !m)} className="shrink-0 text-muted transition-colors hover:text-gold" title="كتم">
        {muted || vol === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : vol}
        onChange={(e) => { setVol(+e.target.value); setMuted(false); }}
        className="hidden w-16 shrink-0 sm:block"
      />
      </div>
    </div>
  );
}
