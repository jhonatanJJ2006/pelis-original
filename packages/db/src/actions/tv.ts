import { z } from 'zod';
import { prisma } from '../client.js';
import { notifyChange } from '../realtime.js';
import { register } from '../registry.js';

const PROBE_TIMEOUT_MS = 12000;
const FAILURE_THRESHOLD = 2;

interface ParsedChannel {
  name: string;
  logo: string;
  category: string;
  country: string;
  language: string;
  streamUrl: string;
  tvgId: string;
}

function parseM3U(text: string, fallbackCountry: string, fallbackLanguage: string): ParsedChannel[] {
  const channels: ParsedChannel[] = [];
  const lines = text.split(/\r?\n/);
  let currentExtinf: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      currentExtinf = line;
    } else if (!line.startsWith('#') && currentExtinf) {
      const streamUrl = line;
      const logoMatch = currentExtinf.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch?.[1] ?? '';
      const groupMatch = currentExtinf.match(/group-title="([^"]*)"/);
      const category = groupMatch?.[1]?.trim() || 'General';
      const nameMatch = currentExtinf.match(/,(.+)$/);
      const name = nameMatch?.[1]?.trim() || 'Canal sin nombre';
      const tvgIdMatch = currentExtinf.match(/tvg-id="([^"]*)"/);
      const tvgId = tvgIdMatch?.[1] ?? '';
      const tvgCountryMatch = currentExtinf.match(/tvg-country="([^"]*)"/i);
      const tvgLangMatch = currentExtinf.match(/tvg-language="([^"]*)"/i);
      channels.push({
        name,
        logo,
        category: category || 'General',
        country: tvgCountryMatch?.[1] ?? fallbackCountry,
        language: tvgLangMatch?.[1] ?? fallbackLanguage,
        streamUrl,
        tvgId,
      });
      currentExtinf = null;
    }
  }
  return channels;
}

function isGeoBlockedHint(text: string): boolean {
  return /geo.?block|not available in your|region|403|access denied/i.test(text);
}

async function probeUpstream(streamUrl: string): Promise<{
  streamStatus: 'online' | 'offline';
  lastStreamError?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; PelisTV-Probe/1.0; +https://verpelis.pro)',
        'Cache-Control': 'no-store',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text.length < 200) detail = `${response.status}: ${text.replace(/\s+/g, ' ').trim()}`;
      } catch {
        // ignore
      }
      return { streamStatus: 'offline', lastStreamError: detail };
    }
    const finalUrl = response.url || streamUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      finalUrl.toLowerCase().includes('.m3u8');
    if (!isManifest) return { streamStatus: 'online' };
    const text = await response.text();
    if (!text.startsWith('#EXTM3U') && !text.includes('#EXT-X-')) {
      return { streamStatus: 'offline', lastStreamError: 'Respuesta no es un manifiesto M3U8 válido' };
    }
    if (!text.includes('#EXTINF') && !text.includes('#EXT-X-STREAM-INF')) {
      return { streamStatus: 'offline', lastStreamError: 'Manifiesto sin segmentos de video' };
    }
    return { streamStatus: 'online' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return {
      streamStatus: 'offline',
      lastStreamError: isGeoBlockedHint(message) ? `Geo-block: ${message}` : message,
    };
  }
}

export const seedFromM3U = register({
  kind: 'action',
  name: 'tv.seedFromM3U',
  writes: ['tv_channel', 'tv_playlist'],
  args: z.object({
    m3uUrl: z.string(),
    playlistId: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
  }),
  handler: async (_ctx, args) => {
    const response = await fetch(args.m3uUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la lista M3U: ${response.status}`);
    }
    const text = await response.text();
    const parsed = parseM3U(
      text,
      args.country ?? 'Desconocido',
      args.language ?? 'es',
    );

    const existing = await prisma.tVChannel.findMany({ where: { isActive: true }, select: { streamUrl: true } });
    const existingUrls = new Set(existing.map((c) => c.streamUrl));

    let added = 0;
    let updated = 0;
    const failures: string[] = [];

    for (const ch of parsed) {
      try {
        const existingChannel = await prisma.tVChannel.findFirst({ where: { streamUrl: ch.streamUrl } });
        if (existingChannel) {
          await prisma.tVChannel.update({
            where: { id: existingChannel.id },
            data: {
              name: ch.name,
              logo: ch.logo || existingChannel.logo,
              category: ch.category || existingChannel.category,
              country: ch.country || existingChannel.country,
              language: ch.language || existingChannel.language,
              isActive: true,
              tvgId: ch.tvgId || existingChannel.tvgId,
              sourcePlaylistId: args.playlistId ?? existingChannel.sourcePlaylistId,
              source: args.playlistId ? 'm3u-playlist' : existingChannel.source,
            },
          });
          updated++;
        } else {
          await prisma.tVChannel.create({
            data: {
              name: ch.name,
              logo: ch.logo,
              category: ch.category || 'General',
              country: ch.country,
              language: ch.language,
              streamUrl: ch.streamUrl,
              source: args.playlistId ? 'm3u-playlist' : 'iptv-org',
              sourcePlaylistId: args.playlistId ?? null,
              tvgId: ch.tvgId,
              isActive: true,
              streamStatus: 'UNKNOWN',
            },
          });
          added++;
        }
        void existingUrls;
      } catch (err) {
        failures.push(`${ch.name}: ${err instanceof Error ? err.message : 'error'}`);
      }
    }

    if (args.playlistId) {
      await prisma.tVPlaylist.update({
        where: { id: args.playlistId },
        data: { lastImportedAt: new Date(), totalChannels: parsed.length },
      });
    }

    await notifyChange('tv_channel', 'update');

    return {
      total: parsed.length,
      added,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 10),
    };
  },
});

export const probeChannel = register({
  kind: 'action',
  name: 'tv.probeChannel',
  writes: ['tv_channel'],
  args: z.object({ channelId: z.string() }),
  handler: async (_ctx, { channelId }) => {
    const channel = await prisma.tVChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Canal no encontrado');

    const result = await probeUpstream(channel.streamUrl);

    const threshold = FAILURE_THRESHOLD;
    const previous = channel.consecutiveFailures ?? 0;
    let nextFailures = previous;
    if (result.streamStatus === 'online') nextFailures = 0;
    else if (result.streamStatus === 'offline') nextFailures = previous + 1;
    const shouldDeactivate = !channel.isPopular && nextFailures >= threshold;

    await prisma.tVChannel.update({
      where: { id: channelId },
      data: {
        streamStatus: result.streamStatus === 'online' ? 'ONLINE' : 'OFFLINE',
        lastCheckedAt: new Date(),
        lastStreamError: result.lastStreamError ?? null,
        consecutiveFailures: shouldDeactivate ? 0 : nextFailures,
        isActive: shouldDeactivate ? false : channel.isActive,
      },
    });
    await notifyChange('tv_channel', 'update', channelId);

    return {
      channelId,
      name: channel.name,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    };
  },
});

export const probeAllChannels = register({
  kind: 'action',
  name: 'tv.probeAllChannels',
  writes: ['tv_channel'],
  args: z.object({
    batchSize: z.number().optional(),
    onlyActive: z.boolean().optional(),
    deactivateAfterFailures: z.number().optional(),
  }),
  handler: async (_ctx, args) => {
    const batch = args.batchSize ?? 8;
    const threshold = args.deactivateAfterFailures ?? FAILURE_THRESHOLD;
    const channels = await prisma.tVChannel.findMany();
    const all = (args.onlyActive ?? true)
      ? channels.filter((c) => c.isActive)
      : channels;

    let online = 0;
    let offline = 0;
    let deactivated = 0;
    const sampleErrors: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < all.length; i += batch) {
      const slice = all.slice(i, i + batch);
      await Promise.all(
        slice.map(async (entry) => {
          try {
            const result = await probeUpstream(entry.streamUrl);
            const previous = entry.consecutiveFailures ?? 0;
            let nextFailures = previous;
            if (result.streamStatus === 'online') nextFailures = 0;
            else if (result.streamStatus === 'offline') nextFailures = previous + 1;
            const shouldDeactivate = !entry.isPopular && nextFailures >= threshold;
            await prisma.tVChannel.update({
              where: { id: entry.id },
              data: {
                streamStatus: result.streamStatus === 'online' ? 'ONLINE' : 'OFFLINE',
                lastCheckedAt: new Date(),
                lastStreamError: result.lastStreamError ?? null,
                consecutiveFailures: shouldDeactivate ? 0 : nextFailures,
                isActive: shouldDeactivate ? false : entry.isActive,
              },
            });
            if (result.streamStatus === 'online') online++;
            else {
              offline++;
              if (shouldDeactivate) deactivated++;
              if (sampleErrors.length < 20 && result.lastStreamError) {
                sampleErrors.push({ name: entry.name, error: result.lastStreamError });
              }
            }
          } catch (err) {
            offline++;
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            await prisma.tVChannel.update({
              where: { id: entry.id },
              data: {
                streamStatus: 'OFFLINE',
                lastStreamError: msg,
                lastCheckedAt: new Date(),
              },
            });
          }
        }),
      );
      await new Promise((r) => setTimeout(r, 100));
    }
    await notifyChange('tv_channel', 'update');

    return { processed: all.length, online, offline, deactivated, sampleErrors };
  },
});