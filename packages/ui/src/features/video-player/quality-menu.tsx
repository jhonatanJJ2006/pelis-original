'use client';

import { cn } from '../../shared/utils';
import { qualityButtonLabel, type QualityLevelOption } from './quality-levels';

interface QualityMenuProps {
  options: QualityLevelOption[];
  /** -1 = Auto (ABR). */
  selected: number;
  /** Level hls.js is playing right now (for the "Auto (720p)" label). */
  playingLevel: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (index: number) => void;
}

/** Same pattern as the anime player's quality menu, shared by the movie player. */
export function QualityMenu({
  options,
  selected,
  playingLevel,
  open,
  onOpenChange,
  onSelect,
}: QualityMenuProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="rounded-[6px] border border-cinema-border px-2 py-1 text-xs font-semibold hover:border-cinema-accent/60"
        aria-label="Calidad"
        aria-expanded={open}
      >
        {qualityButtonLabel(options, selected, playingLevel)}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Calidad de transmisión"
          className="absolute bottom-full right-3 mb-3 w-72 max-w-[calc(100%-1.5rem)] max-h-[60vh] overflow-y-auto rounded-lg border border-cinema-border bg-cinema-surface/95 p-3 text-sm shadow-[0_16px_48px_rgba(19,19,21,0.6)] backdrop-blur-md"
        >
          <p className="mb-2 px-2 text-label uppercase text-cinema-ash">Calidad de transmisión</p>
          {[{ index: -1, label: 'Auto' }, ...options].map((option) => (
            <button
              key={option.index}
              type="button"
              role="menuitemradio"
              aria-checked={selected === option.index}
              onClick={() => onSelect(option.index)}
              className={cn(
                'flex w-full items-center justify-between rounded-[6px] border border-transparent px-3 py-2 text-left text-cinema-chalk hover:bg-cinema-elevated',
                selected === option.index &&
                  'border-cinema-accent/60 bg-cinema-accent/10 text-cinema-accent'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
