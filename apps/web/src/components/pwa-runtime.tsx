'use client';

import { useEffect } from 'react';
import { PwaUpdateModal } from './pwa-update-modal';

/**
 * Silencia el banner nativo de Chrome («Instalar app») y no muestra CTAs propios.
 * El único UI de PWA que montamos es el modal de actualización con consentimiento.
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
