import { NextRequest, NextResponse } from 'next/server';
import { findManifestForToken, missingVideoStatus } from '@/lib/movie-stream-paths';
import { denyUnlessStreamAccess } from '@/lib/require-stream-access';

export async function GET(request: NextRequest) {
  const denied = await denyUnlessStreamAccess(request);
  if (denied) return denied;

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const manifest = await findManifestForToken(token);
  if (!manifest) {
    // 404 = this movie has no file; 503 = the video disk is not mounted.
    const missing = await missingVideoStatus();
    return NextResponse.json(
      { url: null, code: missing.code, error: missing.error },
      { status: missing.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      url: manifest ? `/api/stream/${manifest.apiPath}` : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
