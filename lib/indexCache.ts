import type { XCodeItem } from './indexer';

// طبقة كاش ذكية للفهرسة: المشي الكامل للقرص مكلف (~38 ألف ملف)
// الكاش داخل الذاكرة مع TTL — بلا أي كتابة على القرص
const TTL_MS = 10 * 60 * 1000;

interface Entry {
  at: number;
  items: XCodeItem[];
}

const store = new Map<string, Entry>();

export function getCached(key: string, build: () => XCodeItem[]): XCodeItem[] {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.items;
  const items = build();
  store.set(key, { at: now, items });
  return items;
}

export function invalidateAll() {
  store.clear();
}

export function cacheStats() {
  return {
    keys: [...store.keys()],
    ageSec: Object.fromEntries([...store.entries()].map(([k, v]) => [k, Math.round((Date.now() - v.at) / 1000)])),
  };
}
