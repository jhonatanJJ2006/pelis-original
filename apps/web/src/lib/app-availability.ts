import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { apkFingerprint } from './apk-fingerprint';

/**
 * Estado de las apps publicadas en el deploy local (Movies). Lo comparten
 * `GET /api/app/availability` y la página `/descargas`, así ambas muestran la
 * misma versión y el mismo tamaño que hay en disco.
 */
export interface AppAvailability {
  apkAvailable: boolean;
  tvApkAvailable: boolean;
  webVersion: string;
  webBuiltAt: string | null;
  apkVersionCode: number;
  apkVersionName: string;
  apkSizeBytes: number | null;
  tvApkVersionCode: number | null;
  tvApkVersionName: string | null;
  tvApkSizeBytes: number | null;
  tvApkSha256: string | null;
}

function publicDir(): string {
  return join(process.cwd(), 'public');
}

function readJsonFile<T>(relativePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(publicDir(), relativePath), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function fileSize(path: string): number | null {
  try {
    const stat = statSync(path);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

export async function readAppAvailability(): Promise<AppAvailability> {
  const downloadsDir = join(publicDir(), 'downloads');
  const apkPath = join(downloadsDir, 'pelis.apk');
  const tvApkPath = join(downloadsDir, 'pelis-tv.apk');
  const apkAvailable = existsSync(apkPath);
  const tvApkAvailable = existsSync(tvApkPath);

  const webVersion = readJsonFile<{ version: string; builtAt: string | null }>('version.json', {
    version: 'unknown',
    builtAt: null,
  });
  const apkVersion = readJsonFile('downloads/app-version.json', {
    apkVersionCode: 1,
    apkVersionName: '1.0.0',
  });
  const tvApkVersion = readJsonFile('downloads/tv-app-version.json', {
    apkVersionCode: 0,
    apkVersionName: '',
  });

  // La app de TV verifica tamaño y hash antes de abrir el instalador.
  const tvApk = tvApkAvailable ? await apkFingerprint(tvApkPath) : null;

  return {
    apkAvailable,
    tvApkAvailable,
    webVersion: webVersion.version,
    webBuiltAt: webVersion.builtAt,
    apkVersionCode: apkVersion.apkVersionCode,
    apkVersionName: apkVersion.apkVersionName,
    apkSizeBytes: apkAvailable ? fileSize(apkPath) : null,
    tvApkVersionCode: tvApkAvailable ? tvApkVersion.apkVersionCode : null,
    tvApkVersionName: tvApkAvailable ? tvApkVersion.apkVersionName || null : null,
    tvApkSizeBytes: tvApk?.sizeBytes ?? null,
    tvApkSha256: tvApk?.sha256 ?? null,
  };
}

/** "10,4 MB" — tamaño legible en español. */
export function formatMegabytes(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  const value = mb >= 10 ? mb.toFixed(0) : mb.toFixed(1);
  return `${value.replace('.', ',')} MB`;
}
