'use client';

import { useEffect } from 'react';
import { PwaUpdateModal } from './pwa-update-modal';

/**
 * Silencia el banner nativo de Chrome («Instalar app») y no muestra CTAs propios.
 * El modal de «nueva versión» no se muestra en la web; solo en las apps Android.
 */
function useSuppressWebInstallPrompt() {
  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);
}

export function PwaRuntime() {
  useSuppressWebInstallPrompt();
  return <PwaUpdateModal />;
}
