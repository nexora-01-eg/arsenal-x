import { NextRequest, NextResponse } from 'next/server';
import {
  listSources,
  requestAcquisition,
  validateAcquisition,
  quarantineDir,
} from '@/lib/acquire';

export const dynamic = 'force-dynamic';

// Phase 23: acquisition interface + validator. No downloads happen here.
// GET -> configured sources + quarantine presence.
// POST {action:'request', ...} -> queue line or terminal NO_APPROVED_SOURCE.
// POST {action:'validate', ...} -> VALIDATED (registry append) / REJECTED.
export async function GET() {
  const { existsSync } = await import('fs');
  return NextResponse.json({
    sources: listSources(),
    quarantine_present: existsSync(quarantineDir()),
    note: 'No approved source = no acquisition. Execution stays operator-driven.',
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  try {
    if (body.action === 'request') {
      const out = requestAcquisition({
        requirement_id: String(body.requirement_id || ''),
        intent: String(body.intent || ''),
        asset_type: String(body.asset_type || ''),
        specs: (body.specs as Record<string, string | number>) || {},
        source_id: body.source_id ? String(body.source_id) : undefined,
        url: body.url ? String(body.url) : undefined,
        filename: body.filename ? String(body.filename) : undefined,
      });
      return NextResponse.json(out);
    }
    if (body.action === 'validate') {
      const out = validateAcquisition({
        quarantine_rel: String(body.quarantine_rel || ''),
        expected_sha256: body.expected_sha256 ? String(body.expected_sha256) : undefined,
        expected_bytes: body.expected_bytes !== undefined ? Number(body.expected_bytes) : undefined,
        requirement_id: body.requirement_id ? String(body.requirement_id) : undefined,
        source_id: body.source_id ? String(body.source_id) : undefined,
      });
      return NextResponse.json(out, { status: out.status === 'VALIDATED' ? 200 : 422 });
    }
    return NextResponse.json({ error: 'action must be request|validate' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message || e) }, { status: 400 });
  }
}
