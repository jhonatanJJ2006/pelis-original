import { NextRequest, NextResponse } from 'next/server';
import { findManifestForToken } from '@/lib/movie-stream-paths';
import { denyUnlessStreamAccess } from '@/lib/require-stream-access';

export async function GET(request: NextRequest) {
  const denied = await denyUnlessStreamAccess(request);
  if (denied) return denied;

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const manifest = await findManifestForToken(token);

  return NextResponse.json(
    {
      url: manifest ? `/api/stream/${manifest.apiPath}` : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
