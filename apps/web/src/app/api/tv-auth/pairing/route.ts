import { NextResponse } from 'next/server';
import {
  buildLinkTvUrl,
  createTvPairing,
  formatPairingCode,
  getTvPairingForDevice,
} from '@pelis/db';
import { resolveRequestOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { deviceId?: string } = {};
  try {
    body = (await req.json()) as { deviceId?: string };
  } catch {
    body = {};
  }

  try {
    const row = await createTvPairing({
      deviceId: body.deviceId,
      userAgent: req.headers.get('user-agent'),
    });
    const origin = resolveRequestOrigin(req);
    const verifyUrl = buildLinkTvUrl(origin, row.code);
    return NextResponse.json({
      code: row.code,
      displayCode: formatPairingCode(row.code),
      deviceId: row.deviceId,
      expiresAt: row.expiresAt.toISOString(),
      verifyUrl,
      status: 'pending',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el código';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const deviceId = url.searchParams.get('deviceId') ?? '';
  const row = await getTvPairingForDevice({ code, deviceId });
  if (!row) {
    return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
  }
  return NextResponse.json({
    status: row.publicStatus,
    expiresAt: row.expiresAt.toISOString(),
  });
}
