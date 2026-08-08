'use client';

import { useEffect, useState } from 'react';

function detectMobileOrStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  return standalone || mobile;
}

export function useIsMobilePwa(): boolean {
  const [isMobilePwa, setIsMobilePwa] = useState(false);

  useEffect(() => {
    setIsMobilePwa(detectMobileOrStandalone());

    const mobileMq = window.matchMedia('(max-width: 768px)');
    const standaloneMq = window.matchMedia('(display-mode: standalone)');

    const update = () => setIsMobilePwa(detectMobileOrStandalone());
    mobileMq.addEventListener('change', update);
    standaloneMq.addEventListener('change', update);
    return () => {
      mobileMq.removeEventListener('change', update);
      standaloneMq.removeEventListener('change', update);
    };
  }, []);

  return isMobilePwa;
}
