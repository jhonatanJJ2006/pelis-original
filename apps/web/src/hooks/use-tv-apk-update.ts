'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectTvExperience } from '@/lib/device-context';
import {
  TV_APK_DISMISSED_VERSION_KEY,
  TV_APK_STORED_VERSION_KEY,
  parseTvApkAvailability,
  readInstalledTvApk,
  shouldOfferTvApkUpdate,
  tvApkVersionKey,
} from '@/lib/tv-apk-update';

const POLL_MS = 15 * 60 * 1000;

type PelisTvBridge = {
  apkVersionCode?: number;
  apkVersionName?: string;
  requestUpdate?: () => void;
};

function readBridge(): PelisTvBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { __PELIS_TV__?: PelisTvBridge; PelisTv?: PelisTvBridge };
  return w.__PELIS_TV__ ?? w.PelisTv ?? null;
}

export function useTvApkUpdate() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [versionLabel, setVersionLabel] = useState<string | null>(null);
  const latestKeyRef = useRef<string | null>(null);

  const evaluate = useCallback(
    (latestKey: string | null, available: boolean, label: string | null) => {
      latestKeyRef.current = latestKey;
      setVersionLabel(label);
      if (!latestKey) {
        setVisible(false);
        return;
      }
      const stored = window.localStorage.getItem(TV_APK_STORED_VERSION_KEY);
      if (!stored) {
        window.localStorage.setItem(TV_APK_STORED_VERSION_KEY, latestKey);
        setVisible(false);
        return;
      }
      setVisible(
        shouldOfferTvApkUpdate({
          storedVersion: stored,
          latestVersion: latestKey,
          dismissedVersion: window.localStorage.getItem(TV_APK_DISMISSED_VERSION_KEY),
          apkAvailable: available,
        })
      );
    },
    []
  );

  const check = useCallback(async () => {
    if (!detectTvExperience()) return;
    try {
      const res = await fetch('/api/app/availability', { cache: 'no-store' });
      if (!res.ok) return;
      const availability = parseTvApkAvailability(await res.json());
      const installed = readInstalledTvApk({
        search: window.location.search,
        bridge: readBridge(),
      });
      const installedKey = tvApkVersionKey(installed);
      if (installedKey) {
        window.localStorage.setItem(TV_APK_STORED_VERSION_KEY, installedKey);
      }
      const latestKey = tvApkVersionKey({
        apkVersionCode: availability.tvApkVersionCode,
        apkVersionName: availability.tvApkVersionName,
      });
      evaluate(latestKey, availability.tvApkAvailable, availability.tvApkVersionName);
    } catch {
      // sin red no interrumpimos
    }
  }, [evaluate]);

  useEffect(() => {
    if (!detectTvExperience()) return;
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(() => {
      void check();
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [check]);

  const accept = useCallback(() => {
    const latest = latestKeyRef.current;
    if (latest) {
      window.localStorage.setItem(TV_APK_STORED_VERSION_KEY, latest);
      window.localStorage.removeItem(TV_APK_DISMISSED_VERSION_KEY);
    }
    const bridge = readBridge();
    // La web no descarga el APK. Solo el bridge nativo de la app de TV puede actualizar.
    if (typeof bridge?.requestUpdate === 'function') {
      setUpdating(true);
      bridge.requestUpdate();
      return;
    }
    setVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    const latest = latestKeyRef.current;
    if (latest) {
      window.localStorage.setItem(TV_APK_DISMISSED_VERSION_KEY, latest);
    }
    setVisible(false);
  }, []);

  return { visible, updating, versionLabel, accept, dismiss };
}
