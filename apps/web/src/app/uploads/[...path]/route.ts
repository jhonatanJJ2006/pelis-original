/**
 * Dynamic handler for /uploads/* — reads files from
 * apps/web/public/uploads/ at request time so that files added after the
 * Next.js server started (e.g. TMDB backdrop enrichments) are served without
 * a `systemctl restart pelis-web`.
 *
 * Next.js resolves a route at `app/uploads/[...path]/route.ts` BEFORE the
 * static `public/uploads/` directory, so this handler takes precedence over
 * the cached-at-startup static files.
 */
import { NextResponse } from 'next/server';
import { promises as fs, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function findUploadsDir(): string {
  const candidates = [
    join(process.cwd(), 'public', 'uploads'),
    join(process.cwd(), 'apps', 'web', 'public', 'uploads'),
  ];
  for (const c of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('node:fs').accessSync(c);
      return c;
    } catch {
      // keep searching
    }
  }
  return candidates[0]!;
}

const UPLOADS_DIR = resolve(findUploadsDir());

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function isInside(base: string, target: string): boolean {
  const baseNorm = normalize(base) + sep;
  const targetNorm = normalize(target);
  return targetNorm === normalize(base) || targetNorm.startsWith(baseNorm);
}

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  const segments = params.path ?? [];
  if (segments.length === 0) {
    return new NextResponse('not found', { status: 404 });
  }

  const rel = segments.map((s) => normalize(s)).join('/');
  if (rel.split('/').some((s) => s === '..' || s === '')) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const filePath = join(UPLOADS_DIR, rel);
  if (!isInside(UPLOADS_DIR, filePath)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  let stat: import('node:fs').Stats;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
  if (!stat.isFile()) {
    return new NextResponse('not found', { status: 404 });
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'content-type': contentType,
      'content-length': String(stat.size),
      'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
      'accept-ranges': 'none',
    },
  });
}
