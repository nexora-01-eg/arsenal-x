// Phase 22 tests — deterministic requirement planning + traceability.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { planRequirements } from '../lib/plan.ts';

describe('requirement planner', () => {
  it('AI infrastructure intent yields the documented requirement set', () => {
    const reqs = planRequirements({ intent: 'The speaker explains AI infrastructure.' });
    const labels = reqs.map((r) => r.label);
    for (const want of ['futuristic server room', 'AI chip close-up', 'data-center corridor', 'subtle technology background']) {
      assert.ok(labels.includes(want), `missing ${want}`);
    }
    const brolls = reqs.filter((r) => r.kind === 'BROLL');
    assert.ok(brolls.every((r) => r.priority === 'primary'));
    assert.ok(brolls.every((r) => r.trigger === 'topic:technology'));
    assert.ok(reqs.some((r) => r.kind === 'MUSIC'));
    assert.ok(reqs.some((r) => r.kind === 'TRANSITION'));
    assert.ok(reqs.some((r) => r.kind === 'CAPTION_FONT'));
  });

  it('every requirement traces to intent with a trigger + valid request', () => {
    const reqs = planRequirements({ intent: 'City finance update', style: 'corporate' });
    assert.ok(reqs.length > 0);
    for (const r of reqs) {
      assert.match(r.id, /^req-\d{3}$/);
      assert.equal(r.source_intent, 'City finance update');
      assert.ok(r.trigger.length > 0);
      assert.ok(r.request.intent.length > 0);
    }
    const kinds = new Set(reqs.map((r) => r.kind));
    assert.ok(kinds.has('BROLL') && kinds.has('MUSIC'));
  });

  it('Arabic intent selects an Arabic caption font', () => {
    const reqs = planRequirements({ intent: 'شرح البنية التحتية للذكاء الاصطناعي' });
    const font = reqs.find((r) => r.kind === 'CAPTION_FONT');
    assert.ok(font);
    assert.equal(font.trigger, 'script:arabic-detected');
    assert.match(font.request.intent, /arabic/);
  });

  it('shorts platform forces vertical, drops intro/outro', () => {
    const reqs = planRequirements({ intent: 'quick tech tip', platform: 'shorts' });
    for (const r of reqs) {
      if (r.request.aspect_ratio) assert.equal(r.request.aspect_ratio, '9:16');
    }
    assert.ok(!reqs.some((r) => r.kind === 'INTRO' || r.kind === 'OUTRO'));
  });

  it('deterministic across runs; empty intent degrades to defaults', () => {
    const a = planRequirements({ intent: 'markets today', style: 'corporate' });
    const b = planRequirements({ intent: 'markets today', style: 'corporate' });
    assert.deepEqual(a, b);
    const empty = planRequirements({ intent: '' });
    assert.ok(empty.some((r) => r.kind === 'MUSIC'));
    assert.ok(empty.some((r) => r.kind === 'CAPTION_FONT'));
  });
});
