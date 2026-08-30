'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Sun, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../shared/utils';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from './player-chrome';

export const PLAYER_GESTURE_DEAD_ZONE_PX = 12;
export const PLAYER_GESTURE_RANGE_PX = 220;

export type PlayerGestureKind = 'brightness' | 'volume';

export interface PlayerGestureHudState {
  kind: PlayerGestureKind;
  value: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifySurfaceDrag(
  dx: number,
  dy: number,
  startX: number,
  width: number,
): PlayerGestureKind | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absY < PLAYER_GESTURE_DEAD_ZONE_PX) return null;
  if (absY <= absX) return null;
  if (!Number.isFinite(width) || width <= 0) return null;
  return startX < width / 2 ? 'brightness' : 'volume';
}

export function applyVerticalDrag(kind: PlayerGestureKind, startValue: number, dy: number): number {
  const delta = -dy / PLAYER_GESTURE_RANGE_PX;
  if (kind === 'brightness') {
    return clamp(
      startValue + delta * (BRIGHTNESS_MAX - BRIGHTNESS_MIN),
      BRIGHTNESS_MIN,
      BRIGHTNESS_MAX,
    );
  }
  return clamp(startValue + delta, 0, 1);
}

export function gesturePercent(kind: PlayerGestureKind, value: number): number {
  if (kind === 'brightness') {
    return Math.round(((value - BRIGHTNESS_MIN) / (BRIGHTNESS_MAX - BRIGHTNESS_MIN)) * 100);
  }
  return Math.round(value * 100);
}

export function isPlayerGestureIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-player-chrome], [data-player-no-gesture]'));
}

export const PLAYER_GESTURE_HUD_FRAME_CLASS =
  'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 top-[max(1rem,env(safe-area-inset-top,0px))] transition-opacity duration-300 ease-out';

export const PLAYER_GESTURE_HUD_PILL_CLASS =
  'flex items-center gap-2.5 rounded-full border border-cinema-accent/30 bg-cinema-bg/85 px-3 py-1.5 shadow-[0_8px_32px_rgba(11,11,13,0.55)] backdrop-blur-sm';

export const PLAYER_GESTURE_HUD_BAR_CLASS =
  'relative h-1.5 w-28 overflow-hidden rounded-full bg-white/15';

export const PLAYER_GESTURE_HUD_FILL_CLASS =
  'absolute inset-y-0 left-0 rounded-full bg-cinema-accent';

export function PlayerGestureHud({
  kind,
  value,
  visible,
}: {
  kind: PlayerGestureKind;
  value: number;
  visible: boolean;
}) {
  const percent = gesturePercent(kind, value);
  const Icon = kind === 'brightness' ? Sun : value <= 0.001 ? VolumeX : Volume2;
  const label = kind === 'brightness' ? 'Brillo' : 'Volumen';

  return (
    <div
      className={cn(PLAYER_GESTURE_HUD_FRAME_CLASS, visible ? 'opacity-100' : 'opacity-0')}
      role="status"
      aria-live="polite"
      aria-label={`${label} ${percent} por ciento`}
    >
      <div className={PLAYER_GESTURE_HUD_PILL_CLASS}>
        <Icon className="h-4 w-4 shrink-0 text-cinema-accent" aria-hidden />
        <div className={PLAYER_GESTURE_HUD_BAR_CLASS}>
          <div
            className={PLAYER_GESTURE_HUD_FILL_CLASS}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="font-display text-sm tabular-nums text-cinema-chalk">{percent}%</span>
      </div>
    </div>
  );
}

interface UsePlayerSurfaceGesturesOptions {
  containerRef: RefObject<HTMLElement | null>;
  brightness: number;
  setBrightness: (value: number) => void;
  volume: number;
  setVolume: (value: number) => void;
  enabled?: boolean;
  volumeEnabled?: boolean;
}

export function usePlayerSurfaceGestures({
  containerRef,
  brightness,
  setBrightness,
  volume,
  setVolume,
  enabled = true,
  volumeEnabled = true,
}: UsePlayerSurfaceGesturesOptions) {
  const [hud, setHud] = useState<PlayerGestureHudState | null>(null);
  const [hudVisible, setHudVisible] = useState(false);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startBrightness: number;
    startVolume: number;
    kind: PlayerGestureKind | null;
    dragged: boolean;
  } | null>(null);
  const draggedRef = useRef(false);
  const brightnessRef = useRef(brightness);
  const volumeRef = useRef(volume);
  const setBrightnessRef = useRef(setBrightness);
  const setVolumeRef = useRef(setVolume);
  const volumeEnabledRef = useRef(volumeEnabled);

  brightnessRef.current = brightness;
  volumeRef.current = volume;
  setBrightnessRef.current = setBrightness;
  setVolumeRef.current = setVolume;
  volumeEnabledRef.current = volumeEnabled;

  const showHud = useCallback((next: PlayerGestureHudState) => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    setHud(next);
    setHudVisible(true);
  }, []);

  const hideHudSoon = useCallback(() => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => setHudVisible(false), 700);
  }, []);

  const didGesture = useCallback(() => {
    if (!draggedRef.current) return false;
    draggedRef.current = false;
    return true;
  }, []);

  useEffect(() => {
    if (enabled) return;
    sessionRef.current = null;
    if (fadeRef.current) {
      clearTimeout(fadeRef.current);
      fadeRef.current = null;
    }
    setHud(null);
    setHudVisible(false);
  }, [enabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const endSession = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (session.dragged) {
        draggedRef.current = true;
        hideHudSoon();
      }
      sessionRef.current = null;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (event.button !== 0 && event.pointerType === 'pen') return;
      if (isPlayerGestureIgnoredTarget(event.target)) return;
      const rect = el.getBoundingClientRect();
      sessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX - rect.left,
        startY: event.clientY,
        startBrightness: brightnessRef.current,
        startVolume: volumeRef.current,
        kind: null,
        dragged: false,
      };
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // Safari can throw if the element is gone
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - rect.left - session.startX;
      const dy = event.clientY - session.startY;
      if (!session.kind) {
        const kind = classifySurfaceDrag(dx, dy, session.startX, rect.width);
        if (!kind) return;
        if (kind === 'volume' && !volumeEnabledRef.current) return;
        session.kind = kind;
        session.dragged = true;
      }
      event.preventDefault();
      const nextValue = applyVerticalDrag(
        session.kind,
        session.kind === 'brightness' ? session.startBrightness : session.startVolume,
        dy,
      );
      if (session.kind === 'brightness') setBrightnessRef.current(nextValue);
      else setVolumeRef.current(nextValue);
      showHud({ kind: session.kind, value: nextValue });
    };

    const onTouchMove = (event: TouchEvent) => {
      if (sessionRef.current?.kind) event.preventDefault();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endSession);
    el.addEventListener('pointercancel', endSession);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endSession);
      el.removeEventListener('pointercancel', endSession);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [containerRef, enabled, hideHudSoon, showHud]);

  useEffect(() => {
    return () => {
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return { hud, hudVisible, didGesture };
}
