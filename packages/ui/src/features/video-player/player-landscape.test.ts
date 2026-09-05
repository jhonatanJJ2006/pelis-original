import { describe, expect, it } from 'vitest';
import {
  PLAYER_LANDSCAPE_COVER_CLASS,
  PLAYER_LANDSCAPE_ROTATE_STYLE,
  isLandscapeViewport,
  isMobilePlayerViewport,
  landscapeSurfaceProps,
  pickLandscapeFallback,
} from './player-landscape';

function fakeWindow(opts: {
  maxMd?: boolean;
  coarse?: boolean;
  width?: number;
  height?: number;
}) {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 800;
  return {
    innerWidth: width,
    innerHeight: height,
    matchMedia: (query: string) => {
      if (query.includes('max-width: 767px')) return { matches: Boolean(opts.maxMd) };
      if (query.includes('pointer: coarse')) return { matches: Boolean(opts.coarse) };
      return { matches: false };
    },
  };
}

describe('isMobilePlayerViewport', () => {
  it('treats max-md viewports as mobile', () => {
    expect(isMobilePlayerViewport(fakeWindow({ maxMd: true, width: 390 }))).toBe(true);
  });

  it('treats coarse pointers on compact screens as mobile', () => {
    expect(isMobilePlayerViewport(fakeWindow({ coarse: true, width: 820 }))).toBe(true);
  });

  it('ignores desktop fine pointers', () => {
    expect(isMobilePlayerViewport(fakeWindow({ width: 1440 }))).toBe(false);
  });
});

describe('pickLandscapeFallback', () => {
  it('covers the viewport when it is already landscape', () => {
    expect(pickLandscapeFallback({ width: 844, height: 390 })).toBe('cover');
    expect(isLandscapeViewport({ width: 844, height: 390 })).toBe(true);
  });

  it('rotates when the phone is still portrait (iOS lock failure)', () => {
    expect(pickLandscapeFallback({ width: 390, height: 844 })).toBe('rotate');
  });
});

describe('landscapeSurfaceProps', () => {
  it('uses a fixed full-viewport cover', () => {
    const props = landscapeSurfaceProps('cover');
    expect(props.className).toBe(PLAYER_LANDSCAPE_COVER_CLASS);
    expect(props.className).toContain('fixed');
    expect(props.className).toContain('inset-0');
    expect(props.className).toContain('z-[100]');
    expect(props.className).toContain('w-[100dvw]');
    expect(props.className).toContain('h-[100dvh]');
  });

  it('rotates the stage 90deg as a last resort', () => {
    const props = landscapeSurfaceProps('rotate');
    expect(props.style).toMatchObject(PLAYER_LANDSCAPE_ROTATE_STYLE);
    expect(props.style?.transform).toBe('rotate(90deg)');
  });

  it('adds no overlay when native fullscreen is active', () => {
    expect(landscapeSurfaceProps('native')).toEqual({ className: '' });
    expect(landscapeSurfaceProps('off')).toEqual({ className: '' });
  });
});
