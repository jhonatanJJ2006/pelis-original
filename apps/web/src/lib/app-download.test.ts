import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANDROID_PACKAGE_ID } from './app-download';

function repoRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), '../..')];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'apps/android/twa-manifest.json'))) {
      return candidate;
    }
  }
  throw new Error('No se encontró la raíz del repo (apps/android/twa-manifest.json)');
}

describe('TWA / Digital Asset Links', () => {
  const root = repoRoot();
  const twaManifest = JSON.parse(
    readFileSync(resolve(root, 'apps/android/twa-manifest.json'), 'utf8')
  ) as {
    packageId: string;
    host: string;
    display: string;
    fallbackType: string;
    fingerprints: Array<{ name: string; value: string }>;
  };
  const assetlinks = JSON.parse(
    readFileSync(resolve(root, 'apps/web/public/.well-known/assetlinks.json'), 'utf8')
  ) as Array<{
    relation: string[];
    target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
  }>;

  it('usa el package TWA pro.verpelis.twa, no el id legado com.pelis.app', () => {
    expect(ANDROID_PACKAGE_ID).toBe('pro.verpelis.twa');
    expect(twaManifest.packageId).toBe(ANDROID_PACKAGE_ID);
    expect(assetlinks[0]?.target.package_name).toBe(ANDROID_PACKAGE_ID);
  });

  it('declara host, standalone y fallback Custom Tabs', () => {
    expect(twaManifest.host).toBe('verpelis.pro');
    expect(twaManifest.display).toBe('standalone');
    expect(twaManifest.fallbackType).toBe('customtabs');
  });

  it('publica SHA256 alineado entre assetlinks y twa-manifest', () => {
    const fingerprint = assetlinks[0]?.target.sha256_cert_fingerprints[0];
    expect(fingerprint).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/);
    expect(assetlinks[0]?.relation).toContain('delegate_permission/common.handle_all_urls');
    expect(assetlinks[0]?.target.namespace).toBe('android_app');
    expect(twaManifest.fingerprints.some((entry) => entry.value === fingerprint)).toBe(true);
  });
});
