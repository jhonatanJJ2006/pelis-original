'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { APK_DOWNLOAD_PATH } from '@/lib/app-download';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallMode = 'hidden' | 'prompt' | 'ios' | 'android-apk' | 'manual';

interface AppAvailability {
  apkAvailable?: boolean;
  apkVersionCode?: number;
  apkVersionName?: string;
}

const APK_VERSION_KEY = 'pelis_apk_version';

const INSTALL_COPY = {
  ios: {
    title: 'Lleva Pelis contigo',
    subtitle: 'Tu cine en el bolsillo. Abre Pelis con un toque desde tu pantalla de inicio.',
    steps: [
      'En Safari, toca Compartir (el icono de compartir)',
      'Elige «En pantalla de inicio»',
      '¡Listo! Abre Pelis como cualquier otra app',
    ],
  },
  'android-apk': {
    title: 'Lleva Pelis contigo',
    subtitle:
      'Instala Pelis en tu celular y mira películas sin volver a abrir el navegador cada vez.',
    steps: [
      'Pulsa «Descargar app» y espera a que termine',
      'Abre el archivo descargado y confirma la instalación',
      '¡A disfrutar! Abre Pelis desde tu inicio',
    ],
    apkNote: 'Si tu teléfono lo pide, permite instalar desde este navegador.',
    apkPending: 'Muy pronto podrás descargar la app.',
    downloadLabel: 'Descargar app',
  },
  prompt: {
    title: 'Tu cine, siempre a mano',
    subtitle: 'Instala Pelis en un segundo y accede directo desde tu pantalla de inicio.',
    installLabel: 'Instalar con un toque',
  },
  manual: {
    title: 'Pelis en tu móvil',
    subtitle: 'Descarga la app en Android o añádela a inicio en iPhone.',
    steps: [
      'Descarga la app y ábrela en tu Android',
      'En iPhone: Safari → Compartir → «En pantalla de inicio»',
    ],
    downloadLabel: 'Descargar app',
    apkPending: 'Muy pronto podrás descargar la app.',
  },
  update: {
    title: 'Hay novedades en Pelis',
    subtitle: 'Descarga la última versión para disfrutar de lo nuevo.',
    downloadLabel: 'Actualizar app',
  },
} as const;

let availabilityPromise: Promise<AppAvailability> | null = null;

function fetchAvailability(): Promise<AppAvailability> {
  if (!availabilityPromise) {
    availabilityPromise = fetch('/api/app/availability')
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return availabilityPromise;
}

function deferIdle(fn: () => void): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn);
  } else {
    w.setTimeout(fn, 1000);
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

function StepsList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="text-cinema-silver text-sm space-y-2 list-decimal list-inside">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function usePwaInstall() {
  const [mode, setMode] = useState<InstallMode>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [apkAvailable, setApkAvailable] = useState(false);
  const [needsApkUpdate, setNeedsApkUpdate] = useState(false);
  const [latestApkVersion, setLatestApkVersion] = useState<number | null>(null);

  useEffect(() => {
    deferIdle(() => {
      fetchAvailability().then((data) => {
        setApkAvailable(!!data.apkAvailable);
        if (data.apkVersionCode) {
          setLatestApkVersion(data.apkVersionCode);
          const stored = Number(localStorage.getItem(APK_VERSION_KEY) ?? '0');
          if (isStandalone() && isAndroid() && stored > 0 && data.apkVersionCode > stored) {
            setNeedsApkUpdate(true);
          }
        }
      });
    });

    if (isStandalone()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode('prompt');
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setMode('hidden');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    if (isIos()) {
      setMode('ios');
    } else if (isAndroid()) {
      setMode('android-apk');
    } else {
      setMode('manual');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setMode('hidden');
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const markApkUpdated = useCallback(() => {
    if (latestApkVersion) {
      localStorage.setItem(APK_VERSION_KEY, String(latestApkVersion));
      setNeedsApkUpdate(false);
    }
  }, [latestApkVersion]);

  return {
    mode,
    install,
    installing,
    canInstall: mode === 'prompt' && deferredPrompt !== null,
    apkAvailable,
    needsApkUpdate,
    markApkUpdated,
  };
}

interface PwaInstallPromptProps {
  variant?: 'card' | 'inline';
  className?: string;
}

export function PwaInstallPrompt({ variant = 'card', className }: PwaInstallPromptProps) {
  const {
    mode,
    install,
    installing,
    canInstall,
    apkAvailable,
    needsApkUpdate,
    markApkUpdated,
  } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if ((mode === 'hidden' && !needsApkUpdate) || dismissed) return null;

  const copy = needsApkUpdate
    ? INSTALL_COPY.update
    : mode === 'ios'
      ? INSTALL_COPY.ios
      : mode === 'android-apk'
        ? INSTALL_COPY['android-apk']
        : mode === 'prompt'
          ? INSTALL_COPY.prompt
          : INSTALL_COPY.manual;

  const showApkCta = needsApkUpdate || mode === 'android-apk' || mode === 'manual';

  const apkButtonClasses = cn(
    'inline-flex items-center justify-center font-semibold transition-all duration-200',
    'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110',
    'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60',
    variant === 'inline' ? 'py-1.5 px-3 text-sm w-full' : 'py-3 px-6 text-base w-full md:w-auto',
    !apkAvailable && showApkCta && 'opacity-50 pointer-events-none cursor-not-allowed'
  );

  const downloadLabel =
    'downloadLabel' in copy ? copy.downloadLabel : INSTALL_COPY['android-apk'].downloadLabel;

  const apkButton =
    showApkCta &&
    (apkAvailable ? (
      <a
        href={APK_DOWNLOAD_PATH}
        download="pelis.apk"
        className={apkButtonClasses}
        onClick={markApkUpdated}
      >
        <Download className={variant === 'inline' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'} aria-hidden />
        {downloadLabel}
      </a>
    ) : (
      <span className={apkButtonClasses} aria-disabled="true">
        <Download className={variant === 'inline' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'} aria-hidden />
        {'apkPending' in copy ? copy.apkPending : INSTALL_COPY['android-apk'].apkPending}
      </span>
    ));

  const instructions =
    mode === 'ios' ? (
      <StepsList steps={INSTALL_COPY.ios.steps} />
    ) : showApkCta && 'steps' in copy ? (
      <div>
        <StepsList steps={copy.steps} />
        {'apkNote' in INSTALL_COPY['android-apk'] && mode === 'android-apk' && (
          <p className="text-cinema-ash text-xs mt-3">{INSTALL_COPY['android-apk'].apkNote}</p>
        )}
      </div>
    ) : 'steps' in INSTALL_COPY.manual ? (
      <StepsList steps={INSTALL_COPY.manual.steps} />
    ) : null;

  if (variant === 'inline') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-cinema-gold">
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden />
          <span className="font-display text-sm tracking-widest uppercase">App Pelis</span>
        </div>
        <p className="text-white font-medium">{copy.title}</p>
        <p className="text-cinema-silver text-sm leading-relaxed">{copy.subtitle}</p>
        {apkButton}
        {instructions}
        {canInstall && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={install}
            disabled={installing}
          >
            {installing ? 'Instalando…' : INSTALL_COPY.prompt.installLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-cinema-violet/30',
        'bg-gradient-to-br from-cinema-violet/15 via-cinema-surface to-cinema-teal/10',
        'p-6 md:p-8',
        className
      )}
      aria-label="Instalar aplicación"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-1.5 text-cinema-ash hover:text-white rounded transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cinema-violet to-cinema-teal flex items-center justify-center shrink-0 shadow-glow-violet">
            <Smartphone className="w-6 h-6 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl md:text-2xl tracking-wide text-white uppercase">
              {copy.title}
            </h2>
            <p className="text-cinema-silver text-sm mt-2 max-w-xl">{copy.subtitle}</p>
            <div className="mt-4 max-w-md">{instructions}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
          {apkButton}
          {canInstall && (
            <Button type="button" variant="outline" onClick={install} disabled={installing}>
              {installing ? 'Instalando…' : INSTALL_COPY.prompt.installLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
