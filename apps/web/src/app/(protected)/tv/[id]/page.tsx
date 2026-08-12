'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@pelis/db/client';
import { AlertCircle, Loader2, Tv } from 'lucide-react';
import Link from 'next/link';
import { api } from '@pelis/db';
import { TVShell } from '../_components/tv-shell';
import type { SidebarChannel } from '../_components/channel-sidebar';

interface TVChannelItem {
  _id: string;
  name: string;
  logo: string;
  category: string;
  country?: string;
  language?: string;
  isActive?: boolean;
  streamStatus?: 'unknown' | 'online' | 'offline';
}

export default function TVChannelPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';

  const channel = useQuery(api.tv.getById, { id: id as any }) as TVChannelItem | null | undefined;
  const channels = useQuery(api.tv.list, {}) as TVChannelItem[] | undefined;

  if (channel === undefined) {
    return (
      <div className="fixed inset-0 z-30 bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cinema-violet animate-spin mx-auto mb-3" />
          <p className="text-cinema-muted text-sm">Cargando canal...</p>
        </div>
      </div>
    );
  }

  if (!channel || channel.isActive === false) {
    return (
      <div className="fixed inset-0 z-30 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-14 h-14 text-cinema-muted/40 mx-auto mb-4" />
          <h1 className="font-display text-3xl text-white uppercase tracking-wide mb-2">
            Canal no encontrado
          </h1>
          <p className="text-cinema-muted text-sm mb-6">
            El canal que buscás no está disponible.
          </p>
          <Link
            href="/tv"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px]"
          >
            <Tv className="w-4 h-4" />
            Ver todos los canales
          </Link>
        </div>
      </div>
    );
  }

  const isPlayable = channel.streamStatus === 'online';

  if (!isPlayable) {
    return (
      <div className="fixed inset-0 z-30 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-14 h-14 text-cinema-muted/40 mx-auto mb-4" />
          <h1 className="font-display text-3xl text-white uppercase tracking-wide mb-2">
            Canal no disponible
          </h1>
          <p className="text-cinema-muted text-sm mb-6">
            {channel.streamStatus === 'offline'
              ? 'El proveedor del stream no responde en este momento.'
              : 'Este canal aún no fue verificado. Volvé más tarde.'}
          </p>
          <Link
            href="/tv"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px]"
          >
            <Tv className="w-4 h-4" />
            Ver otros canales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TVShell
      channels={(channels ?? []) as SidebarChannel[]}
      currentChannelId={channel._id}
      currentChannelName={channel.name}
      currentChannelLogo={channel.logo}
    />
  );
}
