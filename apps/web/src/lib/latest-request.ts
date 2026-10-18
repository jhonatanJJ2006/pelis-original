/**
 * Guards async loads so only the newest request may touch state. A slower,
 * older response (previous episode/server/language) is dropped instead of
 * replacing the video that is already playing.
 */
export interface LatestRequestGuard {
  /** Starts a request and returns its token; every older token becomes stale. */
  begin(): number;
  isCurrent(token: number): boolean;
  /** Invalidates whatever is in flight (unmount, params changed). */
  cancel(): void;
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let current = 0;
  return {
    begin: () => ++current,
    isCurrent: (token) => token === current,
    cancel: () => {
      current += 1;
    },
  };
}

/** Identity of one stream lookup: same key → same request, never sent twice. */
export function animeStreamRequestKey(input: {
  animeId: string;
  episodeNumber: number;
  provider?: string | null;
  dub: boolean;
  excludeProviders: readonly string[];
}): string {
  return [
    input.animeId,
    input.episodeNumber,
    input.provider ?? '',
    input.dub ? 'dub' : 'sub',
    [...input.excludeProviders].sort().join(','),
  ].join('|');
}

/** The HLS flavour of a provider maps back to its server button (vidnest-hls → vidnest). */
export function animeProviderButtonId(providerId: string | null | undefined): string | undefined {
  if (!providerId) return undefined;
  return providerId.endsWith('-hls') ? providerId.slice(0, -'-hls'.length) : providerId;
}
