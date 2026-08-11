'use client';

import { useEffect, useState } from 'react';

function detectMobileShell(): boolean {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;
  if (width <= 768) return true;

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) return true;

  return window.matchMedia('(max-width: 768px)').matches;
}

export function useIsMobilePwa(): boolean {
  const [isMobilePwa, setIsMobilePwa] = useState(false);

  useEffect(() => {
    const update = () => setIsMobilePwa(detectMobileShell());
    update();

    const mobileMq = window.matchMedia('(max-width: 768px)');
    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const fullscreenMq = window.matchMedia('(display-mode: fullscreen)');

    mobileMq.addEventListener('change', update);
    standaloneMq.addEventListener('change', update);
    fullscreenMq.addEventListener('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      mobileMq.removeEventListener('change', update);
      standaloneMq.removeEventListener('change', update);
      fullscreenMq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isMobilePwa;
}
