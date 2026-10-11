'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Tv } from 'lucide-react';
import { cn } from '@pelis/ui/utils';
import type { SidebarChannel } from './channel-sidebar';

interface ChannelRowProps {
  channel: SidebarChannel;
  active: boolean;
  onSelect: (id: string) => void;
}

function ChannelRowInner({ channel, active, onSelect }: ChannelRowProps) {
  return (
    <li style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}>
      <Link
        href={`/tv/${channel._id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelect(channel._id);
        }}
        onFocus={(e) => {
          e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }}
        className={cn(
          'flex items-center gap-2 px-2 py-2 rounded-lg my-0.5 transition-colors tv-focus',
          'hover:bg-cinema-elevated',
          active && 'bg-cinema-accent/10 ring-1 ring-cinema-accent/35'
        )}
        aria-current={active ? 'true' : undefined}
      >
        <div className="shrink-0 w-8 h-8 rounded-md bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
          {channel.logo ? (
            // Logos IPTV: img nativo evita el decoder de next/image en listas largas.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.logo}
              alt=""
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              className="w-6 h-6 object-contain"
            />
          ) : (
            <Tv className="w-3.5 h-3.5 text-cinema-silver" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-cinema-chalk truncate">{channel.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {active && (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-cinema-danger font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cinema-danger animate-pulse" />
                Viendo
              </span>
            )}
            {channel.streamStatus === 'offline' && (
              <span className="text-[9px] uppercase tracking-wider text-cinema-ash">
                No disponible
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export const ChannelRow = memo(ChannelRowInner, (prev, next) => {
  return (
    prev.active === next.active &&
    prev.channel._id === next.channel._id &&
    prev.channel.name === next.channel.name &&
    prev.channel.logo === next.channel.logo &&
    prev.channel.streamStatus === next.channel.streamStatus &&
    prev.onSelect === next.onSelect
  );
});
