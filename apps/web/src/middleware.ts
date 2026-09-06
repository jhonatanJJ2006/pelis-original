import { NextResponse, type NextRequest } from 'next/server';
import { detectTvDevice, readDeviceOverride, tvColdStartPath } from '@/lib/device-context';

export function middleware(request: NextRequest) {
  const override = readDeviceOverride(request.nextUrl.search);
  const isTv =
    override === 'tv' ||
    (override !== 'web' && detectTvDevice(request.headers.get('user-agent') ?? ''));
  const dest = tvColdStartPath(request.nextUrl.pathname, isTv);
  if (!dest) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = dest;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/'],
};
