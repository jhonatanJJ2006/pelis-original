import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

const PROBE_TIMEOUT_MS = 15_000;

function isSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function looksLikeM3u8(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith('#EXTM3U') || trimmed.includes('#EXT-X-');
}

async function probeStreamUrl(streamUrl: string): Promise<{
  streamStatus: 'online' | 'offline';
  lastStreamError?: string;
}> {
  if (!isSafeUrl(streamUrl)) {
    return { streamStatus: 'offline', lastStreamError: 'URL no válida o no permitida' };
  }

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; PelisTV/1.0; +https://verpelis.pro)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    if (!response.ok) {
      let detail = `${response.status}`;
      try {
        const text = await response.text();
        const json = JSON.parse(text) as { message?: string };
        if (json.message) detail = `${response.status}: ${json.message}`;
        else if (text.length < 200) detail = `${response.status}: ${text}`;
      } catch {
        // keep status only
      }
      return { streamStatus: 'offline', lastStreamError: detail };
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      streamUrl.toLowerCase().includes('.m3u8');

    if (isManifest) {
      const text = await response.text();
      if (looksLikeM3u8(text)) {
        return { streamStatus: 'online' };
      }
      return { streamStatus: 'offline', lastStreamError: 'Respuesta no es un manifiesto M3U8 válido' };
    }

    return { streamStatus: 'online' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { streamStatus: 'offline', lastStreamError: message };
  }
}

export const checkChannelStream = action({
  args: { channelId: v.id('tvChannels') },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.tvHelpers.assertAdmin, {});
    const channel = await ctx.runQuery(internal.tvHelpers.getChannelById, {
      channelId: args.channelId,
    });
    if (!channel) {
      throw new Error('Canal no encontrado');
    }

    const result = await probeStreamUrl(channel.streamUrl);
    await ctx.runMutation(internal.tvHelpers.updateStreamStatus, {
      channelId: args.channelId,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    });

    return {
      channelId: args.channelId,
      name: channel.name,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    };
  },
});

export const checkAllChannels = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runQuery(internal.tvHelpers.assertAdmin, {});
    const channels = await ctx.runQuery(internal.tvHelpers.listAllChannelIds, {});

    let online = 0;
    let offline = 0;
    const failures: string[] = [];

    const batchSize = 5;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (ch) => {
          try {
            const result = await probeStreamUrl(ch.streamUrl);
            await ctx.runMutation(internal.tvHelpers.updateStreamStatus, {
              channelId: ch._id,
              streamStatus: result.streamStatus,
              lastStreamError: result.lastStreamError,
            });
            if (result.streamStatus === 'online') online += 1;
            else offline += 1;
          } catch (err) {
            offline += 1;
            failures.push(
              `${ch.name}: ${err instanceof Error ? err.message : 'error'}`
            );
          }
        })
      );
    }

    return {
      total: channels.length,
      online,
      offline,
      failures: failures.slice(0, 10),
    };
  },
});
