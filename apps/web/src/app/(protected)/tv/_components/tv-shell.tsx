'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Crown, List, Tv } from 'lucide-react';
import { canStream, useUser } from '@pelis/auth/hooks';
import { PageSpinner } from '@pelis/ui/components';
import { ErrorState } from '@pelis/ui/features/empty-state';
import { ChannelSidebar, type SidebarChannel } from './channel-sidebar';

const TVPlayer = dynamic(() => import('../[id]/tv-player'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <PageSpinner label="Cargando reproductor…" className="py-0" />
    </div>
  ),
});

interface TVShellProps {
  channels: SidebarChannel[];
  currentChannelId?: string;
  currentChannelName?: string;
  currentChannelKind?: 'hls' | 'native' | 'mpegts';
  playerMessage?: string;
  channelsLoading?: boolean;
  channelsError?: Error | null;
  onRetryChannels?: () => void;
}

export function TVShell({
  channels,
  currentChannelId,
  currentChannelName,
  currentChannelKind,
  playerMessage,
  channelsLoading = false,
  channelsError = null,
  onRetryChannels,
}: TVShellProps) {
  const { user } = useUser();
  // Match requireActivePlan: ADMIN bypasses the subscription gate.
  const hasActivePlan = canStream(user);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const currentChannel = currentChannelId
    ? channels.find((c) => c._id === currentChannelId)
    : undefined;

  return (
    <div className="relative h-full min-h-0 flex bg-black">
      {channelsOpen && (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/60 md:hidden"
          aria-label="Cerrar lista de canales"
          onClick={() => setChannelsOpen(false)}
        />
      )}
      <ChannelSidebar
        channels={channels}
        currentId={currentChannelId}
        isLoading={channelsLoading}
        mobileOpen={channelsOpen}
        onNavigate={() => setChannelsOpen(false)}
      />
      <div className="relative flex-1 min-w-0 min-h-0 bg-black">
        <button
          type="button"
          className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-[2px] border border-cinema-accent/40 bg-black/70 px-2.5 py-1.5 text-xs font-medium text-cinema-chalk md:hidden"
          onClick={() => setChannelsOpen(true)}
          aria-expanded={channelsOpen}
        >
          <List className="h-3.5 w-3.5" aria-hidden />
          Canales
        </button>
        {currentChannelName && (
          <div className="absolute inset-x-0 top-0 z-20 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pt-3 pb-10 md:px-6 md:pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-cinema-danger px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-chalk">
                <span className="w-1.5 h-1.5 rounded-full bg-cinema-chalk animate-pulse" />
                En vivo
              </span>
              {currentChannel?.category && (
                <span className="rounded-[2px] border border-cinema-border/60 bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cinema-accent backdrop-blur-sm">
                  {currentChannel.category}
                </span>
              )}
              {currentChannel?.country && (
                <span className="hidden sm:inline rounded-[2px] border border-cinema-border/60 bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cinema-muted backdrop-blur-sm">
                  {currentChannel.country}
                </span>
              )}
            </div>
            <p className="mt-2 font-display text-xl md:text-3xl tracking-tight text-cinema-chalk truncate max-w-[70vw] md:max-w-[55vw] drop-shadow">
              {currentChannelName}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-cinema-muted">
              Emisión continua
            </p>
          </div>
        )}
        {!user ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Tv className="w-12 h-12 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted max-w-md text-sm">
              Inicia sesión para ver este canal en vivo
            </p>
            <Link href="/login" className="btn-primary px-6 py-2.5 rounded-[2px] tv-focus">
              Iniciar sesión
            </Link>
          </div>
        ) : !hasActivePlan ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Crown className="w-12 h-12 text-cinema-accent/40" aria-hidden />
            <p className="text-cinema-muted max-w-md text-sm">
              Necesitas un plan activo para ver TV en vivo
            </p>
            <Link
              href="/subscribe"
              className="btn-primary-glow inline-flex items-center gap-2 px-6 py-2.5 rounded-[2px]"
            >
              <Crown className="w-4 h-4" aria-hidden />
              Ver planes
            </Link>
          </div>
        ) : channelsError && channels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <ErrorState
              title="No se pudieron cargar los canales"
              description="Revisa tu conexión e inténtalo de nuevo."
              onRetry={onRetryChannels}
            />
          </div>
        ) : playerMessage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Tv className="w-12 h-12 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted text-sm max-w-sm">{playerMessage}</p>
          </div>
        ) : currentChannelId ? (
          <TVPlayer
            channelId={currentChannelId}
            channelName={currentChannelName || ''}
            streamKind={currentChannelKind}
          />
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
