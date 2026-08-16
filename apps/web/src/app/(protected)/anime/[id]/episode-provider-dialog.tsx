'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, X, Zap, Server, Languages, Loader2 } from 'lucide-react';
import { cn } from '@pelis/ui/utils';

export interface ProviderInfo {
  id: string;
  name: string;
  kind: 'embed' | 'hls';
  language: string;
  note?: string | null;
}

export interface EpisodeChoice {
  animeId: string;
  seasonLabel: string;
  number: number;
  title: string;
  image?: string;
}

interface EpisodeProviderDialogProps {
  episode: EpisodeChoice;
  providers: ProviderInfo[];
  onClose: () => void;
}

/**
 * Provider picker shown after the user chooses an episode.
 *
 * Embed providers are listed first and pre-selected because they play without
 * server-side scraping; the scraped ones are grouped below and labelled as
 * unstable so a failure is expected rather than confusing.
 */
export function EpisodeProviderDialog({ episode, providers, onClose }: EpisodeProviderDialogProps) {
  const router = useRouter();
  const embeds = providers.filter((p) => p.kind === 'embed');
  const scrapers = providers.filter((p) => p.kind === 'hls');

  const [selected, setSelected] = useState(embeds[0]?.id ?? providers[0]?.id ?? '');
  const [dub, setDub] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const play = () => {
    if (!selected) return;
    setStarting(true);
    const params = new URLSearchParams({ provider: selected });
    if (dub) params.set('dub', '1');
    router.push(`/anime/watch/${episode.animeId}/${episode.number}?${params.toString()}`);
  };

  const supportsDub = providers.find((p) => p.id === selected)?.language.includes('dub') ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-cinema-surface border border-cinema-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-cinema-border shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-cinema-violet-light font-medium">
              {episode.seasonLabel} · Episodio {episode.number}
            </p>
            <h2 id="provider-dialog-title" className="text-base font-semibold text-white truncate">
              {episode.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-cinema-muted hover:text-white hover:bg-cinema-elevated transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <p className="text-sm text-cinema-silver mb-3">Elige desde dónde reproducir:</p>

          {embeds.length > 0 && (
            <div className="mb-5">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-emerald-400 font-medium mb-2">
                <Zap className="w-3 h-3" aria-hidden />
                Recomendados
              </p>
              <div className="grid gap-2">
                {embeds.map((provider) => (
                  <ProviderOption
                    key={provider.id}
                    provider={provider}
                    selected={selected === provider.id}
                    onSelect={() => setSelected(provider.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {scrapers.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-cinema-muted font-medium mb-2">
                <Server className="w-3 h-3" aria-hidden />
                Servidores externos
              </p>
              <p className="text-xs text-cinema-muted mb-2">
                Dependen de scrapers que suelen caerse. Si fallan, se usa automáticamente uno de los
                recomendados.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {scrapers.map((provider) => (
                  <ProviderOption
                    key={provider.id}
                    provider={provider}
                    selected={selected === provider.id}
                    onSelect={() => setSelected(provider.id)}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {supportsDub && (
            <label className="flex items-center gap-2.5 mt-5 p-3 rounded-xl bg-cinema-elevated border border-cinema-border cursor-pointer">
              <input
                type="checkbox"
                checked={dub}
                onChange={(event) => setDub(event.target.checked)}
                className="w-4 h-4 accent-cinema-violet"
              />
              <Languages className="w-4 h-4 text-cinema-silver" aria-hidden />
              <span className="text-sm text-cinema-silver">
                Audio doblado <span className="text-cinema-muted">(si está disponible)</span>
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-4 border-t border-cinema-border shrink-0">
          <button
            type="button"
            onClick={play}
            disabled={!selected || starting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cinema-violet text-white font-medium hover:bg-cinema-violet/90 disabled:opacity-60 transition-colors"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Play className="w-4 h-4" aria-hidden />
            )}
            Reproducir episodio {episode.number}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderOption({
  provider,
  selected,
  onSelect,
  compact,
}: {
  provider: ProviderInfo;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl border text-left transition-all',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        selected
          ? 'bg-cinema-violet/15 border-cinema-violet text-white'
          : 'bg-cinema-elevated border-cinema-border text-cinema-silver hover:text-white hover:border-cinema-violet/40'
      )}
    >
      <span className="min-w-0">
        <span className={cn('block font-medium truncate', compact ? 'text-xs' : 'text-sm')}>
          {provider.name}
        </span>
        {!compact && provider.note && (
          <span className="block text-[11px] text-cinema-muted">{provider.note}</span>
        )}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-cinema-muted shrink-0">
        {provider.language}
      </span>
    </button>
  );
}
