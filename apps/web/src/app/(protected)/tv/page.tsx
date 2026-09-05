'use client';

import { useMemo } from 'react';
import { useQuery } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import { TVShell } from './_components/tv-shell';
import type { SidebarChannel } from './_components/channel-sidebar';

interface TVChannelItem extends SidebarChannel {
  isActive?: boolean;
  streamStatus?: 'online' | 'offline' | 'unknown';
}

export default function TVPage() {
  const list = useQuery(api.tv.list, { limit: 200, offset: 0 }) as
    | { items: TVChannelItem[] }
    | undefined;
  const channels = (list?.items ?? []) as SidebarChannel[];

  const first = useMemo(() => {
    const items = list?.items ?? [];
    return (
      items.find((c) => c.isPopular && c.streamStatus === 'online') ||
      items.find((c) => c.streamStatus === 'online') ||
      items[0]
    );
  }, [list]);

  return (
    <TVShell
      channels={channels}
      currentChannelId={first?._id}
      currentChannelName={first?.name}
      playerMessage={list && !first ? 'No hay canales disponibles ahora.' : undefined}
    />
  );
}
