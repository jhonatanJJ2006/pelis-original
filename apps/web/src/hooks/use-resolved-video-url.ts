'use client';

import { useCallback, useEffect, useState } from 'react';
import { playbackError, playbackErrorFromStatus, type PlaybackError } from '../lib/playback-errors';

export type VideoResolution =
  { url: string; error?: undefined } | { url: null; error: PlaybackError };

type TokenLookup = { url: string | null; error?: PlaybackError };

async function readCode(res: Response): Promise<string | null> {
  try {
    const data = (await res.clone().json()) as { code?: string };
    return data.code ?? null;
  } catch {
    return null;
  }
}

async function resolveByToken(token: string): Promise<TokenLookup> {
  let res: Response;
  try {
    res = await fetch(`/api/stream/resolve?token=${encodeURIComponent(token)}`);
  } catch {
    return { url: null, error: playbackError('network') };
  }
  if (!res.ok) {
    return { url: null, error: playbackErrorFromStatus(res.status, await readCode(res)) };
  }
  try {
    const data = (await res.json()) as { url?: string | null };
    return data.url ? { url: data.url } : { url: null, error: playbackError('missing') };
  } catch {
    return { url: null, error: playbackError('network') };
  }
}

async function headCheck(url: string): Promise<PlaybackError | null> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'HEAD' });
  } catch {
    return playbackError('network');
  }
  if (res.ok) return null;
  // HEAD has no body: the status alone (401/403/404/503) carries the cause.
  return playbackErrorFromStatus(res.status);
}

/** Session/plan problems outrank "missing": they explain any 404 that follows. */
function worst(a: PlaybackError | undefined, b: PlaybackError | undefined): PlaybackError {
  const rank = { unauthenticated: 5, no_plan: 4, disk: 3, network: 2, missing: 1 } as const;
  if (!a) return b ?? playbackError('missing');
  if (!b) return a;
  return rank[a.kind] >= rank[b.kind] ? a : b;
}

/**
 * Picks the URL the player should load, or the real reason it cannot.
 * With a token, the server resolver goes first: it prefers master.m3u8
 * (multiple qualities) over the single-rendition playlist stored in videoUrl.
 */
export async function resolveVideoPlayback(
  videoUrl: string | undefined,
  token: string | undefined
): Promise<VideoResolution> {
  const trimmed = videoUrl?.trim();
  const isLocalStream = Boolean(trimmed?.includes('/api/stream/') && trimmed.includes('.m3u8'));

  if (trimmed && !isLocalStream) return { url: trimmed };

  let tokenError: PlaybackError | undefined;
  if (token) {
    const lookup = await resolveByToken(token);
    if (lookup.url) return { url: lookup.url };
    tokenError = lookup.error;
    // No session / no plan applies to videoUrl too; do not hide it behind a 404.
    if (tokenError && (tokenError.kind === 'unauthenticated' || tokenError.kind === 'no_plan')) {
      return { url: null, error: tokenError };
    }
  }

  if (trimmed) {
    const headError = await headCheck(trimmed);
    if (!headError) return { url: trimmed };
    return { url: null, error: worst(headError, tokenError) };
  }

  return { url: null, error: tokenError ?? playbackError('missing') };
}

/** Backwards-compatible helper (admin preview): URL or null. */
export async function resolveVideoUrl(
  videoUrl: string | undefined,
  token: string | undefined
): Promise<string | null> {
  return (await resolveVideoPlayback(videoUrl, token)).url;
}

export function useResolvedVideoUrl(videoUrl: string | undefined, token: string | undefined) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PlaybackError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveVideoPlayback(videoUrl, token)
      .then((result) => {
        if (cancelled) return;
        setResolvedUrl(result.url);
        setError(result.url ? null : (result.error ?? playbackError('missing')));
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl(null);
          setError(playbackError('network'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoUrl, token, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { resolvedUrl, loading, error, retry };
}
