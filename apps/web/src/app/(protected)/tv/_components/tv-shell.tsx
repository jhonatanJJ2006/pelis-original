'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Crown, Tv } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { TVTopbar } from './tv-topbar';
import { ChannelSidebar, type SidebarChannel } from './channel-sidebar';

const TVPlayer = dynamic(() => import('../[id]/tv-player'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-cinema-violet border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-cinema-muted text-sm">Cargando reproductor...</p>
      </div>
    </div>
  ),
});

interface TVShellProps {
  channels: SidebarChannel[];
  currentChannelId: string;
  currentChannelName: string;
  currentChannelLogo?: string;
}

export function TVShell({
  channels,
  currentChannelId,
  currentChannelName,
  currentChannelLogo,
}: TVShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useUser();
  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  return (
    <div className="fixed inset-0 z-30 bg-black flex flex-col">
      <TVTopbar
        channelName={currentChannelName}
        channelLogo={currentChannelLogo}
        onBurgerClick={() => setSidebarOpen(true)}
        channelCount={channels.length}
      />

      <div className="flex-1 relative overflow-hidden">
        {!user ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <Tv className="w-16 h-16 text-cinema-muted/30" aria-hidden />
            <p className="text-cinema-muted max-w-md">
              Iniciá sesión para ver este canal en vivo
            </p>
            <Link href="/login" className="btn-primary px-6 py-2.5 rounded-[10px]">
              Iniciar sesión
            </Link>
          </div>
        ) : !hasActivePlan ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <Crown className="w-16 h-16 text-cinema-gold/40" aria-hidden />
            <p className="text-cinema-muted max-w-md">
              Necesitás un plan activo para ver TV en vivo
            </p>
            <Link
              href="/subscribe"
              className="btn-primary-glow inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px]"
            >
              <Crown className="w-4 h-4" aria-hidden />
              Ver planes
            </Link>
          </div>
        ) : (
          <TVPlayer channelId={currentChannelId} channelName={currentChannelName} />
        )}
      </div>

      {sidebarOpen && (
        <ChannelSidebar
          channels={channels}
          currentId={currentChannelId}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
