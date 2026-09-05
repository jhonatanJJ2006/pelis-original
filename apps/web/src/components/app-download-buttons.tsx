'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Tv } from 'lucide-react';
import { cn } from '@pelis/ui/utils';
import { APK_DOWNLOAD_PATH, TV_APK_DOWNLOAD_PATH } from '@/lib/app-download';

interface AppAvailability {
  apkAvailable?: boolean;
  tvApkAvailable?: boolean;
  apkVersionName?: string | null;
  tvApkVersionName?: string | null;
}

interface AppDownloadButtonsProps {
  className?: string;
  /** `stack` for footer/profile columns; `row` for wider layouts. */
  layout?: 'stack' | 'row';
}

const champagneBtn =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ' +
  'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110 ' +
  'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 ' +
  'py-2.5 px-4 text-sm w-full';

const secondaryBtn =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ' +
  'border border-cinema-gold/40 bg-cinema-elevated/80 text-cinema-gold hover:bg-cinema-gold/10 ' +
  'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 ' +
  'py-2.5 px-4 text-sm w-full';

function formatVersionLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed : `v${trimmed}`;
}

/**
 * Botones permanentes de descarga APK (celular + Android TV).
 * No usa beforeinstallprompt — son enlaces directos a /downloads/*.apk.
 */
export function AppDownloadButtons({ className, layout = 'stack' }: AppDownloadButtonsProps) {
  const [availability, setAvailability] = useState<AppAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/app/availability')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppAvailability | null) => {
        if (!cancelled && data) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showAndroid = availability?.apkAvailable !== false;
  const showTv = availability?.tvApkAvailable === true;
  const androidVersion = formatVersionLabel(availability?.apkVersionName);
  const tvVersion = formatVersionLabel(availability?.tvApkVersionName);

  // Mientras carga, no mostrar nada para evitar links rotos si no hay APK.
  if (availability === null) {
    return null;
  }

  if (!showAndroid && !showTv) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-cinema-gold">
        <Download className="w-4 h-4 shrink-0" aria-hidden />
        <span className="font-display text-sm tracking-widest uppercase">Descargar app</span>
      </div>
      <p className="text-cinema-silver text-sm leading-relaxed">
        Instala Pelis en tu celular o en tu Android TV / TV Box.
      </p>
      <div
        className={cn(
          'flex gap-2',
          layout === 'stack' ? 'flex-col' : 'flex-col sm:flex-row'
        )}
      >
        {showAndroid ? (
          <a
            href={APK_DOWNLOAD_PATH}
            download="pelis.apk"
            className={champagneBtn}
            aria-label={
              androidVersion
                ? `Descargar app Android ${androidVersion}`
                : 'Descargar app Android'
            }
          >
            <Smartphone className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">
              Descargar app Android
              {androidVersion ? (
                <span className="font-normal opacity-80"> · {androidVersion}</span>
              ) : null}
            </span>
          </a>
        ) : null}

        {showTv ? (
          <a
            href={TV_APK_DOWNLOAD_PATH}
            download="pelis-tv.apk"
            className={secondaryBtn}
            aria-label={
              tvVersion
                ? `Descargar app Android TV ${tvVersion}`
                : 'Descargar app Android TV'
            }
          >
            <Tv className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">
              Descargar app Android TV
              {tvVersion ? (
                <span className="font-normal opacity-80"> · {tvVersion}</span>
              ) : null}
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
