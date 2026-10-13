// Phase 18 tests — search, gaps machinery, X-Code stability (Tests G, H, I).
// Uses a tiny fixture warehouse (/tmp) via setArsenalRoot — the real
// F:\Arsenal is never touched by these tests.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setArsenalRoot, clearArsenalRootOverride } from '../lib/config.ts';
import { refreshRoot } from '../lib/indexer.ts';
import { invalidateAll } from '../lib/indexCache.ts';
import { searchAll, allItems } from '../lib/arsenalSearch.ts';
import {
  indexMusic,
  indexFonts,
  indexVideo,
  indexIcons,
  CATEGORIES,
} from '../lib/indexer.ts';

function buildFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ax-fix-'));
  const put = (rel, content = 'x'.repeat(64)) => {
    const full = join(root, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  };
  put(join('MH - محتوى بصري', '01-صور', 'dark-luxury-sofa.jpg'));
  put(join('MH - محتوى بصري', '02-فيديو', 'luxury-intro.mp4'));
  put(join('04_Music', 'Incompetech', 'Ambient Dreams.mp3'));
  put(join('01_Fonts', 'Amiri-Regular.ttf'));
  put(join('02_Icons', 'lucide', 'arrow-right.svg'));
  put(join('03_SFX', 'whoosh-airy-01.mp3'));
  return root;
}

describe('search + gaps + X-Code stability', () => {
  before(() => {
    setArsenalRoot(buildFixture());
    refreshRoot();
    invalidateAll();
  });

  it('G: token search finds fixture assets across categories', () => {
    const r = searchAll('luxury', 'and', 24);
    assert.ok(r.total >= 2, `total=${r.total}`);
    const slugs = new Set(r.groups.map((g) => g.slug));
    assert.ok(slugs.has('images') || slugs.has('video'));
    for (const g of r.groups) {
      assert.ok(g.key && g.label && g.slug && typeof g.count === 'number');
      for (const it of g.items) {
        assert.ok(it.code && it.name && it.relPath && it.ext);
      }
    }
  });

  it('G: AND mode requires every token; OR mode any token', () => {
    const and = searchAll('luxury nonexistenttoken', 'and', 24);
    assert.equal(and.total, 0);
    const or = searchAll('luxury nonexistenttoken', 'or', 24);
    assert.ok(or.total > 0);
  });

  it('H: gap-analysis input shape (12 groups, counts, items)', () => {
    const cats = allItems();
    assert.equal(cats.length, 12);
    for (const c of cats) {
      assert.ok(c.slug && c.prefix && Array.isArray(c.items));
    }
    const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c.items.length]));
    assert.ok(bySlug.images >= 1 && bySlug.video >= 1 && bySlug.music >= 1);
    assert.equal(CATEGORIES.length, 12);
  });

  it('I: X-Code IDs are stable across rebuilds', () => {
    const first = indexMusic().map((i) => i.code + '|' + i.relPath);
    invalidateAll();
    const second = indexMusic().map((i) => i.code + '|' + i.relPath);
    assert.deepEqual(second, first);
    assert.match(first[0], /^X-AUD-\d{4}\|/);
  });

  it('backward compat: XCodeItem keeps all legacy fields', () => {
    const [img] = indexIcons();
    for (const k of ['code', 'name', 'path', 'relPath', 'size', 'ext', 'source']) {
      assert.ok(img[k] !== undefined, k);
    }
    const [f] = indexFonts();
    assert.ok(f.code.startsWith('X-FNT-'));
    const [v] = indexVideo();
    assert.ok(v.code.startsWith('X-VID-'));
  });
});
