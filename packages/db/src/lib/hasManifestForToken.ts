import { stat } from 'fs/promises';
import path from 'path';

const MANIFEST_CANDIDATES = ['playlist.m3u8', 'index.m3u8', 'master.m3u8'] as const;
const DEFAULT_ROOTS = ['/run/media/det/Pelis-A/output', '/run/media/det/Pelis-B/output'];

function getOutputRoots(): string[] {
  const multi = process.env.MOVIE_OUTPUT_ROOTS?.split(':')
    .map((r) => r.trim())
    .filter(Boolean);
  if (multi?.length) return multi;

  const single = process.env.MOVIE_OUTPUT_ROOT?.trim();
  if (single) return [single];

  return DEFAULT_ROOTS;
}

function isSafeToken(token: string): boolean {
  const normalized = path.normalize(token);
  return (
    Boolean(token) &&
    !normalized.startsWith('..') &&
    !normalized.includes('..') &&
    !normalized.includes('/')
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function manifestRelativePaths(token: string): string[] {
  const paths: string[] = [];
  for (const name of MANIFEST_CANDIDATES) {
    paths.push(`${token}/${token}/${name}`);
    paths.push(`${token}/${name}`);
  }
  return paths;
}

/** True when an HLS manifest exists on disk for this movie token. */
export async function hasManifestForToken(token: string): Promise<boolean> {
  if (!isSafeToken(token)) return false;

  for (const root of getOutputRoots()) {
    for (const relative of manifestRelativePaths(token)) {
      const filePath = path.join(root, relative);
      if (!filePath.startsWith(root)) continue;
      if (await fileExists(filePath)) return true;
    }
  }
  return false;
}
