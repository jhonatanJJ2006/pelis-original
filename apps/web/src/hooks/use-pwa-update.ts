'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DISMISSED_VERSION_KEY,
  STORED_VERSION_KEY,
  parseAvailabilityVersion,
  parseVersionPayload,
  shouldOfferWebUpdate,
} from '@/lib/pwa-update';

/** API local (Movies): lee public/version.json del disco. El SW la trata NetworkOnly. */
const AVAILABILITY_URL = '/api/app/availability';
const VERSION_URL = '/version.json';
const POLL_MS = 15 * 60 * 1000;
const RELOAD_FALLBACK_MS = 1500;

async function fetchLatestWebVersion(): Promise<string | null> {
  try {
    const res = await fetch(AVAILABILITY_URL, { cache: 'no-store' });
    if (res.ok) {
      const fromApi = parseAvailabilityVersion(await res.json());
      if (fromApi.version) return fromApi.version;
    }
  } catch {
    // Seguimos con el estático por si el RPC no responde.
  }

  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return parseVersionPayload(await res.json()).version;
  } catch {
    return null;
  }
}

export function usePwaUpdate() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [versionLabel, setVersionLabel] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const latestVersionRef = useRef<string | null>(null);
  const acceptedRef = useRef(false);

  const evaluate = useCallback(
    (opts: { latestVersion?: string | null; hasWaitingWorker?: boolean } = {}) => {
      if (opts.latestVersion !== undefined) {
        latestVersionRef.current = opts.latestVersion;
      }

      const latestVersion = latestVersionRef.current;
      const storedVersion = window.localStorage.getItem(STORED_VERSION_KEY);
      if (!storedVersion && latestVersion) {
        window.localStorage.setItem(STORED_VERSION_KEY, latestVersion);
      }

      const offer = shouldOfferWebUpdate({
        storedVersion: window.localStorage.getItem(STORED_VERSION_KEY),
        latestVersion,
        dismissedVersion: window.localStorage.getItem(DISMISSED_VERSION_KEY),
        hasWaitingWorker: opts.hasWaitingWorker ?? Boolean(registrationRef.current?.waiting),
      });

      setVersionLabel(latestVersion);
      setVisible(offer);
    },
    []
  );

  const checkVersion = useCallback(async () => {
    const version = await fetchLatestWebVersion();
    if (!version) return;
    evaluate({ latestVersion: version });
  }, [evaluate]);

  useEffect(() => {
    let cancelled = false;

    const bindRegistration = (reg: ServiceWorkerRegistration) => {
      registrationRef.current = reg;

      const onUpdateFound = () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            evaluate({ hasWaitingWorker: true });
          }
        });
      };

      reg.addEventListener('updatefound', onUpdateFound);
      if (reg.waiting && navigator.serviceWorker.controller) {
        evaluate({ hasWaitingWorker: true });
      }
      void reg.update();
    };

    const setup = async () => {
      await checkVersion();
      if (cancelled) return;

      // En development Serwist no genera SW; no registremos el sw.js commiteado.
      if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
        return;
      }

      try {
        const existing = await navigator.serviceWorker.getRegistration();
        const reg = existing ?? (await navigator.serviceWorker.register('/sw.js'));
        if (!cancelled) bindRegistration(reg);
      } catch {
        // Sin SW seguimos pudiendo avisar por version.json.
      }
    };

    void setup();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void checkVersion();
      void registrationRef.current?.update();
    };

    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => {
      void checkVersion();
      void registrationRef.current?.update();
    }, POLL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [checkVersion, evaluate]);

  const accept = useCallback(async () => {
    setUpdating(true);
    acceptedRef.current = true;

    const latest = latestVersionRef.current;
    if (latest) {
      window.localStorage.setItem(STORED_VERSION_KEY, latest);
      window.localStorage.removeItem(DISMISSED_VERSION_KEY);
    }

    const waiting = registrationRef.current?.waiting;
    if (waiting && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload();
        },
        { once: true }
      );
      waiting.postMessage({ type: 'SKIP_WAITING' });
      window.setTimeout(() => {
        if (acceptedRef.current) window.location.reload();
      }, RELOAD_FALLBACK_MS);
      return;
    }

    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    const latest = latestVersionRef.current;
    if (latest) {
      window.localStorage.setItem(DISMISSED_VERSION_KEY, latest);
    }
    setVisible(false);
  }, []);

  return { visible, updating, versionLabel, accept, dismiss };
}
