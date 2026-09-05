'use client';

import { useEffect, useState } from 'react';
import { detectTvDevice } from '@/lib/device-context';

export function useIsTvDevice(): boolean {
  const [isTv, setIsTv] = useState(false);

  useEffect(() => {
    const update = () => setIsTv(detectTvDevice());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isTv;
}
