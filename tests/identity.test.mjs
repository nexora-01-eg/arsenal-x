// Phase 18 tests — identity, provenance, types, risk (Tests C, D, E, F).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sha256File,
  duplicateGroupId,
  normalizeAssetType,
  provenanceFor,
  riskFor,
  sensitivityFor,
  identifyAsset,
} from '../lib/assetIdentity.ts';

function tmp2(contentsA, contentsB) {
  const dir = mkdtempSync(join(tmpdir(), 'ax-id-'));
  const a = join(dir, 'a.bin');
  const b = join(dir, 'b.bin');
  writeFileSync(a, contentsA);
  writeFileSync(b, contentsB);
  return [a, b];
}

describe('canonical asset identity', () => {
  it('C: byte-identical files share hash + duplicate group', async () => {
    const [a, b] = tmp2('identical-bytes', 'identical-bytes');
    const ha = await sha256File(a);
    const hb = await sha256File(b);
    assert.equal(ha, hb);
    assert.equal(duplicateGroupId(ha), duplicateGroupId(hb));
    assert.match(ha, /^[0-9a-f]{64}$/);
  });

  it('D: different files do not collide', async () => {
    const [a, b] = tmp2('content-one', 'content-two');
    assert.notEqual(await sha256File(a), await sha256File(b));
  });

  it('identifyAsset builds a full record with UNKNOWN semantics', async () => {
    const [a] = tmp2('hello-asset', 'hello-asset');
    const rec = await identifyAsset({
      absPath: a,
      relPath: 'MH - محتوى بصري\\02-فيديو\\clip.mp4',
      assetId: 'X-VID-0001',
      source: 'test',
    });
    assert.equal(rec.asset_id, 'X-VID-0001');
    assert.equal(rec.original_filename, 'a.bin');
    assert.equal(rec.semantic_status, 'UNKNOWN');
    assert.equal(rec.duplicate_group_id, duplicateGroupId(rec.sha256));
    assert.ok(rec.size_bytes > 0);
    assert.ok(!Number.isNaN(Date.parse(rec.modified_time)));
  });

  it('normalizeAssetType covers the 14 classes; unknown stays unknown', () => {
    assert.equal(normalizeAssetType('mp4'), 'video');
    assert.equal(normalizeAssetType('.JPG'), 'image');
    assert.equal(normalizeAssetType('mp3', '04_Music/Incompetech/x.mp3'), 'music');
    assert.equal(normalizeAssetType('wav', '03_SFX/pack/y.wav'), 'sfx');
    assert.equal(normalizeAssetType('mp3', 'random/folder/z.mp3'), 'audio');
    assert.equal(normalizeAssetType('ttf'), 'font');
    assert.equal(normalizeAssetType('svg'), 'icon');
    assert.equal(normalizeAssetType('cube'), 'lut');
    assert.equal(normalizeAssetType('glb'), 'model3d');
    assert.equal(normalizeAssetType('onnx'), 'model');
    assert.equal(normalizeAssetType('html'), 'template');
    assert.equal(normalizeAssetType('md'), 'document');
    assert.equal(normalizeAssetType('zip'), 'archive');
    assert.equal(normalizeAssetType('lottie'), 'motion');
    assert.equal(normalizeAssetType('xyz'), 'unknown');
    assert.equal(normalizeAssetType(''), 'unknown');
  });

  it('E: unknown provenance stays UNKNOWN (never safe-by-default)', () => {
    const p = provenanceFor('some/random/file.mp4');
    assert.equal(p.provenance_status, 'UNKNOWN');
    assert.equal(p.license_name, 'UNKNOWN');
    assert.equal(p.attribution_required, false);
    assert.match(p.provenance_notes, /Do NOT treat as safe/);
  });

  it('known Incompetech source requires attribution', () => {
    const p = provenanceFor('04_Music/Incompetech/Track.mp3');
    assert.equal(p.provenance_status, 'KNOWN');
    assert.equal(p.attribution_required, true);
  });

  it('outro-contaminated tracks are REVIEW_REQUIRED', () => {
    for (const n of ['Revival.mp3', 'Suave Standpipe.mp3', 'Dreamy Flashback.mp3']) {
      const r = riskFor(`04_Music\\Incompetech\\${n}`);
      assert.equal(r.level, 'REVIEW_REQUIRED', n);
      assert.match(r.reason, /outro/);
    }
    assert.equal(riskFor('04_Music\\Incompetech\\Air Prelude.mp3').level, 'OK');
  });

  it('known personal-data photo is sensitive; others standard', () => {
    assert.equal(
      sensitivityFor('MH - محتوى بصري\\01-صور\\736x1040 light-gray-vertical-photo-8.jpg'),
      'sensitive'
    );
    assert.equal(sensitivityFor('MH - محتوى بصري\\01-صور\\other.jpg'), 'standard');
  });
});
