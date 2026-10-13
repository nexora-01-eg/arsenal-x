'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyChip({ code, className = '' }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      onClick={copy}
      title="نسخ الكود"
      className={`inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-mono text-gold transition-colors hover:bg-gold/20 ${className}`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {code}
    </button>
  );
}
