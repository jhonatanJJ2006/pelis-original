import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  try {
    const res = await fetch(`${origin}/downloads/pelis.apk`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return NextResponse.json(
      { apkAvailable: res.ok },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { apkAvailable: false },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}
