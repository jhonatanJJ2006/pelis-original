'use client';

import { useEffect, useState } from 'react';

/** True cuando Pelis corre como app instalada (PWA, TWA o «En pantalla de inicio»). */
export function detectInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useIsInstalledApp(): boolean {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const update = () => setInstalled(detectInstalledApp());
    update();

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const fullscreenMq = window.matchMedia('(display-mode: fullscreen)');

    standaloneMq.addEventListener('change', update);
    fullscreenMq.addEventListener('change', update);

    return () => {
      standaloneMq.removeEventListener('change', update);
      fullscreenMq.removeEventListener('change', update);
    };
  }, []);

  return installed;
}
