// Phase 20 tests — evidence-based matching (deterministic, no invention).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent, matchAssets } from '../lib/match.ts';

const ITEMS = [
  { slug: 'video', relPath: 'MH/02-clip.mp4', name: '02-clip.mp4', size: 8e6, ext: 'mp4' },
  { slug: 'video', relPath: 'MH/09-tall.mp4', name: '09-tall.mp4', size: 6e6, ext: 'mp4' },
  { slug: 'music', relPath: '04_Music/Incompetech/Calm Piano.mp3', name: 'Calm Piano.mp3', size: 5e6, ext: 'mp3' },
];

function ctxFor(meta) {
  return {
    items: ITEMS,
    enrichByPath: (rel) => meta[rel] || null,
  };
}

const META = {
  'MH/02-clip.mp4': {
    status: 'ok',
    technical: { duration: 5.8, width: 1280, height: 720 },
    frames: [{ dark: false, blue_dominant: true, palette: ['#2850dc'] }],
    aggregate: { brightness_med: 0.3 },
  },
  'MH/09-tall.mp4': {
    status: 'ok',
    technical: { duration: 12.0, width: 1080, height: 1920 },
    frames: [{ dark: false, blue_dominant: false, palette: ['#e0e0e0'] }],
    aggregate: { brightness_med: 0.7 },
  },
};

describe('intent parsing', () => {
  it('extracts duration / aspect / resolution / type facets', () => {
    const p = parseIntent('Need a 5-second futuristic server-room shot, dark blue, 16:9');
    assert.equal(p.duration_min, 4);
    assert.equal(p.duration_max, 6);
    assert.equal(p.aspect_ratio, '16:9');
    assert.equal(p.asset_type, 'video');
    assert.ok(p.semantic_tokens.includes('dark') && p.semantic_tokens.includes('blue'));
  });

  it('supports ranges and vertical', () => {
    const p = parseIntent('4-6 seconds vertical clip for shorts');
    assert.equal(p.duration_min, 4);
    assert.equal(p.duration_max, 6);
    assert.equal(p.asset_ratio ?? p.aspect_ratio, '9:16');
  });
});

describe('evidence-based matching', () => {
  it('ranks the technically compatible, evidenced candidate first', () => {
    const out = matchAssets(
      { intent: '5-second dark blue clip 16:9', asset_type: 'video' },
      ctxFor(META)
    );
    assert.equal(out[0].path, 'MH/02-clip.mp4');
    assert.ok(out[0].match_reasons.some((r) => r.includes('duration')));
    assert.ok(out[0].match_reasons.some((r) => r.includes('aspect_ratio')));
    assert.ok(out[0].match_reasons.some((r) => r.includes('blue')));
    assert.equal(out[0].technical_match.duration, true);
  });

  it('records unmet requirements instead of inventing evidence', () => {
    const out = matchAssets(
      { intent: 'video server room', asset_type: 'video', semantic_requirements: ['server'] },
      ctxFor(META)
    );
    const top = out[0];
    assert.ok(top.warnings.some((w) => w === 'unmet: server'));
    assert.ok(!top.match_reasons.some((r) => r.includes('server')));
  });

  it('negative match: impossible duration leaves duration unmet everywhere', () => {
    const out = matchAssets(
      { intent: 'video', asset_type: 'video', duration_min: 5000, duration_max: 6000 },
      ctxFor(META)
    );
    assert.ok(out.length > 0);
    for (const c of out) {
      assert.ok(c.warnings.some((w) => w.startsWith('unmet: duration')));
    }
  });

  it('unknown enrichment stays UNKNOWN and never excludes', () => {
    const out = matchAssets({ intent: 'video', asset_type: 'video' }, ctxFor({}));
    assert.equal(out.length, 2);
    for (const c of out) assert.equal(c.semantic_status, 'UNKNOWN');
  });

  it('ranking is deterministic', () => {
    const a = matchAssets({ intent: 'dark blue video', asset_type: 'video' }, ctxFor(META));
    const b = matchAssets({ intent: 'dark blue video', asset_type: 'video' }, ctxFor(META));
    assert.deepEqual(a, b);
  });

  it('provenance KNOWN carries attribution warning', () => {
    const out = matchAssets(
      { intent: 'Calm Piano', asset_type: 'music' },
      ctxFor({})
    );
    assert.equal(out[0].path, '04_Music/Incompetech/Calm Piano.mp3');
    assert.ok(out[0].match_reasons.some((r) => r.includes('provenance KNOWN')));
    assert.ok(out[0].warnings.some((w) => w.includes('attribution required')));
  });
});
