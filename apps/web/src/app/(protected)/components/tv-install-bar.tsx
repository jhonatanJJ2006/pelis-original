'use client';

import { Download, Tv } from 'lucide-react';
import { APK_DOWNLOAD_PATH } from '@/lib/app-download';
import { useIsMobilePwa } from '@/hooks/use-is-mobile-pwa';
import { cn } from '@pelis/ui/utils';

interface TvInstallBarProps {
  className?: string;
}

/** Barra fija en televisor: el footer suele quedar fuera de pantalla y PWA no expone botón ⊕. */
export function TvInstallBar({ className }: TvInstallBarProps) {
  const isMobileShell = useIsMobilePwa();

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] pointer-events-none',
        isMobileShell ? 'bottom-[4.25rem]' : 'bottom-4',
        className
      )}
      role="region"
      aria-label="Instalar Pelis en televisor"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-cinema-gold/30 bg-cinema-surface/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cinema-violet to-cinema-teal flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm">Instala Pelis en tu TV Box</p>
            <p className="text-cinema-silver text-xs mt-0.5 leading-relaxed">
              En tele el navegador no muestra el botón de instalar. Descarga la app APK y ábrela
              desde el inicio del televisor.
            </p>
          </div>
        </div>
        <a
          href={APK_DOWNLOAD_PATH}
          download="pelis.apk"
          className={cn(
            'inline-flex items-center justify-center shrink-0 font-semibold text-sm',
            'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110',
            'rounded-lg px-4 py-2.5 w-full sm:w-auto transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60'
          )}
        >
          <Download className="w-4 h-4 mr-2" aria-hidden />
          Descargar app en TV
        </a>
      </div>
    </div>
  );
}
