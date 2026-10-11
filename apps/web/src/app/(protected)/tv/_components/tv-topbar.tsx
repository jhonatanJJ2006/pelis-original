'use client';

import Link from 'next/link';
import { Menu, Tv, ChevronLeft } from 'lucide-react';

interface TVTopbarProps {
  channelName: string;
  channelLogo?: string;
  onBurgerClick: () => void;
  channelCount?: number;
}

export function TVTopbar({ channelName, channelLogo, onBurgerClick, channelCount }: TVTopbarProps) {
  return (
    <header className="absolute inset-x-0 top-0 z-40 flex items-center gap-3 px-4 md:px-6 py-3 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
      <Link
        href="/"
        className="shrink-0 inline-flex items-center gap-1.5 text-cinema-silver hover:text-cinema-chalk text-xs uppercase tracking-wider font-medium transition-colors"
        aria-label="Volver al inicio"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Inicio</span>
      </Link>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-cinema-elevated/80 border border-cinema-border/60 flex items-center justify-center overflow-hidden">
          {channelLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channelLogo} alt="" className="w-6 h-6 object-contain" />
          ) : (
            <Tv className="w-4 h-4 text-cinema-silver" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            En vivo
          </p>
          <h1 className="font-display text-base md:text-lg text-cinema-chalk tracking-wide uppercase truncate">
            {channelName || 'TV en vivo'}
          </h1>
        </div>
      </div>

      {typeof channelCount === 'number' && (
        <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cinema-elevated/80 border border-cinema-border/60 text-[10px] uppercase tracking-wider text-cinema-silver">
          {channelCount} canales
        </span>
      )}

      <button
        type="button"
        onClick={onBurgerClick}
        className="shrink-0 inline-flex items-center gap-2 px-3 h-10 rounded-[10px] bg-cinema-elevated/90 hover:bg-cinema-accent/30 border border-cinema-border hover:border-cinema-accent/40 transition-colors text-sm text-cinema-chalk"
        aria-label="Abrir lista de canales"
      >
        <Menu className="w-5 h-5" />
        <span className="hidden md:inline">Canales</span>
      </button>
    </header>
  );
}
