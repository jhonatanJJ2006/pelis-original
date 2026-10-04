import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APK_DOWNLOAD_PATH, PRODUCTION_URL, TV_APK_DOWNLOAD_PATH } from './app-download';

function repoRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), '../..')];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'apps/web/src/app/descargar/page.tsx'))) return candidate;
  }
  throw new Error('No se encontró la raíz del repo');
}

const WEB_SRC = join(repoRoot(), 'apps/web/src');
const LANDING = 'app/descargar/page.tsx';
/** Definición de las rutas. No es una página. */
const CONSTANTS = 'lib/app-download.ts';

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function offersApkDownload(source: string): boolean {
  return (
    source.includes('APK_DOWNLOAD_PATH') ||
    source.includes('TV_APK_DOWNLOAD_PATH') ||
    source.includes('/downloads/pelis.apk') ||
    source.includes('/downloads/pelis-tv.apk') ||
    source.includes('downloadPathRef')
  );
}

describe('superficie de descarga de APK en la web', () => {
  it('usa los archivos publicados, sin inventar URLs', () => {
    expect(APK_DOWNLOAD_PATH).toBe('/downloads/pelis.apk');
    expect(TV_APK_DOWNLOAD_PATH).toBe('/downloads/pelis-tv.apk');
    expect(PRODUCTION_URL).toBe('https://verpelis.pro');
  });

  it('la landing enlaza celular y tele', () => {
    const source = readFileSync(join(WEB_SRC, LANDING), 'utf8');
    expect(source).toContain('APK_DOWNLOAD_PATH');
    expect(source).toContain('TV_APK_DOWNLOAD_PATH');
    expect(source).toContain('Descargar para celular');
    expect(source).toContain('Descargar para la tele');
  });

  it('ninguna otra página enlaza los APK', () => {
    const offenders = walk(WEB_SRC)
      .map((file) => relative(WEB_SRC, file))
      .filter((rel) => rel !== LANDING && rel !== CONSTANTS)
      .filter((rel) => offersApkDownload(readFileSync(join(WEB_SRC, rel), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
