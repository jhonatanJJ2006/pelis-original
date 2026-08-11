import { NextRequest, NextResponse } from 'next/server';
import { findManifestForToken, getOutputRoots } from '@/lib/movie-stream-paths';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const manifest = await findManifestForToken(token);

  return NextResponse.json(
    {
      url: manifest ? `/api/stream/${manifest.apiPath}` : null,
      roots: getOutputRoots(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
