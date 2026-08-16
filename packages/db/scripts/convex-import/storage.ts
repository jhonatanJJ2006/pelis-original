import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ConvexDoc } from './read-jsonl.js';
import { readJsonl } from './read-jsonl.js';

export type StorageImportResult = {
  expected: number;
  copied: number;
  skipped: number;
  missing: string[];
};

function repoRootFromScript(): string {
  return join(import.meta.dirname, '..', '..', '..', '..');
}

export function getUploadsDir(): string {
  return join(repoRootFromScript(), 'apps', 'web', 'public', 'uploads');
}

async function findStorageFile(extractDir: string, storageId: string): Promise<string | null> {
  const storageDir = join(extractDir, '_storage');
  const extensions = ['.jpeg', '.jpg', '.png', '.webp', '.gif'];
  for (const ext of extensions) {
    const candidate = join(storageDir, `${storageId}${ext}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next extension
    }
  }
  return null;
}

export async function importStorageFiles(
  extractDir: string,
  referencedIds: Set<string>,
): Promise<StorageImportResult> {
  const metadataPath = join(extractDir, '_storage', 'documents.jsonl');
  let metadata: ConvexDoc[] = [];
  try {
    metadata = await readJsonl(metadataPath);
  } catch {
    console.warn('⚠ No _storage/documents.jsonl found — skipping file import');
    return { expected: referencedIds.size, copied: 0, skipped: 0, missing: [...referencedIds] };
  }

  const uploadsDir = getUploadsDir();
  await fs.mkdir(uploadsDir, { recursive: true });

  const idsToImport = new Set<string>([
    ...metadata.map((doc) => doc._id),
    ...referencedIds,
  ]);

  let copied = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const storageId of idsToImport) {
    const destPath = join(uploadsDir, `${storageId}.webp`);
    try {
      await fs.access(destPath);
      skipped += 1;
      continue;
    } catch {
      // not present yet
    }

    const sourcePath = await findStorageFile(extractDir, storageId);
    if (!sourcePath) {
      if (referencedIds.has(storageId)) {
        missing.push(storageId);
      }
      continue;
    }

    const input = await fs.readFile(sourcePath);
    await sharp(input).webp({ quality: 85 }).toFile(destPath);
    copied += 1;
  }

  return {
    expected: idsToImport.size,
    copied,
    skipped,
    missing,
  };
}

export function collectReferencedStorageIds(docs: ConvexDoc[], fields: string[]): Set<string> {
  const ids = new Set<string>();
  for (const doc of docs) {
    for (const field of fields) {
      const value = doc[field];
      if (typeof value === 'string' && value.length > 0) {
        ids.add(value);
      }
    }
  }
  return ids;
}
