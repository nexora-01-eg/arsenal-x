// Phase 21 tests — verification verdicts, uncertainty honesty.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCandidate } from '../lib/verify.ts';

const ENRICHED = {
  status: 'ok',
  technical: { duration: 5.8, width: 1280, height: 720 },
  frames: [{ dark: true, blue_dominant: true }],
  aggregate: { brightness_med: 0.2 },
};

function ctx(meta, exists = true) {
  return {
    enrichByPath: () => meta,
    fileExists: () => exists,
  };
}

describe('visual verification', () => {
  it('PASS when technical + evidence + provenance align', () => {
    const v = verifyCandidate(
      {
        relPath: '04_Music/Incompetech/Calm.mp3',
        duration_min: 1, duration_max: 10,
        semantic_requirements: [],
      },
      ctx({ status: 'ok', technical: { duration: 5 }, frames: [], aggregate: {} })
    );
    assert.equal(v.verdict, 'PASS');
    assert.deepEqual(v.reasons, []);
  });

  it('REJECT on duration mismatch with explicit reason', () => {
    const v = verifyCandidate(
      { relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6 },
      ctx(ENRICHED)
    );
    // 5.8 in [4,6] -> duration passes here; use impossible range instead
    const v2 = verifyCandidate(
      { relPath: 'MH/02-clip.mp4', duration_min: 60, duration_max: 90 },
      ctx(ENRICHED)
    );
    assert.equal(v.verdict, 'CAUTION'); // provenance UNKNOWN, rest passes
    assert.equal(v2.verdict, 'REJECT');
    assert.ok(v2.reasons.some((r) => r.startsWith('REJECT: duration')));
  });

  it('REJECT on aspect mismatch', () => {
    const v = verifyCandidate(
      { relPath: 'MH/09-tall.mp4', aspect_ratio: '16:9' },
      ctx({ status: 'ok', technical: { duration: 12, width: 1080, height: 1920 }, frames: [], aggregate: {} })
    );
    assert.equal(v.verdict, 'REJECT');
    assert.ok(v.reasons.some((r) => r.includes('9:16') && r.includes('16:9')));
  });

  it('REJECT on REVIEW_REQUIRED provenance, never collapsed', () => {
    const v = verifyCandidate(
      { relPath: '04_Music/Incompetech/Revival.mp3', duration_min: 1, duration_max: 400 },
      ctx({ status: 'ok', technical: { duration: 180 }, frames: [], aggregate: {} })
    );
    assert.equal(v.verdict, 'REJECT');
    assert.ok(v.reasons.some((r) => r.includes('REVIEW_REQUIRED')));
  });

  it('UNKNOWN when metadata missing (unenriched)', () => {
    const v = verifyCandidate(
      { relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6, aspect_ratio: '16:9' },
      ctx(null)
    );
    assert.equal(v.verdict, 'UNKNOWN');
    assert.ok(v.checks.some((c) => c.result === 'unknown'));
  });

  it('CAUTION for unknown provenance on otherwise-passing candidate', () => {
    const v = verifyCandidate(
      { relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6 },
      ctx(ENRICHED)
    );
    assert.equal(v.verdict, 'CAUTION');
    assert.ok(v.reasons.some((r) => r.includes('provenance UNKNOWN')));
  });

  it('strict provenance rejects UNKNOWN', () => {
    const v = verifyCandidate(
      {
        relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6,
        allow_unknown_provenance: false,
      },
      ctx(ENRICHED)
    );
    assert.equal(v.verdict, 'REJECT');
  });

  it('missing file rejects explicitly', () => {
    const v = verifyCandidate({ relPath: 'nope/missing.mp4' }, ctx(null, false));
    assert.equal(v.verdict, 'REJECT');
    assert.ok(v.reasons[0].includes('missing file'));
  });

  it('semantic evidence recorded, gaps stay unknown', () => {
    const v = verifyCandidate(
      { relPath: 'MH/02-clip.mp4', semantic_requirements: ['dark', 'server'] },
      ctx(ENRICHED)
    );
    assert.ok(v.checks.some((c) => c.name === 'semantic:dark' && c.result === 'pass'));
    assert.ok(v.checks.some((c) => c.name === 'semantic:server' && c.result === 'unknown'));
  });

  it('deterministic across runs', () => {
    const a = verifyCandidate({ relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6 }, ctx(ENRICHED));
    const b = verifyCandidate({ relPath: 'MH/02-clip.mp4', duration_min: 4, duration_max: 6 }, ctx(ENRICHED));
    assert.deepEqual(a, b);
  });
});
