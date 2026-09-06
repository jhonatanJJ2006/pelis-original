import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { qrSvg } from '@/lib/qr-svg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = url.searchParams.get('data') ?? url.searchParams.get('url') ?? '';
  if (!data || data.length > 512) {
    return new NextResponse('missing data', { status: 400 });
  }

  let svg: string;
  try {
    svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B0B0D', light: '#F4F1EA' },
    });
  } catch {
    svg = qrSvg(data, 240);
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
