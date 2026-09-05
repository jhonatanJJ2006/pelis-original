'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import { TVShell } from '../_components/tv-shell';
import type { SidebarChannel } from '../_components/channel-sidebar';

interface TVChannelItem extends SidebarChannel {
  isActive?: boolean;
  streamStatus?: 'unknown' | 'online' | 'offline';
}

export default function TVChannelPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';

  const channel = useQuery(api.tv.getById, { id: id as never }) as TVChannelItem | null | undefined;
  const list = useQuery(api.tv.list, { limit: 200, offset: 0 }) as
    | { items: TVChannelItem[] }
    | undefined;
  const channels = (list?.items ?? []) as SidebarChannel[];

  const unavailable =
    channel === null || channel?.isActive === false
      ? 'El canal que buscas no está disponible.'
      : channel && channel.streamStatus === 'offline'
        ? 'Este canal no está disponible ahora. Prueba otro de la lista.'
        : undefined;

  return (
    <TVShell
      channels={channels}
      currentChannelId={unavailable ? undefined : channel?._id}
      currentChannelName={channel?.name}
      playerMessage={
        channel === undefined ? undefined : unavailable
      }
    />
  );
}
