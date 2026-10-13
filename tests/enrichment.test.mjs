// Phase 19 tests — enrichment records, determinism, resume, honesty.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { arsenalRoot } from '../lib/config.ts';
import {
  enrichmentFor,
  enrichmentCount,
  clearEnrichmentCache,
  enrichAsset,
} from '../lib/enrichment.ts';

const DATA = join(arsenalRoot(), '_projects', 'arsenal-x', 'data', 'enrichment');

function fp(rel, size, mtimeInt) {
  const h = createHash('sha256');
  h.update(rel, 'utf8');
  h.update(String(size));
  h.update(String(mtimeInt));
  h.update('enrich-1.0.0');
  return h.digest('hex').slice(0, 32);
}

describe('enrichment corpus', () => {
  it('records + checkpoint exist and counts add up', () => {
    assert.ok(existsSync(join(DATA, 'records.jsonl')));
    const cp = JSON.parse(readFileSync(join(DATA, 'checkpoint.json'), 'utf8'));
    assert.equal(cp.version, 'enrich-1.0.0');
    const { ok, failed } = enrichmentCount();
    assert.ok(ok > 400, `ok=${ok}`);
    assert.equal(Object.keys(cp.done).length, ok + failed);
  });

  it('ok records carry full evidence schema', () => {
    clearEnrichmentCache();
    const recs = readFileSync(join(DATA, 'records.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const oks = recs.filter((r) => r.status === 'ok');
    assert.ok(oks.length > 0);
    for (const r of oks.slice(0, 60)) {
      assert.ok(r.relPath && r.enrichment_id && r.fingerprint);
      if (r.kind === 'video') {
        assert.ok(r.technical && Array.isArray(r.frames) && r.frames.length > 0);
        for (const f of r.frames) {
          for (const k of ['brightness', 'palette', 'dhash', 'thumb']) {
            assert.ok(f[k] !== undefined, `${r.relPath} frame missing ${k}`);
          }
        }
      }
      if (r.kind === 'audio') {
        assert.ok(r.descriptors && typeof r.descriptors.centroid_hz === 'number');
      }
    }
  });

  it('enrichment identity is deterministic (recomputed from file stat)', () => {
    const recs = readFileSync(join(DATA, 'records.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((r) => r.status === 'ok');
    for (const r of recs.slice(0, 5)) {
      const st = statSync(join(arsenalRoot(), r.relPath));
      assert.equal(r.fingerprint, fp(r.relPath, st.size, Math.floor(st.mtimeMs / 1000)));
      assert.equal(r.enrichment_id, 'enr-' + r.fingerprint.slice(0, 16));
    }
  });

  it('semantic honesty: PARTIAL at best, labels never invented', () => {
    const recs = readFileSync(join(DATA, 'records.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
    for (const r of recs) {
      assert.ok(['PARTIAL', 'UNKNOWN'].includes(r.semantic_status), r.relPath);
      assert.deepEqual(r.semantic_labels || [], []);
      if (r.status === 'failed') {
        assert.ok(r.error, r.relPath);
        assert.equal(r.semantic_status, 'UNKNOWN');
      }
    }
  });

  it('enrichAsset contract attaches measurements, invents nothing', async () => {
    const rec = await enrichAsset({
      original_path: join(arsenalRoot(), 'MH - محتوى بصري', '02-فيديو', 'x.mp4'),
      original_filename: 'x.mp4',
    });
    assert.equal(rec.description, '');
    assert.deepEqual(rec.tags, []);
    assert.equal(rec.confidence, 0);
    assert.equal(rec.embedding_ref, '');
  });

  it('enrichmentFor serves records by relative path', () => {
    clearEnrichmentCache();
    const recs = readFileSync(join(DATA, 'records.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const first = recs.find((r) => r.status === 'ok');
    const got = enrichmentFor(first.relPath);
    assert.equal(got.enrichment_id, first.enrichment_id);
    assert.equal(enrichmentFor('no/such/file.mp4'), null);
  });

  it('separator normalization: index-style slashes resolve OS records', () => {
    clearEnrichmentCache();
    const recs = readFileSync(join(DATA, 'records.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const first = recs.find((r) => r.status === 'ok');
    const slashed = first.relPath.replace(/\\/g, '/');
    assert.ok(slashed.includes('/'), 'fixture must contain a separator');
    const got = enrichmentFor(slashed);
    assert.ok(got, 'forward-slash lookup must resolve');
    assert.equal(got.enrichment_id, first.enrichment_id);
  });
});
