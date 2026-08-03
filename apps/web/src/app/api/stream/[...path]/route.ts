import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const OUTPUT_ROOT = process.env.MOVIE_OUTPUT_ROOT || '/run/media/det/Movie/output';

const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.vtt': 'text/vtt',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const raw = params.path.join('/');
  const safe = path.normalize(raw);
  if (safe.startsWith('..') || safe.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const filePath = path.join(OUTPUT_ROOT, safe);
  if (!filePath.startsWith(OUTPUT_ROOT)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = new Headers();
  headers.set('Content-Type', MIME[ext] || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Accept-Ranges', 'bytes');

  const stream = createReadStream(filePath);
  return new NextResponse(stream as any, { status: 200, headers });
}
