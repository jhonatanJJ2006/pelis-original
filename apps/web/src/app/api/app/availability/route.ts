import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

function readJsonFile<T>(relativePath: string, fallback: T): T {
  try {
    const path = join(process.cwd(), 'public', relativePath);
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  const apkAvailable = existsSync(join(process.cwd(), 'public', 'downloads', 'pelis.apk'));

  const webVersion = readJsonFile('version.json', { version: 'unknown', builtAt: null });
  const apkVersion = readJsonFile('downloads/app-version.json', {
    apkVersionCode: 1,
    apkVersionName: '1.0.0',
  });

  return NextResponse.json(
    {
      apkAvailable,
      webVersion: webVersion.version,
      webBuiltAt: webVersion.builtAt,
      apkVersionCode: apkVersion.apkVersionCode,
      apkVersionName: apkVersion.apkVersionName,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    }
  );
}
