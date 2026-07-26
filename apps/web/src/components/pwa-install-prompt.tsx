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

function ApkInstallSteps() {
  return (
    <ol className="text-cinema-silver text-sm space-y-2 list-decimal list-inside">
      <li>
        Pulsa <strong className="text-white">Descargar APK</strong> y espera a que termine la
        descarga
      </li>
      <li>
        Abre el archivo <strong className="text-white">pelis.apk</strong> desde Notificaciones o
        Descargas
      </li>
      <li>
        Si Android lo pide, permite{' '}
        <strong className="text-white">Instalar apps desconocidas</strong> para tu navegador
      </li>
      <li>Confirma la instalación y abre Pelis desde el inicio</li>
    </ol>
  );
}

function getDesktopInstructions() {
  return (
    <ol className="text-cinema-silver text-sm space-y-2 list-decimal list-inside">
      <li>Descarga el APK y transfiérelo a tu Android (USB, Drive, etc.)</li>
      <li>Abre el archivo en el teléfono y confirma la instalación</li>
      <li>En iPhone usa Safari → Compartir → Añadir a inicio (no hay APK en iOS)</li>
    </ol>
  );
}

function usePwaInstall() {
  const [mode, setMode] = useState<InstallMode>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [apkAvailable, setApkAvailable] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    fetch(APK_DOWNLOAD_PATH, { method: 'HEAD' })
      .then((res) => setApkAvailable(res.ok))
      .catch(() => setApkAvailable(false));

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

    if (!isStandalone()) {
      if (isIos()) {
        setMode('ios');
      } else if (isAndroid()) {
        setMode('android-apk');
      } else {
        setMode('manual');
      }
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

  return {
    mode,
    install,
    installing,
    canInstall: mode === 'prompt' && deferredPrompt !== null,
    apkAvailable,
  };
}

interface PwaInstallPromptProps {
  variant?: 'card' | 'inline';
  className?: string;
}

export function PwaInstallPrompt({ variant = 'card', className }: PwaInstallPromptProps) {
  const { mode, install, installing, canInstall, apkAvailable } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (mode === 'hidden' || dismissed) return null;

  const showApkCta = mode === 'android-apk' || mode === 'manual';

  const instructions =
    mode === 'ios' ? (
      <ol className="text-cinema-silver text-sm space-y-2 list-decimal list-inside">
        <li>
          Toca <Share className="inline w-4 h-4 mx-0.5 text-cinema-gold" aria-hidden /> Compartir en
          Safari
        </li>
        <li>
          Elige <strong className="text-white">Añadir a inicio</strong>
        </li>
        <li>Confirma y abre Pelis desde tu pantalla de inicio</li>
      </ol>
    ) : showApkCta ? (
      <ApkInstallSteps />
    ) : (
      getDesktopInstructions()
    );

  const apkButtonClasses = cn(
    'inline-flex items-center justify-center font-semibold transition-all duration-200',
    'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110',
    'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60',
    variant === 'inline' ? 'py-1.5 px-3 text-sm w-full' : 'py-3 px-6 text-base w-full md:w-auto',
    !apkAvailable && 'opacity-50 pointer-events-none cursor-not-allowed'
  );

  const apkButton =
    showApkCta &&
    (apkAvailable ? (
      <a href={APK_DOWNLOAD_PATH} download="pelis.apk" className={apkButtonClasses}>
        <Download className={variant === 'inline' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'} aria-hidden />
        Descargar APK
      </a>
    ) : (
      <span className={apkButtonClasses} aria-disabled="true">
        <Download className={variant === 'inline' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'} aria-hidden />
        APK en preparación
      </span>
    ));

  if (variant === 'inline') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-cinema-gold">
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden />
          <span className="font-display text-sm tracking-widest uppercase">App Android</span>
        </div>
        <p className="text-cinema-silver text-sm leading-relaxed">
          {mode === 'android-apk'
            ? 'Descarga e instala Pelis como app en tu celular Android.'
            : 'Instala Pelis en tu dispositivo móvil.'}
        </p>
        {apkButton}
        {!apkAvailable && showApkCta && (
          <p className="text-cinema-ash text-xs">
            El APK se publicará en esta URL tras el primer build de Android.
          </p>
        )}
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
            {installing ? 'Instalando…' : 'O instalar desde Chrome (PWA)'}
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
              {mode === 'android-apk' ? 'Descarga Pelis para Android' : 'Instala Pelis en tu móvil'}
            </h2>
            <p className="text-cinema-silver text-sm mt-2 max-w-xl">
              {mode === 'android-apk'
                ? 'Obtén la app Android (APK) e instálala directamente en tu celular. Requiere permitir instalación desde fuentes conocidas.'
                : mode === 'ios'
                  ? 'En iPhone no hay APK; añade Pelis a tu pantalla de inicio desde Safari.'
                  : 'Descarga el APK para Android o añade Pelis a inicio en iPhone.'}
            </p>
            <div className="mt-4 max-w-md">{instructions}</div>
            {!apkAvailable && showApkCta && (
              <p className="text-cinema-ash text-xs mt-3">
                El botón se activará cuando publiques el APK en /downloads/pelis.apk.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
          {apkButton}
          {canInstall && (
            <Button type="button" variant="outline" onClick={install} disabled={installing}>
              {installing ? 'Instalando…' : 'Instalar desde navegador'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
