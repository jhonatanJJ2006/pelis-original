'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Share, Smartphone, X } from 'lucide-react';
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
const APK_UPDATE_DISMISSED_KEY = 'pelis_apk_update_dismissed';

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
    downloadLabel: 'Descargar app',
  },
  prompt: {
    title: 'Tu cine, siempre a mano',
    subtitle: 'Instala Pelis en un segundo y accede directo desde tu pantalla de inicio.',
    installLabel: 'Instalar con un toque',
  },
  'pwa-android': {
    title: 'Lleva Pelis contigo',
    subtitle: 'Instala la app en tu Android desde Chrome, sin descargar archivos.',
    steps: [
      'Abre Pelis en Chrome',
      'Toca el menú ⋮ (arriba a la derecha)',
      'Elige «Instalar app» o «Añadir a pantalla de inicio»',
    ],
  },
  'pwa-desktop': {
    title: 'Pelis en tu equipo',
    subtitle: 'Instálala como app desde Chrome o Edge y ábrela como cualquier programa.',
    steps: [
      'En Chrome o Edge, busca el icono de instalar (⊕) en la barra de direcciones',
      'Si no aparece: menú ⋮ → «Instalar Pelis» o «Aplicaciones» → «Instalar»',
      'Confirma y ábrela desde tu escritorio o menú inicio',
    ],
  },
  manual: {
    title: 'Pelis en tu móvil',
    subtitle: 'Descarga la app en Android o añádela a inicio en iPhone.',
    steps: [
      'Descarga la app y ábrela en tu Android',
      'En iPhone: Safari → Compartir → «En pantalla de inicio»',
    ],
    downloadLabel: 'Descargar app',
  },
  update: {
    title: 'Hay una nueva versión de Pelis',
    subtitle:
      'Hay novedades y mejoras listas para vos. Actualizá la app para seguir disfrutando todo sin interrupciones.',
    downloadLabel: 'Actualizar ahora',
    versionLabel: 'Nueva versión',
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

function getPlatformMode(apkAvailable: boolean): InstallMode {
  if (isIos()) return 'ios';
  if (isAndroid()) return apkAvailable ? 'android-apk' : 'prompt';
  return apkAvailable ? 'manual' : 'prompt';
}

function usePwaInstall() {
  const [mode, setMode] = useState<InstallMode>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [apkAvailable, setApkAvailable] = useState(false);
  const [needsApkUpdate, setNeedsApkUpdate] = useState(false);
  const [latestApkVersion, setLatestApkVersion] = useState<number | null>(null);
  const [latestApkName, setLatestApkName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    deferIdle(() => {
      fetchAvailability().then((data) => {
        const hasApk = !!data.apkAvailable;
        setApkAvailable(hasApk);
        if (data.apkVersionCode) {
          setLatestApkVersion(data.apkVersionCode);
          setLatestApkName(data.apkVersionName ?? null);
          const stored = Number(localStorage.getItem(APK_VERSION_KEY) ?? '0');
          if (isStandalone() && isAndroid() && stored > 0 && data.apkVersionCode > stored) {
            setNeedsApkUpdate(true);
          }
        }
        if (!isStandalone()) {
          setMode((current) => (current === 'prompt' ? current : getPlatformMode(hasApk)));
        }
      });
    });

    if (isStandalone()) return;

    const onBeforeInstall = (event: Event) => {
      // Capture the event but DON'T preventDefault yet — Chrome suppresses its
      // native banner as soon as we do, and logs a warning if we never end up
      // calling `prompt()`. We only preventDefault inside `install()`, right
      // before we actually call `prompt()` ourselves.
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode((current) => (current === 'hidden' ? current : 'prompt'));
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setMode('hidden');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    setMode(getPlatformMode(false));

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.preventDefault();
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
      localStorage.removeItem(APK_UPDATE_DISMISSED_KEY);
      setNeedsApkUpdate(false);
    }
  }, [latestApkVersion]);

  const dismissApkUpdate = useCallback(() => {
    if (latestApkVersion) {
      localStorage.setItem(APK_UPDATE_DISMISSED_KEY, String(latestApkVersion));
    }
    setNeedsApkUpdate(false);
  }, [latestApkVersion]);

  return {
    mode,
    install,
    installing,
    canInstall: mode === 'prompt' && deferredPrompt !== null,
    apkAvailable,
    needsApkUpdate,
    latestApkVersion,
    latestApkName,
    markApkUpdated,
    dismissApkUpdate,
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
    latestApkVersion,
    latestApkName,
    markApkUpdated,
    dismissApkUpdate,
  } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  // Si hay actualización de APK pendiente, renderizamos un modal
  if (needsApkUpdate) {
    return (
      <ApkUpdateModal
        versionName={latestApkName}
        versionCode={latestApkVersion}
        onUpdate={markApkUpdated}
        onDismiss={dismissApkUpdate}
      />
    );
  }

  if (mode === 'hidden' || dismissed) return null;

  const copy =
    mode === 'ios'
      ? INSTALL_COPY.ios
      : mode === 'android-apk'
        ? INSTALL_COPY['android-apk']
        : mode === 'manual'
          ? INSTALL_COPY.manual
          : mode === 'prompt' && !canInstall
            ? isAndroid()
              ? INSTALL_COPY['pwa-android']
              : INSTALL_COPY['pwa-desktop']
            : INSTALL_COPY.prompt;

  const showApkCta = apkAvailable && (mode === 'android-apk' || mode === 'manual');

  const apkButtonClasses = cn(
    'inline-flex items-center justify-center font-semibold transition-all duration-200',
    'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110',
    'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60',
    variant === 'inline' ? 'py-1.5 px-3 text-sm w-full' : 'py-3 px-6 text-base w-full md:w-auto'
  );

  const downloadLabel =
    'downloadLabel' in copy ? copy.downloadLabel : INSTALL_COPY['android-apk'].downloadLabel;

  const apkButton = showApkCta && (
    <a
      href={APK_DOWNLOAD_PATH}
      download="pelis.apk"
      className={apkButtonClasses}
    >
      <Download className={variant === 'inline' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'} aria-hidden />
      {downloadLabel}
    </a>
  );

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
    ) : mode === 'prompt' && !canInstall ? (
      <StepsList steps={isAndroid() ? INSTALL_COPY['pwa-android'].steps : INSTALL_COPY['pwa-desktop'].steps} />
    ) : 'steps' in copy ? (
      <StepsList steps={copy.steps} />
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

interface ApkUpdateModalProps {
  versionName: string | null;
  versionCode: number | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

function ApkUpdateModal({ versionName, versionCode, onUpdate, onDismiss }: ApkUpdateModalProps) {
  const copy = INSTALL_COPY.update;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apk-update-title"
    >
      <div
        className="relative w-full max-w-md bg-cinema-elevated rounded-2xl border border-cinema-violet/30 shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-2 rounded-lg text-cinema-ash hover:text-white hover:bg-cinema-elevated/80 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cinema-violet to-cinema-teal flex items-center justify-center shadow-glow-violet shrink-0">
              <RefreshCw className="w-6 h-6 text-white" aria-hidden />
            </div>
            <div className="min-w-0 pr-8">
              <h2
                id="apk-update-title"
                className="font-display text-xl md:text-2xl tracking-wide text-white uppercase leading-tight"
              >
                {copy.title}
              </h2>
              {versionName ? (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] uppercase tracking-wider text-cinema-gold bg-cinema-gold/10 px-2 py-0.5 rounded">
                  {copy.versionLabel} {versionName}
                </span>
              ) : null}
            </div>
          </div>

          <p className="text-cinema-silver text-sm leading-relaxed mb-6">{copy.subtitle}</p>

          {versionCode ? (
            <div className="rounded-xl bg-cinema-surface border border-cinema-border p-3 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cinema-ash">Versión disponible</span>
                <span className="text-cinema-gold font-medium">v{versionName ?? versionCode}</span>
              </div>
              {versionCode ? (
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-cinema-ash">Código</span>
                  <span className="text-cinema-silver font-mono">{versionCode}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDismiss}
              className="w-full sm:flex-1"
            >
              Más tarde
            </Button>
            <a
              href={APK_DOWNLOAD_PATH}
              download="pelis.apk"
              onClick={onUpdate}
              className={cn(
                'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
                'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110',
                'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60',
                'py-3 px-6 text-base w-full sm:flex-1'
              )}
            >
              <Share className="w-4 h-4" aria-hidden />
              {copy.downloadLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}