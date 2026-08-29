import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  getOutputRoots,
  resolveStreamPath,
  rewriteM3u8Manifest,
} from '@/lib/movie-stream-paths';
import { denyUnlessStreamAccess } from '@/lib/require-stream-access';

const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.vtt': 'text/vtt',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return serveStreamFile(_req, params);
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return serveStreamFile(req, params, { headOnly: true });
}

async function serveStreamFile(
  req: NextRequest,
  params: { path: string[] },
  options?: { headOnly?: boolean }
) {
  const denied = await denyUnlessStreamAccess(req);
  if (denied) return denied;

  const raw = params.path.join('/');
  const resolved = await resolveStreamPath(raw);

  if (!resolved) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { filePath } = resolved;
  const ext = path.extname(filePath).toLowerCase();
  const headers = new Headers();
  headers.set('Content-Type', MIME[ext] || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Accept-Ranges', 'bytes');

  if (ext === '.m3u8') {
    if (options?.headOnly) {
      return new NextResponse(null, { status: 200, headers });
    }
    const content = await readFile(filePath, 'utf8');
    const rewritten = rewriteM3u8Manifest(content, raw.replace(/\\/g, '/'), getOutputRoots());
    return new NextResponse(rewritten, { status: 200, headers });
  }

  if (options?.headOnly) {
    return new NextResponse(null, { status: 200, headers });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(stream as any, { status: 200, headers });
}
