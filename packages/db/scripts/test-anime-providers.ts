/**
 * Provider playground: tests every anime streaming provider ONE BY ONE for a
 * given anime + episode, reporting exactly what each returns. No fallback is
 * triggered here on purpose — the point is to see each provider in isolation.
 *
 * Usage:
 *   pnpm --filter @pelis/db playground:providers                       # defaults
 *   pnpm --filter @pelis/db playground:providers -- --anilist 20954 --episode 1 --dub
 */
import {
  ANIME_STREAMING_PROVIDERS,
  buildProviderEmbedUrl,
  getConsumetApiUrl,
} from '../src/lib/anime-providers.js';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    anilistId: Number(get('--anilist') ?? 20954),
    malId: Number(get('--mal') ?? 28851),
    episode: Number(get('--episode') ?? 1),
    dub: args.includes('--dub'),
    only: get('--only'),
  };
}

async function timedFetch(url: string, init?: RequestInit, timeoutMs = 10000) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': BROWSER_USER_AGENT, ...(init?.headers ?? {}) },
    });
    return { response, ms: Date.now() - started };
  } catch (err) {
    return {
      response: null as Response | null,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Deep probe of a Next.js-style embed player (vidlink/videasy pattern). */
async function probeEmbedPlayer(url: string): Promise<{
  ok: boolean;
  detail: string;
  pageMs: number | null;
}> {
  const page = await timedFetch(url, { redirect: 'follow', headers: { Accept: 'text/html' } }, 12000);
  if (!page.response) {
    return { ok: false, detail: `no responde (${page.error})`, pageMs: null };
  }
  if (!page.response.ok) {
    return { ok: false, detail: `HTTP ${page.response.status}`, pageMs: page.ms };
  }
  const html = await page.response.text();

  // Player shells that render an actual video element client-side usually
  // reference their API/backend. Look for obvious breakage signals.
  const localhostHit = /localhost:\d+|http:\/\/localhost\//.exec(html);
  const chunkMatch = html.match(/\/_next\/static\/chunks\/app\/anime\/[^"]+page-[^"]+\.js/);

  let chunkDetail = 'sin chunk Next.js (página estática o SPA propia)';
  if (chunkMatch) {
    const origin = new URL(page.response.url).origin;
    const chunk = await timedFetch(`${origin}${chunkMatch[0]}`, undefined, 12000);
    if (chunk.response?.ok) {
      const code = await chunk.response.text();
      const badLocalhost = /localhost:\d+|http:\/\/localhost\//.exec(code);
      chunkDetail = badLocalhost
        ? `ROTO: el bundle llama a ${badLocalhost[0]} (backend de desarrollo)`
        : 'bundle OK, sin referencias a localhost';
    } else {
      chunkDetail = `no se pudo descargar el bundle (${chunk.error ?? chunk.response?.status})`;
    }
  }

  return {
    ok: !localhostHit && !(chunkDetail.startsWith('ROTO')),
    detail: `${chunkDetail}${localhostHit ? ` · HTML referencia ${localhostHit[0]}` : ''}`,
    pageMs: page.ms,
  };
}

/** HLS provider through Consumet: episodes list + watch sources. */
async function probeHlsProvider(
  consumetId: string,
  anilistId: number,
  episodeNumber: number,
): Promise<{ ok: boolean; detail: string; ms: number | null }> {
  const base = getConsumetApiUrl();
  if (!base) {
    return { ok: false, detail: 'CONSUMET_API_URL no está configurado', ms: null };
  }

  const infoStart = Date.now();
  const info = await timedFetch(
    `${base}/meta/anilist/info/${anilistId}?provider=${consumetId}`,
    undefined,
    15000,
  );
  if (!info.response) {
    return { ok: false, detail: `info: sin respuesta (${info.error})`, ms: null };
  }
  if (!info.response.ok) {
    return { ok: false, detail: `info: HTTP ${info.response.status}`, ms: info.ms };
  }
  const data = (await info.response.json()) as {
    episodes?: Array<{ id: string; number: number }>;
  };
  const episodes = data.episodes ?? [];
  if (episodes.length === 0) {
    return { ok: false, detail: 'info: 0 episodios', ms: Date.now() - infoStart };
  }
  const target = episodes.find((ep) => ep.number === episodeNumber);
  if (!target) {
    return {
      ok: false,
      detail: `episodio ${episodeNumber} no existe (hay ${episodes.length})`,
      ms: Date.now() - infoStart,
    };
  }

  const watch = await timedFetch(
    `${base}/meta/anilist/watch/${encodeURIComponent(target.id)}?provider=${consumetId}`,
    undefined,
    15000,
  );
  if (!watch.response) {
    return { ok: false, detail: `watch: sin respuesta (${watch.error})`, ms: null };
  }
  if (!watch.response.ok) {
    return { ok: false, detail: `watch: HTTP ${watch.response.status}`, ms: watch.ms };
  }
  const video = (await watch.response.json()) as {
    sources?: Array<{ url?: string; quality?: string; isM3U8?: boolean }>;
  };
  const sources = (video.sources ?? []).filter((s) => s.url);
  if (sources.length === 0) {
    return { ok: false, detail: 'watch: 0 fuentes de video', ms: watch.ms };
  }

  // Verify at least one m3u8 actually downloads.
  const m3u8 = sources.find((s) => s.isM3U8 || s.url?.includes('.m3u8'));
  if (m3u8?.url) {
    const head = await timedFetch(m3u8.url, undefined, 10000);
    const reachable = Boolean(head.response?.ok);
    return {
      ok: reachable,
      detail: `${sources.length} fuentes · m3u8 ${reachable ? 'descargable' : 'NO descargable'} (${head.error ?? `HTTP ${head.response?.status}`})`,
      ms: watch.ms,
    };
  }
  return { ok: true, detail: `${sources.length} fuentes (sin m3u8 explícito)`, ms: watch.ms };
}

async function main() {
  const { anilistId, malId, episode, dub, only } = parseArgs();
  console.log(`\n=== Playground de proveedores ===`);
  console.log(`AniList ${anilistId} (MAL ${malId}) · episodio ${episode} · ${dub ? 'doblado' : 'subtitulado'}\n`);

  const providers = only
    ? ANIME_STREAMING_PROVIDERS.filter((p) => p.id === only)
    : ANIME_STREAMING_PROVIDERS;

  const results: Array<{ id: string; name: string; kind: string; ok: boolean; summary: string }> = [];

  for (const provider of providers) {
    const label = `${provider.name} [${provider.id}]`.padEnd(24);
    if (provider.kind === 'embed') {
      const url = provider.buildEmbedUrl?.({ anilistId, malId, episodeNumber: episode, dub });
      if (!url) {
        console.log(`${label} ✗  no genera URL`);
        results.push({ id: provider.id, name: provider.name, kind: 'embed', ok: false, summary: 'sin URL' });
        continue;
      }
      process.stdout.write(`${label} probando ${url} ... `);
      const probe = await probeEmbedPlayer(url);
      console.log(probe.ok ? '✓' : '✗');
      console.log(`{' '.repeat(24)} ${probe.detail}${probe.pageMs ? ` (${probe.pageMs}ms)` : ''}`);
      results.push({ id: provider.id, name: provider.name, kind: 'embed', ok: probe.ok, summary: probe.detail });
    } else {
      process.stdout.write(`${label} probando via Consumet (${provider.consumetId}) ... `);
      const probe = await probeHlsProvider(provider.consumetId!, anilistId, episode);
      console.log(probe.ok ? '✓' : '✗');
      console.log(`{' '.repeat(24)} ${probe.detail}${probe.ms ? ` (${probe.ms}ms)` : ''}`);
      results.push({ id: provider.id, name: provider.name, kind: 'hls', ok: probe.ok, summary: probe.detail });
    }
  }

  console.log('\n=== Resumen ===');
  for (const r of results) {
    console.log(`${r.ok ? ' ✓' : ' ✗'} ${r.name.padEnd(12)} (${r.kind}) → ${r.summary}`);
  }
  const working = results.filter((r) => r.ok);
  console.log(`\nFuncionando: ${working.map((r) => r.id).join(', ') || 'NINGUNO'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
