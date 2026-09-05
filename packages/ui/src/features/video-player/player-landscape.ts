'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

export type PlayerLandscapeMode = 'off' | 'native' | 'cover' | 'rotate';

/** Tailwind max-md (767px) or a coarse pointer on a compact viewport. */
export const PLAYER_MOBILE_MAX_WIDTH_PX = 767;
export const PLAYER_COARSE_MAX_WIDTH_PX = 1023;

export const PLAYER_LANDSCAPE_COVER_CLASS =
  'fixed inset-0 z-[100] h-[100dvh] w-[100dvw] rounded-none border-0';

export const PLAYER_LANDSCAPE_ROTATE_CLASS = 'fixed z-[100] rounded-none border-0';

/** Last-resort CSS rotate while the phone is still portrait (iOS Safari). */
export const PLAYER_LANDSCAPE_ROTATE_STYLE: CSSProperties = {
  position: 'fixed',
  zIndex: 100,
  top: 0,
  left: '100%',
  width: '100dvh',
  height: '100dvw',
  transform: 'rotate(90deg)',
  transformOrigin: 'top left',
  maxWidth: 'none',
  maxHeight: 'none',
};

type MediaWindow = {
  matchMedia: (query: string) => { matches: boolean };
  innerWidth: number;
  innerHeight: number;
};

function fallbackWindow(): MediaWindow {
  return {
    matchMedia: () => ({ matches: false }),
    innerWidth: 1280,
    innerHeight: 800,
  };
}

export function isMobilePlayerViewport(
  win: MediaWindow = typeof window === 'undefined' ? fallbackWindow() : window,
): boolean {
  try {
    if (win.matchMedia(`(max-width: ${PLAYER_MOBILE_MAX_WIDTH_PX}px)`).matches) return true;
    if (win.matchMedia('(pointer: coarse)').matches && win.innerWidth <= PLAYER_COARSE_MAX_WIDTH_PX) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isLandscapeViewport(size: { width: number; height: number }): boolean {
  return size.width >= size.height;
}

export function pickLandscapeFallback(size: { width: number; height: number }): 'cover' | 'rotate' {
  return isLandscapeViewport(size) ? 'cover' : 'rotate';
}

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type LockableOrientation = {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

export async function requestPlayerFullscreen(
  container: HTMLElement,
  video?: HTMLVideoElement | null,
): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as WebkitDocument;
  if (document.fullscreenElement || doc.webkitFullscreenElement) return true;

  try {
    if (typeof container.requestFullscreen === 'function') {
      await container.requestFullscreen();
      if (document.fullscreenElement || doc.webkitFullscreenElement) return true;
    }
  } catch {
    // iOS Safari rejects element.requestFullscreen()
  }

  const wk = container as WebkitElement;
  const prefixed = wk.webkitRequestFullscreen ?? wk.webkitRequestFullScreen;
  if (prefixed) {
    try {
      await prefixed.call(container);
      if (document.fullscreenElement || doc.webkitFullscreenElement) return true;
    } catch {
      // still iOS
    }
  }

  const wkVideo = video as WebkitVideo | null | undefined;
  if (wkVideo && typeof wkVideo.webkitEnterFullscreen === 'function') {
    try {
      wkVideo.webkitEnterFullscreen();
      return true;
    } catch {
      // video not ready / playsInline policy
    }
  }

  return false;
}

export async function lockLandscapeOrientation(): Promise<boolean> {
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
      return true;
    }
  } catch {
    // iOS Safari, missing user gesture, or already locked
  }
  return false;
}

export async function unlockLandscapeOrientation(): Promise<void> {
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    orientation?.unlock?.();
  } catch {
    // ignore
  }
}

export async function exitPlayerFullscreen(video?: HTMLVideoElement | null): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as WebkitDocument;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // ignore
  }
  try {
    if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === 'function') {
      doc.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
  const wkVideo = video as WebkitVideo | null | undefined;
  try {
    if (wkVideo?.webkitDisplayingFullscreen && typeof wkVideo.webkitExitFullscreen === 'function') {
      wkVideo.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
}

export function landscapeSurfaceProps(mode: PlayerLandscapeMode): {
  className: string;
  style?: CSSProperties;
} {
  if (mode === 'cover') return { className: PLAYER_LANDSCAPE_COVER_CLASS };
  if (mode === 'rotate') {
    return { className: PLAYER_LANDSCAPE_ROTATE_CLASS, style: PLAYER_LANDSCAPE_ROTATE_STYLE };
  }
  return { className: '' };
}

function viewportSize(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useMobileLandscapePlayer({
  containerRef,
  videoRef,
  enabled = true,
  enterOnMount = false,
}: {
  containerRef: RefObject<HTMLElement | null>;
  videoRef?: RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  /** TV / anime watch pages open already in the player. Movies wait for play. */
  enterOnMount?: boolean;
}) {
  const [mode, setMode] = useState<PlayerLandscapeMode>('off');
  const wantedRef = useRef(false);
  const enteringRef = useRef(false);

  const applyFallback = useCallback(() => {
    if (!wantedRef.current) {
      setMode('off');
      return;
    }
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      setMode('native');
      return;
    }
    setMode(pickLandscapeFallback(viewportSize()));
  }, []);

  const enter = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;
    if (!isMobilePlayerViewport()) return;
    wantedRef.current = true;
    if (enteringRef.current) return;
    enteringRef.current = true;
    try {
      const container = containerRef.current;
      const video = videoRef?.current ?? null;
      if (!container) {
        applyFallback();
        return;
      }
      const gotFs = await requestPlayerFullscreen(container, video);
      const locked = await lockLandscapeOrientation();
      if (gotFs) {
        setMode('native');
        if (!locked && !isLandscapeViewport(viewportSize())) {
          if (!document.fullscreenElement) applyFallback();
        }
        return;
      }
      applyFallback();
    } finally {
      enteringRef.current = false;
    }
  }, [applyFallback, containerRef, enabled, videoRef]);

  const exit = useCallback(async () => {
    wantedRef.current = false;
    setMode('off');
    await unlockLandscapeOrientation();
    await exitPlayerFullscreen(videoRef?.current ?? null);
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      wantedRef.current = false;
      setMode('off');
      void unlockLandscapeOrientation();
      void exitPlayerFullscreen(videoRef?.current ?? null);
      return;
    }
    if (typeof window === 'undefined' || !isMobilePlayerViewport()) return;

    const container = containerRef.current;
    const tryEnter = () => {
      void enter();
    };

    if (enterOnMount) {
      wantedRef.current = true;
      applyFallback();
    }

    container?.addEventListener('pointerdown', tryEnter);
    const onPlayCapture = (event: Event) => {
      const video = videoRef?.current;
      if (video && event.target === video) tryEnter();
    };
    window.addEventListener('play', onPlayCapture, true);
    const videoEl = videoRef?.current as EventTarget | null | undefined;
    const onWebkitEnd = () => {
      if (wantedRef.current) applyFallback();
    };
    const onWebkitBegin = () => setMode('native');
    videoEl?.addEventListener('webkitendfullscreen', onWebkitEnd);
    videoEl?.addEventListener('webkitbeginfullscreen', onWebkitBegin);
    const onFs = () => {
      if (document.fullscreenElement) setMode('native');
      else if (wantedRef.current) applyFallback();
      else setMode('off');
    };
    document.addEventListener('fullscreenchange', onFs);
    const onOrient = () => {
      if (!wantedRef.current) return;
      if (document.fullscreenElement) {
        setMode('native');
        return;
      }
      applyFallback();
    };
    window.addEventListener('orientationchange', onOrient);
    window.addEventListener('resize', onOrient);

    return () => {
      container?.removeEventListener('pointerdown', tryEnter);
      window.removeEventListener('play', onPlayCapture, true);
      videoEl?.removeEventListener('webkitendfullscreen', onWebkitEnd);
      videoEl?.removeEventListener('webkitbeginfullscreen', onWebkitBegin);
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('orientationchange', onOrient);
      window.removeEventListener('resize', onOrient);
    };
  }, [applyFallback, containerRef, enabled, enter, enterOnMount, videoRef]);

  useEffect(() => {
    return () => {
      wantedRef.current = false;
      void unlockLandscapeOrientation();
      void exitPlayerFullscreen(videoRef?.current ?? null);
    };
  }, [videoRef]);

  useEffect(() => {
    if (mode === 'off' || typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [mode]);

  const surface = landscapeSurfaceProps(mode);

  return {
    mode,
    landscapeActive: mode !== 'off',
    enter,
    exit,
    surfaceClassName: surface.className,
    surfaceStyle: surface.style,
  };
}
