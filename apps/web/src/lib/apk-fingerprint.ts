import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';

export interface ApkFingerprint {
  sizeBytes: number;
  sha256: string;
}

const cache = new Map<string, { key: string; value: ApkFingerprint }>();

/**
 * Tamaño + SHA-256 del APK publicado, para que la app verifique la descarga
 * antes de abrir el instalador (una descarga cortada da "App no instalada").
 * Se recalcula solo cuando cambian el mtime o el tamaño del archivo.
 */
export async function apkFingerprint(path: string): Promise<ApkFingerprint | null> {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  const key = `${stat.mtimeMs}:${stat.size}`;
  const hit = cache.get(path);
  if (hit?.key === key) return hit.value;

  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve());
  });
  const value = { sizeBytes: stat.size, sha256: hash.digest('hex') };
  cache.set(path, { key, value });
  return value;
}
