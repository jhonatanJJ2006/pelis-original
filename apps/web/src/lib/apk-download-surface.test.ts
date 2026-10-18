import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APK_DOWNLOAD_PATH, PRODUCTION_URL, TV_APK_DOWNLOAD_PATH } from './app-download';

function repoRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), '../..')];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'apps/web/src/app/descargas/page.tsx'))) return candidate;
  }
  throw new Error('No se encontró la raíz del repo');
}

const ROOT = repoRoot();
const WEB_SRC = join(ROOT, 'apps/web/src');
const LANDING = 'app/descargas/page.tsx';
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
    source.includes('APK_DOWNLOAD_URL') ||
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

  it('la landing /descargas enlaza celular y TV', () => {
    const source = readFileSync(join(WEB_SRC, LANDING), 'utf8');
    expect(source).toContain('APK_DOWNLOAD_PATH');
    expect(source).toContain('TV_APK_DOWNLOAD_PATH');
    expect(source).toContain('Descargar para celular');
    expect(source).toContain('Descargar para TV');
    expect(source).toContain('App no instalada');
  });

  it('ninguna otra página enlaza los APK', () => {
    const offenders = walk(WEB_SRC)
      .map((file) => relative(WEB_SRC, file).split(sep).join('/'))
      .filter((rel) => rel !== LANDING && rel !== CONSTANTS)
      .filter((rel) => offersApkDownload(readFileSync(join(WEB_SRC, rel), 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('la landing es solo web: vive fuera del chrome de la app y se oculta en la app', () => {
    // Fuera de (protected): sin header/tab bar del catálogo ni footer in-app.
    expect(existsSync(join(WEB_SRC, 'app/(protected)/descargas'))).toBe(false);
    const source = readFileSync(join(WEB_SRC, LANDING), 'utf8');
    // TWA / PWA instalada: `.web-only` se oculta con display-mode standalone.
    expect(source).toContain('web-only');
    // Apps nativas (TV y celular): se detectan por User-Agent en el servidor.
    expect(source).toContain('isPelisAppUserAgent');
    const css = readFileSync(join(WEB_SRC, 'app/globals.css'), 'utf8');
    expect(css).toMatch(
      /display-mode: standalone[^{]*\{\s*\.web-only\s*\{\s*display: none !important/
    );
  });

  it('/descargar redirige de forma permanente a /descargas', () => {
    expect(existsSync(join(WEB_SRC, 'app/descargar'))).toBe(false);
    const config = readFileSync(join(ROOT, 'apps/web/next.config.mjs'), 'utf8');
    expect(config).toMatch(
      /source:\s*'\/descargar',\s*destination:\s*'\/descargas',\s*permanent:\s*true/
    );
  });

  it('/inicio enlaza /descargas solo como web', () => {
    const source = readFileSync(join(WEB_SRC, 'app/inicio/page.tsx'), 'utf8');
    expect(source).toContain('href="/descargas"');
    expect(source).toContain('web-only');
    expect(source).not.toContain('APK_DOWNLOAD');
  });
});
