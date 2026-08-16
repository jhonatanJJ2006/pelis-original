import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { access } from 'node:fs/promises';

export type ConvexDoc = Record<string, unknown> & { _id: string; _creationTime?: number };

export async function readJsonl(filePath: string): Promise<ConvexDoc[]> {
  const docs: ConvexDoc[] = [];
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    docs.push(JSON.parse(trimmed) as ConvexDoc);
  }

  return docs;
}

export async function readJsonlIfExists(
  extractDir: string,
  relativePath: string,
): Promise<ConvexDoc[]> {
  const filePath = join(extractDir, relativePath);
  try {
    await access(filePath);
  } catch {
    return [];
  }
  return readJsonl(filePath);
}

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
