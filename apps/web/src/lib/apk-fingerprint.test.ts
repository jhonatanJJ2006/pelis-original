import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apkFingerprint } from './apk-fingerprint';

describe('apkFingerprint', () => {
  it('devuelve tamaño y sha256 del archivo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apk-fp-'));
    const file = join(dir, 'pelis-tv.apk');
    const bytes = Buffer.from('PK\u0003\u0004 contenido de prueba');
    writeFileSync(file, bytes);
    const fp = await apkFingerprint(file);
    expect(fp).toEqual({
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  });

  it('null si el archivo no existe', async () => {
    expect(await apkFingerprint('/no/existe/pelis-tv.apk')).toBeNull();
  });
});
