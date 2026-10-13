'use client';

import { useCallback, useEffect, useState } from 'react';

// مساحة العمل الشخصية — مراجع خفيفة فقط (كود + فئة)، بلا نسخ ملفات
// التخزين محلي دائم: ينجو من إعادة الفهرسة وإعادة التشغيل

export interface AssetRef {
  code: string;
  slug: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  items: AssetRef[];
}

export interface ProjectItem extends AssetRef {
  section: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  items: ProjectItem[];
}

interface Store {
  favorites: AssetRef[];
  collections: Collection[];
  projects: Project[];
  recent: AssetRef[];
  savedSearches: string[];
}

const KEY = 'arsenal-x-workspace-v1';
const RECENT_CAP = 24;
const SEARCH_CAP = 12;

const empty: Store = { favorites: [], collections: [], projects: [], recent: [], savedSearches: [] };

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...empty };
    const p = JSON.parse(raw);
    return {
      favorites: Array.isArray(p.favorites) ? p.favorites : [],
      collections: Array.isArray(p.collections) ? p.collections : [],
      projects: Array.isArray(p.projects) ? p.projects : [],
      recent: Array.isArray(p.recent) ? p.recent : [],
      savedSearches: Array.isArray(p.savedSearches) ? p.savedSearches : [],
    };
  } catch {
    return { ...empty };
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useWorkspace() {
  const [store, setStore] = useState<Store>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(load());
    setReady(true);
  }, []);

  const save = useCallback((next: Store) => {
    setStore(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* full/blocked storage */ }
  }, []);

  const toggleFavorite = useCallback((ref: AssetRef) => {
    setStore((prev) => {
      const has = prev.favorites.some((f) => f.code === ref.code);
      const next = {
        ...prev,
        favorites: has ? prev.favorites.filter((f) => f.code !== ref.code) : [...prev.favorites, ref],
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isFavorite = useCallback((code: string) => store.favorites.some((f) => f.code === code), [store.favorites]);

  const createCollection = useCallback((name: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    setStore((prev) => {
      const next = { ...prev, collections: [...prev.collections, { id: uid(), name: clean, createdAt: Date.now(), items: [] }] };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, collections: prev.collections.filter((c) => c.id !== id) };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const addToCollection = useCallback((id: string, ref: AssetRef) => {
    setStore((prev) => {
      const next = {
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === id && !c.items.some((i) => i.code === ref.code)
            ? { ...c, items: [...c.items, ref] }
            : c
        ),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeFromCollection = useCallback((id: string, code: string) => {
    setStore((prev) => {
      const next = {
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === id ? { ...c, items: c.items.filter((i) => i.code !== code) } : c
        ),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const createProject = useCallback((name: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return '';
    const id = uid();
    setStore((prev) => {
      const next = { ...prev, projects: [...prev.projects, { id, name: clean, createdAt: Date.now(), items: [] }] };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    return id;
  }, []);

  const createKitProject = useCallback((name: string, items: { code: string; slug: string; section: string }[]) => {
    const clean = name.trim().slice(0, 60);
    if (!clean || !items.length) return '';
    const id = uid();
    setStore((prev) => {
      const next = {
        ...prev,
        projects: [...prev.projects, {
          id, name: clean, createdAt: Date.now(),
          items: items.map((i) => ({ code: i.code, slug: i.slug, section: i.section || 'عام' })),
        }],
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    return id;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, projects: prev.projects.filter((p) => p.id !== id) };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const addToProject = useCallback((id: string, ref: AssetRef, section: string) => {
    setStore((prev) => {
      const next = {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id && !p.items.some((i) => i.code === ref.code)
            ? { ...p, items: [...p.items, { ...ref, section: section || 'عام' }] }
            : p
        ),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeFromProject = useCallback((id: string, code: string) => {
    setStore((prev) => {
      const next = {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, items: p.items.filter((i) => i.code !== code) } : p
        ),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const recordRecent = useCallback((ref: AssetRef) => {
    setStore((prev) => {
      const next = {
        ...prev,
        recent: [{ code: ref.code, slug: ref.slug }, ...prev.recent.filter((r) => r.code !== ref.code)].slice(0, RECENT_CAP),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev, recent: [] };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const saveSearch = useCallback((q: string) => {
    const clean = q.trim().slice(0, 80);
    if (clean.length < 2) return;
    setStore((prev) => {
      const next = {
        ...prev,
        savedSearches: [clean, ...prev.savedSearches.filter((s) => s !== clean)].slice(0, SEARCH_CAP),
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeSearch = useCallback((q: string) => {
    setStore((prev) => {
      const next = { ...prev, savedSearches: prev.savedSearches.filter((s) => s !== q) };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return {
    ready, store, save,
    toggleFavorite, isFavorite,
    createCollection, deleteCollection, addToCollection, removeFromCollection,
    createProject, deleteProject, createKitProject, addToProject, removeFromProject,
    recordRecent, clearRecent, saveSearch, removeSearch,
  };
}
