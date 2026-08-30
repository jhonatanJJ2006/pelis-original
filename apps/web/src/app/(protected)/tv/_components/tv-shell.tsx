'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Crown, Tv } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { ChannelSidebar, type SidebarChannel } from './channel-sidebar';

const TVPlayer = dynamic(() => import('../[id]/tv-player'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-cinema-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-cinema-muted text-sm">Cargando reproductor...</p>
      </div>
    </div>
  ),
});

interface TVShellProps {
  channels: SidebarChannel[];
  currentChannelId?: string;
  currentChannelName?: string;
  playerMessage?: string;
}

export function TVShell({
  channels,
  currentChannelId,
  currentChannelName,
  playerMessage,
}: TVShellProps) {
  const { user } = useUser();
  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  return (
    <div className="h-full min-h-0 flex bg-black">
      <ChannelSidebar channels={channels} currentId={currentChannelId} />
      <div className="relative flex-1 min-w-0 min-h-0 bg-black">
        {currentChannelName && (
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              En vivo
            </p>
            <p className="text-white text-sm font-medium truncate max-w-[50vw] drop-shadow">
              {currentChannelName}
            </p>
          </div>
        )}
        {!user ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Tv className="w-12 h-12 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted max-w-md text-sm">
              Inicia sesión para ver este canal en vivo
            </p>
            <Link href="/login" className="btn-primary px-6 py-2.5 rounded-[10px]">
              Iniciar sesión
            </Link>
          </div>
        ) : !hasActivePlan ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Crown className="w-12 h-12 text-cinema-gold/40" aria-hidden />
            <p className="text-cinema-muted max-w-md text-sm">
              Necesitas un plan activo para ver TV en vivo
            </p>
            <Link
              href="/subscribe"
              className="btn-primary-glow inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px]"
            >
              <Crown className="w-4 h-4" aria-hidden />
              Ver planes
            </Link>
          </div>
        ) : playerMessage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Tv className="w-12 h-12 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted text-sm max-w-sm">{playerMessage}</p>
          </div>
        ) : currentChannelId ? (
          <TVPlayer channelId={currentChannelId} channelName={currentChannelName || ''} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Tv className="w-12 h-12 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted text-sm">Elige un canal de la lista</p>
          </div>
        )}
      </div>
    </div>
  );
}
