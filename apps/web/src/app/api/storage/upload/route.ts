/**
 * File upload endpoint — replaces Convex `storage.generateUploadUrl`.
 *
 * POST /api/storage/upload  with multipart form data:
 *   - file: the binary
 *   - filename: optional override
 *
 * Response: { id, url }
 */

import { NextResponse } from 'next/server';
import { uploadFile } from '@pelis/db/storage';
import { getRequestCtx } from '@pelis/db/server';
import { isAdmin } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getRequestCtx(req);
  if (!(await isAdmin(ctx))) {
    return NextResponse.json({ error: 'No autenticado o no admin' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = (form.get('filename') as string | null) ?? file.name;
  const mime = file.type || undefined;
  const result = await uploadFile(buffer, mime, filename);
  return NextResponse.json(result);
}
