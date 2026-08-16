export const TAB_ROUTES = ['/', '/movies', '/anime', '/tv', '/profile'] as const;

export type TabRoute = (typeof TAB_ROUTES)[number];

export function getTabIndex(pathname: string): number {
  if (pathname === '/') return 0;
  const idx = TAB_ROUTES.findIndex(
    (route, i) => i > 0 && (pathname === route || pathname.startsWith(`${route}/`))
  );
  return idx === -1 ? -1 : idx;
}

export function isTabSwipeEnabled(pathname: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return false;
  }
  const detailPatterns = [
    /^\/movies\/[^/]+$/,
    /^\/series\/[^/]+$/,
    /^\/tv\/[^/]+$/,
    /^\/anime\/[^/]+$/,
    /^\/anime\/watch\//,
  ];
  return !detailPatterns.some((pattern) => pattern.test(pathname));
}
