'use client';

import { useMemo } from 'react';
import { useQueryResult } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import { TVShell } from './_components/tv-shell';
import type { SidebarChannel } from './_components/channel-sidebar';

interface TVChannelItem extends SidebarChannel {
  isActive?: boolean;
  streamStatus?: 'online' | 'offline' | 'unknown';
}

export default function TVPage() {
  const {
    data: list,
    error,
    isLoading,
    refetch,
  } = useQueryResult<{ items: TVChannelItem[] }>(api.tv.list, { limit: 40, offset: 0 });
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
      currentChannelKind={first?.streamKind}
      playerMessage={list && !first ? 'No hay canales disponibles ahora.' : undefined}
      channelsLoading={isLoading}
      channelsError={error}
      onRetryChannels={refetch}
    />
  );
}
