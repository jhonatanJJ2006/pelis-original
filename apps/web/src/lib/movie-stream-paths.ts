import { stat } from 'fs/promises';
import path from 'path';

export const MANIFEST_CANDIDATES = ['playlist.m3u8', 'index.m3u8', 'master.m3u8'] as const;

const DEFAULT_ROOTS = ['/run/media/det/Pelis-A/output', '/run/media/det/Pelis-B/output'];

export function getOutputRoots(): string[] {
  const multi = process.env.MOVIE_OUTPUT_ROOTS?.split(':')
    .map((r) => r.trim())
    .filter(Boolean);
  if (multi?.length) return multi;

  const single = process.env.MOVIE_OUTPUT_ROOT?.trim();
  if (single) return [single];

  return DEFAULT_ROOTS;
}

function isSafeRelativePath(relativePath: string): boolean {
  const normalized = path.normalize(relativePath);
  return !normalized.startsWith('..') && !normalized.includes('..');
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

export async function resolveStreamPath(
  relativePath: string
): Promise<{ filePath: string; root: string } | null> {
  if (!isSafeRelativePath(relativePath)) return null;

  for (const root of getOutputRoots()) {
    const filePath = path.join(root, relativePath);
    if (!filePath.startsWith(root)) continue;
    if (await fileExists(filePath)) {
      return { filePath, root };
    }
  }

  return null;
}

function manifestApiPaths(token: string): string[] {
  const paths: string[] = [];
  for (const name of MANIFEST_CANDIDATES) {
    paths.push(`${token}/${token}/${name}`);
    paths.push(`${token}/${name}`);
  }
  return paths;
}

export async function findManifestForToken(
  token: string
): Promise<{ apiPath: string; filePath: string; root: string } | null> {
  if (!isSafeToken(token)) return null;

  for (const apiPath of manifestApiPaths(token)) {
    const resolved = await resolveStreamPath(apiPath);
    if (resolved) {
      return { apiPath, filePath: resolved.filePath, root: resolved.root };
    }
  }

  return null;
}

export function rewriteM3u8Manifest(
  content: string,
  manifestRelativePath: string,
  roots: string[] = getOutputRoots()
): string {
  const manifestDir = path.dirname(manifestRelativePath);
  const normalizedRoots = roots.map((r) => r.replace(/\\/g, '/'));

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      let relativePath = trimmed.replace(/\\/g, '/');

      if (/^https?:\/\//i.test(relativePath)) {
        return line;
      }

      if (path.isAbsolute(trimmed)) {
        const asPosix = trimmed.replace(/\\/g, '/');
        const matchingRoot = normalizedRoots.find((root) => asPosix.startsWith(root));
        if (matchingRoot) {
          relativePath = asPosix.slice(matchingRoot.length).replace(/^\//, '');
        } else {
          relativePath = path.basename(trimmed);
          if (manifestDir && manifestDir !== '.') {
            relativePath = `${manifestDir}/${relativePath}`.replace(/\\/g, '/');
          }
        }
      } else if (manifestDir && manifestDir !== '.') {
        relativePath = `${manifestDir}/${relativePath}`.replace(/\\/g, '/');
      }

      relativePath = relativePath.replace(/^\/+/, '');
      return `/api/stream/${relativePath}`;
    })
    .join('\n');
}

export function parseByteRange(
  rangeHeader: string | null | undefined,
  fileSize: number
): { start: number; end: number } | null {
  if (!rangeHeader || fileSize <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  const hasStart = match[1] !== '';
  const hasEnd = match[2] !== '';
  if (!hasStart && !hasEnd) return null;

  let start: number;
  let end: number;

  if (!hasStart) {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = hasEnd ? Number(match[2]) : fileSize - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    start >= fileSize ||
    end < start
  ) {
    return null;
  }

  return { start, end: Math.min(end, fileSize - 1) };
}
