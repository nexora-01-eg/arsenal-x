// Phase 18 — single authoritative Arsenal root configuration.
//
// Precedence: explicit argument > ARSENAL_ROOT env var > default derived
// from this file's location (<ROOT>/_projects/arsenal-x/lib/config.ts).
// Everything else in Arsenal-X must derive paths from here; no other
// module may hardcode a drive or machine-specific root.
//
// Client-safe: no filesystem access at module top level, so UI components
// may import the pure helpers. Existence is checked on demand via
// requireArsenalRoot(), which FAILS CLEARLY instead of silently scanning
// an empty/missing drive.
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

export const ENV_VAR = 'ARSENAL_ROOT';

function defaultRoot(): string {
  // Walk UP from this module looking for the warehouse: a directory that
  // contains `_projects` (and is not itself build output). Works from
  // source (lib/), from tests, and from Next's compiled output
  // (.next/server/...) where __dirname points inside the build cache.
  let start = '';
  try {
    start = typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  } catch {
    start = '';
  }
  const seeds = start ? [start, process.cwd()] : [process.cwd()];
  for (const seed of seeds) {
    let dir = seed;
    for (let i = 0; i < 12; i++) {
      try {
        if (existsSync(join(dir, '_projects')) &&
            !dir.includes('.next') && !dir.includes('node_modules')) {
          return dir;
        }
      } catch { /* keep climbing */ }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return '';
}

let override: string | null = null;
let cached: string | null = null;
let cachedSource: string | null = null;

/** Set an explicit root (tests, embedding hosts). Clears the cache. */
export function setArsenalRoot(root: string): void {
  override = root;
  cached = null;
  cachedSource = null;
}

/** Forget any explicit override (tests). */
export function clearArsenalRootOverride(): void {
  override = null;
  cached = null;
  cachedSource = null;
}

export interface RootStatus {
  root: string;
  exists: boolean;
  source: 'explicit' | 'env' | 'default';
}

/** Resolve the root without touching the filesystem. */
export function arsenalRootStatus(): RootStatus {
  if (cached) return { root: cached, exists: existsSync(cached), source: cachedSource as RootStatus['source'] };
  const fromEnv = (typeof process !== 'undefined' && process.env
    ? process.env[ENV_VAR] : '') || '';
  let root = '';
  let source: RootStatus['source'] = 'default';
  if (override) { root = override; source = 'explicit'; }
  else if (fromEnv) { root = fromEnv; source = 'env'; }
  else { root = defaultRoot(); source = 'default'; }
  cached = resolve(root);
  cachedSource = source;
  return { root: cached, exists: existsSync(cached), source };
}

/** Resolve the root path (no existence check — indexers skip missing dirs). */
export function arsenalRoot(): string {
  return arsenalRootStatus().root;
}

/** Resolve and FAIL CLEARLY when the warehouse is absent. */
export function requireArsenalRoot(): string {
  const st = arsenalRootStatus();
  if (!st.root) {
    throw new Error(
      `Arsenal root could not be determined (set ${ENV_VAR}=<warehouse path>).`
    );
  }
  if (!st.exists) {
    throw new Error(
      `Arsenal root not found: ${st.root} (source: ${st.source}; ` +
      `set ${ENV_VAR} to the warehouse path — no silent fallback, no drive guessing).`
    );
  }
  return st.root;
}
