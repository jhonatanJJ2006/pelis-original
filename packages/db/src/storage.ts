import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

/**
 * Local file storage. Replaces Convex _storage.
 *
 * Files live under <project>/apps/web/public/uploads/<id>.webp
 * and are served by Next.js as static assets at /uploads/<id>.webp.
 *
 * Resolve el directorio de uploads buscando hacia arriba hasta encontrar
 * `apps/web/public/uploads`. Esto permite ejecutar tanto desde la raíz del
 * monorepo (`pnpm dev`) como desde `apps/web/` (`next dev` directo).
 */

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
  // Fallback: crear bajo cwd/public/uploads (modo dev desde raíz).
  return candidates[0]!;
}

const UPLOAD_DIR = resolve(findUploadsDir());

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function uploadFile(
  data: Buffer | Uint8Array,
  _mimeType?: string,
  _filename?: string,
): Promise<{ id: string; url: string }> {
  await ensureDir();
  const id = randomUUID().replace(/-/g, '');
  const path = join(UPLOAD_DIR, `${id}.webp`);
  await fs.writeFile(path, data);
  return { id, url: `/uploads/${id}.webp` };
}

export async function deleteFile(id: string): Promise<void> {
  const path = join(UPLOAD_DIR, `${id}.webp`);
  try {
    await fs.unlink(path);
  } catch {
    // already gone
  }
}

export function getFileUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  return `/uploads/${id}.webp`;
}

export function hashContent(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}