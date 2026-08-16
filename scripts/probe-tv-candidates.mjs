#!/usr/bin/env node
/**
 * Probe de streams candidatos para Disney XD / Cartoon Network / Anime Latam.
 *
 * Hace HEAD/GET con timeout 8s y reporta estado. Solo diagnóstico, no guarda nada.
 */

const CANDIDATES = [
  // Disney XD / Disney Channel — feeds HLS públicos que circulan en listas IPTV
  // (verificados manualmente como punto de partida; pueden caer — el admin debe probar)
  { name: 'Disney XD Latinoamérica (test)', url: 'https://d2syj4rnypt5ub.cloudfront.net/disneyxd/v1/master.m3u8' },
  { name: 'Disney Channel Latinoamérica (test)', url: 'https://d2syj4rnypt5ub.cloudfront.net/disneychannel/v1/master.m3u8' },
  { name: 'Cartoon Network Latam (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4231.playouts.now.amagi.tv/playlist/amg01201-rakutentv-cnrakutentv/playlist.m3u8' },
  { name: 'Discovery Kids (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4250.playouts.now.amagi.tv/playlist/amg01201-rakutentv-dkrakutentv/playlist.m3u8' },
  { name: 'Nickelodeon (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4196.playouts.now.amagi.tv/playlist/amg01201-rakutentv-nikrakutentv/playlist.m3u8' },
  { name: 'Tooncast (test)', url: 'https://tooncast-ak.akamaized.net/hls/live/2020238/toonastc/LAT.m3u8' },
  { name: 'Animax Latinoamérica', url: 'https://amg01201-amg01201c4-rakuten-us-4185.playouts.now.amagi.tv/playlist/amg01201-rakutentv-anxrakutentv/playlist.m3u8' },
  // Crunchyroll (no suele tener feed público abierto), MX con feeds alternativos
  { name: 'MTV Latinoamérica', url: 'https://amg01201-amg01201c4-rakuten-us-4190.playouts.now.amagi.tv/playlist/amg01201-rakutentv-mtvrakutentv/playlist.m3u8' },
];

async function probe(name, url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const ms = Date.now() - start;
    const text = await res.text();
    const isM3u8 = text.startsWith('#EXTM3U') || text.includes('#EXT-X-');
    return {
      name,
      url,
      ok: res.ok && isM3u8,
      status: res.status,
      ms,
      contentType: res.headers.get('content-type'),
      isM3u8,
      preview: text.slice(0, 200).replace(/\n/g, ' ⏎ '),
    };
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      status: 'ERR',
      ms: Date.now() - start,
      error: err.message,
    };
  }
}

async function main() {
  console.log(`Probando ${CANDIDATES.length} streams…\n`);
  const results = await Promise.all(CANDIDATES.map((c) => probe(c.name, c.url)));
  for (const r of results) {
    const flag = r.ok ? '✅' : '❌';
    console.log(`${flag} ${r.name}`);
    console.log(`     ${r.url}`);
    console.log(`     status=${r.status} ms=${r.ms} content-type=${r.contentType ?? '?'} m3u8=${r.isM3u8 ?? '?'}`);
    if (r.error) console.log(`     error: ${r.error}`);
    if (r.preview) console.log(`     preview: ${r.preview}`);
    console.log('');
  }
}

main();