'use client';

import { useCallback, useRef } from 'react';

export function useDragScroll() {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const state = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const cleanupRef = useRef<(() => void) | null>(null);
  const windowCleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((el: HTMLElement | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (windowCleanupRef.current) {
      windowCleanupRef.current();
      windowCleanupRef.current = null;
    }
    scrollerRef.current = el;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      state.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };

      const onMove = (ev: PointerEvent) => {
        const s = state.current;
        if (!s.active) return;
        const dx = ev.clientX - s.startX;
        if (!s.moved && Math.abs(dx) < 6) return;
        s.moved = true;
        el.scrollLeft = s.startScroll - dx;
      };

      const onUp = () => {
        if (!state.current.active) return;
        state.current.active = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        windowCleanupRef.current = null;
        window.setTimeout(() => {
          state.current.moved = false;
        }, 0);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      windowCleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
    };

    const onClickCapture = (e: MouseEvent) => {
      if (state.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        state.current.moved = false;
      }
    };

    const onDragStartCapture = (e: DragEvent) => {
      e.preventDefault();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStartCapture, true);

    cleanupRef.current = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStartCapture, true);
      if (windowCleanupRef.current) {
        windowCleanupRef.current();
        windowCleanupRef.current = null;
      }
    };
  }, []);

  const getEl = useCallback(() => scrollerRef.current, []);

  return { setRef, getEl };
}
