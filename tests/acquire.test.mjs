// Phase 23 tests — acquisition interface honesty + validator.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listSources,
  requestAcquisition,
  validateAcquisition,
  quarantineDir,
} from '../lib/acquire.ts';
import { setArsenalRoot, clearArsenalRootOverride } from '../lib/config.ts';
import { refreshRoot } from '../lib/indexer.ts';

describe('acquisition interface', () => {
  it('no configured sources by default: terminal NO_APPROVED_SOURCE', () => {
    assert.deepEqual(listSources(), []);
    const out = requestAcquisition({
      requirement_id: 'req-001',
      intent: 'server room clip',
      asset_type: 'video',
    });
    assert.equal(out.status, 'NO_APPROVED_SOURCE');
    assert.ok(out.detail.includes('No approved acquisition source'));
  });

  it('unapproved source id is rejected without downloading', () => {
    const out = requestAcquisition({
      requirement_id: 'req-002',
      intent: 'x',
      asset_type: 'video',
      source_id: 'random-site',
      url: 'https://example.com/a.mp4',
    });
    assert.equal(out.status, 'SOURCE_NOT_APPROVED');
  });

  it('validator rejects quarantine escape + absent files', () => {
    const esc = validateAcquisition({ quarantine_rel: '../../evil.mp4' });
    assert.equal(esc.status, 'REJECTED');
    assert.ok(esc.reasons.some((r) => r.includes('quarantine')));
    const missing = validateAcquisition({ quarantine_rel: 'nope.mp4' });
    assert.equal(missing.status, 'REJECTED');
  });

  it('validator checks hash/size/type on a real quarantine file', () => {
    const root = mkdtempSync(join(tmpdir(), 'ax-acq-'));
    const fakeProj = join(root, '_projects', 'arsenal-x', 'data', 'acquire', 'quarantine');
    mkdirSync(fakeProj, { recursive: true });
    writeFileSync(join(fakeProj, 'clip.mp4'), Buffer.alloc(2048, 7));
    setArsenalRoot(root);
    refreshRoot();
    try {
      const badHash = validateAcquisition({
        quarantine_rel: 'clip.mp4', expected_sha256: '0'.repeat(64),
      });
      assert.equal(badHash.status, 'REJECTED');
      assert.ok(badHash.reasons.some((r) => r.includes('sha256')));
      const badSize = validateAcquisition({ quarantine_rel: 'clip.mp4', expected_bytes: 1 });
      assert.equal(badSize.status, 'REJECTED');
      const ok = validateAcquisition({
        quarantine_rel: 'clip.mp4', expected_bytes: 2048,
        requirement_id: 'req-009', source_id: 'test-src',
      });
      assert.equal(ok.status, 'VALIDATED');
      assert.equal(ok.record.asset_type, 'video');
      assert.match(ok.record.sha256, /^[0-9a-f]{64}$/);
    } finally {
      clearArsenalRootOverride();
      refreshRoot();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('approved source yields a queue line without downloading', () => {
    const root = mkdtempSync(join(tmpdir(), 'ax-acqsrc-'));
    const dir = join(root, '_projects', 'arsenal-x', 'data', 'acquire');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'acquisition-sources.json'), JSON.stringify([{
      id: 'test-src', name: 'Test Source', kind: 'test',
      base_url: 'https://example.com', license_default: 'TEST',
      attribution_default: '', approved: true, notes: 'test only',
    }]));
    setArsenalRoot(root);
    refreshRoot();
    try {
      assert.deepEqual(listSources().map((s) => s.id), ['test-src']);
      const out = requestAcquisition({
        requirement_id: 'req-003', intent: 'server room clip', asset_type: 'video',
        source_id: 'test-src', url: 'https://example.com/clip.mp4', filename: 'clip.mp4',
      });
      assert.equal(out.status, 'QUEUED_FOR_OPERATOR');
      assert.ok(out.queue_line.includes('https://example.com/clip.mp4'));
      assert.ok(out.queue_line.split('|').length === 3);
    } finally {
      clearArsenalRootOverride();
      refreshRoot();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('non-https URLs fail loudly', () => {
    const root = mkdtempSync(join(tmpdir(), 'ax-acqhttp-'));
    const dir = join(root, '_projects', 'arsenal-x', 'data', 'acquire');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'acquisition-sources.json'), JSON.stringify([{
      id: 's', name: 'S', kind: 'test', base_url: 'https://example.com',
      license_default: '', attribution_default: '', approved: true, notes: '',
    }]));
    setArsenalRoot(root);
    refreshRoot();
    try {
      assert.throws(
        () => requestAcquisition({
          requirement_id: 'r', intent: 'x', asset_type: 'video',
          source_id: 's', url: 'http://insecure.example/a.mp4',
        }),
        /https/
      );
    } finally {
      clearArsenalRootOverride();
      refreshRoot();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
