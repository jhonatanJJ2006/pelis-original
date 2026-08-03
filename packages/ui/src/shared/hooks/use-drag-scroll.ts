'use client';

import { useEffect, useRef, type RefObject } from 'react';

export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>
) {
  const state = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      state.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.active) return;
      const dx = e.clientX - s.startX;
      if (!s.moved && Math.abs(dx) < 4) return;
      s.moved = true;
      el.scrollLeft = s.startScroll - dx;
    };

    const onUp = (e: PointerEvent) => {
      if (!state.current.active) return;
      state.current.active = false;
      if (e.pointerType === 'mouse' && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
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
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStartCapture, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStartCapture, true);
    };
  }, [ref]);
}
