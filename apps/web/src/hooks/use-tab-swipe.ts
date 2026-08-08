'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getTabIndex, isTabSwipeEnabled, TAB_ROUTES } from '@/lib/tab-navigation';

const SWIPE_THRESHOLD = 60;
const SWIPE_RATIO = 1.5;

export function useTabSwipe(enabled: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || !isTabSwipeEnabled(pathname)) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) / Math.max(Math.abs(dy), 1) < SWIPE_RATIO) return;

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
  }, [enabled, pathname, router]);
}
