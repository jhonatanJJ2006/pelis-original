'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@pelis/ui/components';

const VERSION_KEY = 'pelis_app_version';

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      if (!data.version) return;

      const stored = localStorage.getItem(VERSION_KEY);
      if (stored && stored !== data.version) {
        setVisible(true);
      }
      if (!stored) {
        localStorage.setItem(VERSION_KEY, data.version);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setVisible(true);
            }
          });
        });

        if (reg.waiting && navigator.serviceWorker.controller) {
          setVisible(true);
        }

        await checkVersion();
      } catch {
        // SW not available
      }
    };

    setup();

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        const res = await fetch('/version.json', { cache: 'no-store' });
        const data = (await res.json()) as { version?: string };
        if (data.version) {
          localStorage.setItem(VERSION_KEY, data.version);
        }
        window.location.reload();
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-cinema-violet/30 bg-cinema-violet/15 px-4 py-3">
      <div className="container mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-white">
          Hay novedades en Pelis — actualiza para ver lo último
        </p>
        <Button type="button" size="sm" onClick={handleUpdate} disabled={updating}>
          <RefreshCw className={cnIcon(updating)} aria-hidden />
          {updating ? 'Actualizando…' : 'Actualizar ahora'}
        </Button>
      </div>
    </div>
  );
}

function cnIcon(spinning: boolean) {
  return spinning ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2';
}
