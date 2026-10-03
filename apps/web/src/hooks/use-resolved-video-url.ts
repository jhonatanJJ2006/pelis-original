'use client';

import { useEffect, useState } from 'react';

async function resolveByToken(token: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/stream/resolve?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string | null };
    return data.url ?? null;
  } catch {
    return null;
  }
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function isFlatLegacyStream(url: string): boolean {
  return (
    /\/api\/stream\/[^/]+\/[^/]+\.m3u8$/.test(url) &&
    !/\/api\/stream\/[^/]+\/[^/]+\/[^/]+\.m3u8$/.test(url)
  );
}

export async function resolveVideoUrl(
  videoUrl: string | undefined,
  token: string | undefined
): Promise<string | null> {
  const trimmed = videoUrl?.trim();
  let tokenPromise: Promise<string | null> | null = null;
  const lookupToken = () => {
    if (!token) return Promise.resolve(null);
    if (!tokenPromise) tokenPromise = resolveByToken(token);
    return tokenPromise;
  };

  if (trimmed?.includes('/api/stream/') && trimmed.includes('.m3u8')) {
    // Flat legacy URLs (/api/stream/{token}/playlist.m3u8) prefer the on-disk
    // manifest, but a missing token folder must not drop a URL that still 200s.
    if (isFlatLegacyStream(trimmed) && token) {
      const resolved = await lookupToken();
      if (resolved) return resolved;
    }

    if (await headOk(trimmed)) return trimmed;
  } else if (trimmed) {
    return trimmed;
  }

  if (token) return lookupToken();
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
