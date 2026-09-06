import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

/** Siempre leer disco: version.json / APK versions cambian en deploy sin rebuild. */
export const dynamic = 'force-dynamic';

function readJsonFile<T>(relativePath: string, fallback: T): T {
  try {
    const path = join(process.cwd(), 'public', relativePath);
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  const downloadsDir = join(process.cwd(), 'public', 'downloads');
  const apkAvailable = existsSync(join(downloadsDir, 'pelis.apk'));
  const tvApkAvailable = existsSync(join(downloadsDir, 'pelis-tv.apk'));

  const webVersion = readJsonFile('version.json', { version: 'unknown', builtAt: null });
  const apkVersion = readJsonFile('downloads/app-version.json', {
    apkVersionCode: 1,
    apkVersionName: '1.0.0',
  });
  const tvApkVersion = readJsonFile('downloads/tv-app-version.json', {
    apkVersionCode: 0,
    apkVersionName: '',
  });

  return NextResponse.json(
    {
      apkAvailable,
      tvApkAvailable,
      webVersion: webVersion.version,
      webBuiltAt: webVersion.builtAt,
      apkVersionCode: apkVersion.apkVersionCode,
      apkVersionName: apkVersion.apkVersionName,
      tvApkVersionCode: tvApkAvailable ? tvApkVersion.apkVersionCode : null,
      tvApkVersionName: tvApkAvailable ? tvApkVersion.apkVersionName || null : null,
    },
    {
      headers: {
        // Deploy local (Movies + tunnel): el modal de update necesita la versión
        // fresca del disco, no un JSON cacheado 5 minutos en el borde.
        'Cache-Control': 'no-store, must-revalidate',
      },
    }
  );
}
