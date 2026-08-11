'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getTabIndex, isTabSwipeEnabled, TAB_ROUTES } from '@/lib/tab-navigation';
import { useIsMobilePwa } from '@/hooks/use-is-mobile-pwa';

const SWIPE_THRESHOLD = 60;
const SWIPE_RATIO = 1.5;
const SCROLL_EDGE_EPSILON = 12;

type TouchStartState = {
  x: number;
  y: number;
  scroller: HTMLElement | null;
};

function findHorizontalScroller(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const scroller = target.closest('[data-horizontal-scroll]');
  return scroller instanceof HTMLElement ? scroller : null;
}

function isAtScrollStart(scroller: HTMLElement): boolean {
  return scroller.scrollLeft <= SCROLL_EDGE_EPSILON;
}

function isAtScrollEnd(scroller: HTMLElement): boolean {
  return scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - SCROLL_EDGE_EPSILON;
}

function canChangeTabFromScroller(scroller: HTMLElement | null, dx: number): boolean {
  if (!scroller) return true;

  const overflows = scroller.scrollWidth > scroller.clientWidth + SCROLL_EDGE_EPSILON;
  if (!overflows) return true;

  if (dx < 0) return isAtScrollEnd(scroller);
  if (dx > 0) return isAtScrollStart(scroller);
  return false;
}

export function useTabSwipe() {
  const isMobile = useIsMobilePwa();
  const pathname = usePathname();
  const router = useRouter();
  const touchStart = useRef<TouchStartState | null>(null);

  useEffect(() => {
    if (!isMobile || !isTabSwipeEnabled(pathname)) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-hero-carousel]')) {
        touchStart.current = null;
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        scroller: findHorizontalScroller(target),
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('[data-hero-carousel]')) {
        touchStart.current = null;
        return;
      }
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const scroller = touchStart.current.scroller;
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) / Math.max(Math.abs(dy), 1) < SWIPE_RATIO) return;

      const activeScroller = scroller ?? findHorizontalScroller(target);
      if (!canChangeTabFromScroller(activeScroller, dx)) return;

      const currentIndex = getTabIndex(pathname);
      if (currentIndex === -1) return;

      if (dx < 0 && currentIndex < TAB_ROUTES.length - 1) {
        router.push(TAB_ROUTES[currentIndex + 1]!);
      } else if (dx > 0 && currentIndex > 0) {
        router.push(TAB_ROUTES[currentIndex - 1]!);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, pathname, router]);
}
