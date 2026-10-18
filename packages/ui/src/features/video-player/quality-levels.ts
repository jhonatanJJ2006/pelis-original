export interface QualityLevelOption {
  /** Index in hls.levels (what hls.currentLevel expects). */
  index: number;
  label: string;
}

interface HlsLevelLike {
  height?: number;
  width?: number;
  bitrate?: number;
}

function levelLabel(level: HlsLevelLike, index: number): string {
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
  return `Nivel ${index + 1}`;
}

/**
 * Menu entries for hls.levels: highest first, one entry per label (keeps the
 * highest bitrate when two renditions share a height). A single-rendition
 * playlist yields one entry, so the selector stays hidden.
 */
export function hlsQualityOptions(levels: readonly HlsLevelLike[]): QualityLevelOption[] {
  const byLabel = new Map<string, { index: number; level: HlsLevelLike }>();
  levels.forEach((level, index) => {
    const label = levelLabel(level, index);
    const existing = byLabel.get(label);
    if (!existing || (level.bitrate ?? 0) > (existing.level.bitrate ?? 0)) {
      byLabel.set(label, { index, level });
    }
  });
  return [...byLabel.entries()]
    .map(([label, { index, level }]) => ({
      index,
      label,
      rank: level.height ?? level.bitrate ?? 0,
    }))
    .sort((a, b) => b.rank - a.rank)
    .map(({ index, label }) => ({ index, label }));
}

/** Selector visible only when there is a real choice. */
export function shouldShowQualitySelector(options: readonly QualityLevelOption[]): boolean {
  return options.length > 1;
}

/** Button label: the manual pick, or "Auto (720p)" while ABR chooses. */
export function qualityButtonLabel(
  options: readonly QualityLevelOption[],
  selected: number,
  playingLevel: number
): string {
  if (selected >= 0) return options.find((o) => o.index === selected)?.label ?? 'Auto';
  const playing = options.find((o) => o.index === playingLevel)?.label;
  return playing ? `Auto (${playing})` : 'Auto';
}
