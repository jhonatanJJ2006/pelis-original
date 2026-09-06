'use client';

import { useEffect, useState } from 'react';
import { detectTvExperience, persistDeviceOverride, readDeviceOverride } from '@/lib/device-context';

export function useIsTvDevice(): boolean {
  const [isTv, setIsTv] = useState(() =>
    typeof window === 'undefined' ? false : detectTvExperience()
  );

  useEffect(() => {
    const update = () => {
      const override = readDeviceOverride(window.location.search);
      persistDeviceOverride(override);
      setIsTv(detectTvExperience());
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isTv;
}
