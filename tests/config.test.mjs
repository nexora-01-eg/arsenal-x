// Phase 18 tests — Arsenal root configuration (Tests A, B, J).
// Run: node --test tests/   (no dependencies; Node 20+ type-stripping)
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  arsenalRoot,
  arsenalRootStatus,
  requireArsenalRoot,
  setArsenalRoot,
  clearArsenalRootOverride,
} from '../lib/config.ts';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('ARSENAL_ROOT configuration', () => {
  before(() => clearArsenalRootOverride());

  it('A: default root resolves to the real warehouse F:\\Arsenal', () => {
    clearArsenalRootOverride();
    delete process.env.ARSENAL_ROOT;
    const st = arsenalRootStatus();
    assert.equal(st.source, 'default');
    assert.ok(st.root.endsWith('Arsenal'), `root=${st.root}`);
    assert.equal(st.exists, true);
    assert.equal(requireArsenalRoot(), st.root);
  });

  it('J: explicit override wins without code modification', () => {
    setArsenalRoot('F:\\Arsenal');
    assert.equal(arsenalRootStatus().source, 'explicit');
    assert.equal(arsenalRoot(), 'F:\\Arsenal');
    clearArsenalRootOverride();
  });

  it('J: env var override wins over default', () => {
    process.env.ARSENAL_ROOT = 'F:\\Arsenal';
    clearArsenalRootOverride();
    assert.equal(arsenalRootStatus().source, 'env');
    delete process.env.ARSENAL_ROOT;
    clearArsenalRootOverride();
  });

  it('missing root fails clearly (no silent fallback, no guessing)', () => {
    setArsenalRoot('Z:\\NoSuchWarehouse');
    const st = arsenalRootStatus();
    assert.equal(st.exists, false);
    assert.throws(() => requireArsenalRoot(), /Arsenal root not found: .*no silent fallback/);
    clearArsenalRootOverride();
  });

  it('B: no D:\\Arsenal literal remains in runtime sources', () => {
    const bad = [];
    const skip = new Set(['node_modules', '.next']);
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx|mjs|js|css)$/.test(e.name)) continue;
        const text = readFileSync(full, 'utf8');
        if (/D:\\Arsenal|D:\/Arsenal/.test(text)) bad.push(full);
      }
    };
    walk(PROJECT);
    assert.deepEqual(bad, []);
  });
});
