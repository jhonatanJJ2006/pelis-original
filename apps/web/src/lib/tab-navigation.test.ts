import { describe, it, expect } from 'vitest';
import { TAB_ROUTES, getTabIndex, isTabSwipeEnabled } from './tab-navigation';

describe('getTabIndex', () => {
  it('maps the home route to index 0', () => {
    expect(getTabIndex('/')).toBe(0);
  });

  it('maps tab routes to their position in TAB_ROUTES', () => {
    TAB_ROUTES.forEach((route, index) => {
      if (route === '/') return;
      expect(getTabIndex(route)).toBe(index);
    });
  });

  it('maps nested paths under a tab route to the same tab', () => {
    expect(getTabIndex('/movies/123')).toBe(TAB_ROUTES.indexOf('/movies'));
    expect(getTabIndex('/series/abc')).toBe(TAB_ROUTES.indexOf('/series'));
    expect(getTabIndex('/anime/watch/9/1')).toBe(TAB_ROUTES.indexOf('/anime'));
    expect(getTabIndex('/tv/disney')).toBe(TAB_ROUTES.indexOf('/tv'));
  });

  it('places series between movies and anime, matching the desktop order', () => {
    const movies = TAB_ROUTES.indexOf('/movies');
    const series = TAB_ROUTES.indexOf('/series');
    const anime = TAB_ROUTES.indexOf('/anime');
    expect(series).toBeGreaterThan(movies);
    expect(series).toBeLessThan(anime);
    expect(TAB_ROUTES.indexOf('/tv')).toBeGreaterThan(series);
  });

  it('returns -1 for unknown routes', () => {
    expect(getTabIndex('/whatever')).toBe(-1);
    expect(getTabIndex('/admin')).toBe(-1);
  });
});

describe('isTabSwipeEnabled', () => {
  it('enables swipe on list and home pages', () => {
    expect(isTabSwipeEnabled('/')).toBe(true);
    expect(isTabSwipeEnabled('/movies')).toBe(true);
    expect(isTabSwipeEnabled('/series')).toBe(true);
    expect(isTabSwipeEnabled('/anime')).toBe(true);
    expect(isTabSwipeEnabled('/tv')).toBe(true);
    expect(isTabSwipeEnabled('/profile')).toBe(true);
  });

  it('disables swipe on detail pages', () => {
    expect(isTabSwipeEnabled('/movies/abc')).toBe(false);
    expect(isTabSwipeEnabled('/series/abc')).toBe(false);
    expect(isTabSwipeEnabled('/tv/abc')).toBe(false);
    expect(isTabSwipeEnabled('/anime/abc')).toBe(false);
    expect(isTabSwipeEnabled('/anime/watch/abc/1')).toBe(false);
  });

  it('disables swipe on admin, login and register', () => {
    expect(isTabSwipeEnabled('/admin')).toBe(false);
    expect(isTabSwipeEnabled('/admin/movies')).toBe(false);
    expect(isTabSwipeEnabled('/login')).toBe(false);
    expect(isTabSwipeEnabled('/register')).toBe(false);
  });
});
