'use client';

import { useEffect, useState } from 'react';

async function resolveByToken(token: string): Promise<string | null> {
  const res = await fetch(`/api/stream/resolve?token=${encodeURIComponent(token)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string | null };
  return data.url ?? null;
}

async function resolveVideoUrl(
  videoUrl: string | undefined,
  token: string | undefined
): Promise<string | null> {
  const trimmed = videoUrl?.trim();

  if (trimmed?.includes('/api/stream/') && trimmed.includes('.m3u8')) {
    // URL plana legacy (/api/stream/{token}/playlist.m3u8) → resolver por token
    const isFlatLegacy = /\/api\/stream\/[^/]+\/[^/]+\.m3u8$/.test(trimmed) &&
      !/\/api\/stream\/[^/]+\/[^/]+\/[^/]+\.m3u8$/.test(trimmed);

    if (isFlatLegacy && token) {
      return resolveByToken(token);
    }

    const res = await fetch(trimmed, { method: 'HEAD' });
    if (res.ok) return trimmed;
  } else if (trimmed) {
    return trimmed;
  }

  if (token) {
    return resolveByToken(token);
  }

  return null;
}

export function useResolvedVideoUrl(videoUrl: string | undefined, token: string | undefined) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveVideoUrl(videoUrl, token)
      .then((url) => {
        if (cancelled) return;
        setResolvedUrl(url);
        if (!url) setError('No se encontró stream para esta película.');
      })
      .catch(() => {
        if (!cancelled) setError('Error al resolver la URL del video.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoUrl, token]);

  return { resolvedUrl, loading, error };
}

export { resolveVideoUrl };
