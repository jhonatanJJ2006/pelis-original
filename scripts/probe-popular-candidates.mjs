#!/usr/bin/env node
/**
 * Probe de feeds alternativos para canales tradicionales populares.
 *
 *  - CNN en Español
 *  - BBC Mundo / BBC News
 *  - DW Español
 *  - RT en Español
 *  - France 24 Español
 *  - ESPN
 *  - Fox Sports / Fox Deportes
 *  - Cartoon Network (Pluto)
 *  - Discovery Kids
 *  - Nickelodeon
 *  - Disney Channel LatAm
 *  - TNT
 *  - Cinecanal
 *  - AMC
 *  - MTV
 *  - National Geographic
 *  - Latina
 *  - Willax
 *  - América TV (Perú)
 *  - Trome
 *
 *  Solo diagnóstico, no guarda nada.
 *  Devuelve exit code 1 si NINGÚN feed de un canal funciona.
 */

const CANDIDATES = [
  // ── Noticias ──
  { name: 'CNN en Español (YouTube Pluto)', url: 'https://jmp2.uk/plu-5ee92e72fb286e0007285fec.m3u8' },
  { name: 'CNN en Español (mirror)', url: 'https://amg01201-amg01201c4-rakuten-us-4188.playouts.now.amagi.tv/playlist/amg01201-rakutentv-cnnrakutentv/playlist.m3u8' },
  { name: 'BBC News (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4184.playouts.now.amagi.tv/playlist/amg01201-rakutentv-bbcrakutentv/playlist.m3u8' },
  { name: 'BBC News (mirror)', url: 'https://linear-46.frequency.stream/dist/plex/46/hls/master/playlist.m3u8' },
  { name: 'DW Español (legado)', url: 'https://dwamdstream102.akamaized.net/live/mulitvslive/dwtves/index.m3u8' },
  { name: 'DW Español (akamai alt)', url: 'https://dwamdstream102.akamaized.net/live/mulitvslive/dw spanish/index.m3u8' },
  { name: 'DW Español (cdn)', url: 'https://cdn.dwstream1.com/dwtves/index.m3u8' },
  { name: 'France 24 Español (oficial)', url: 'https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8' },
  { name: 'France 24 Español (YouTube)', url: 'https://jmp2.uk/plu-5ee92e72fb286e0007285ec7.m3u8' },
  { name: 'RT en Español (oficial)', url: 'https://rt-news-gw-rus.cdnvideo.ru/rtnews/rtnews.stream.m3u8' },
  { name: 'RT en Español (mirror)', url: 'https://rt-esp.github.io/rt.m3u8' },

  // ── Entretenimiento / General LatAm ──
  { name: 'América TV (Perú)', url: 'https://cdn2.america.tv/america-livetv/live.m3u8' },
  { name: 'Latina (Perú)', url: 'https://cdns3.amgcloudservers.com/latina-1/index.m3u8' },
  { name: 'Willax (Perú)', url: 'https://cdn2.willaxplay.com/cdn-origin/live-channel-720.m3u8' },
  { name: 'Trome (Perú)', url: 'https://cloudflare.trome.pe/live/tvlive.m3u8' },
  { name: 'Latina (mirror)', url: 'https://5fe02d54c8852.streamlock.net/latina/latina/playlist.m3u8' },
  { name: 'Willax (mirror)', url: 'https://stream.latvperu.com/latina/index.m3u8' },

  // ── Deportes ──
  { name: 'ESPN (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4462.playouts.now.amagi.tv/playlist/amg01201-rakutentv-espn-rakutentv/playlist.m3u8' },
  { name: 'ESPN 2', url: 'https://amg01201-amg01201c4-rakuten-us-4463.playouts.now.amagi.tv/playlist/amg01201-rakutentv-espn2rakutentv/playlist.m3u8' },
  { name: 'Fox Sports (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4464.playouts.now.amagi.tv/playlist/amg01201-rakutentv-foxsportsrakutentv/playlist.m3u8' },
  { name: 'TUDN (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4465.playouts.now.amagi.tv/playlist/amg01201-rakutentv-tudnrakutentv/playlist.m3u8' },

  // ── Películas / Series ──
  { name: 'AMC (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4189.playouts.now.amagi.tv/playlist/amg01201-rakutentv-amcrakutentv/playlist.m3u8' },
  { name: 'TNT (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4197.playouts.now.amagi.tv/playlist/amg01201-rakutentv-tntrakutentv/playlist.m3u8' },
  { name: 'Cinecanal (oficial)', url: 'https://d2aq75iin1eg2s.cloudfront.net/livecine/v1/master.m3u8' },
  { name: 'Cinecanal (mirror)', url: 'https://unlimited1-us.dps.live/cinecanal/cinecanal.smil/playlist.m3u8' },

  // ── Música ──
  { name: 'MTV (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4190.playouts.now.amagi.tv/playlist/amg01201-rakutentv-mtvrakutentv/playlist.m3u8' },
  { name: 'MTV Latino', url: 'https://amg01201-amg01201c4-rakuten-us-4191.playouts.now.amagi.tv/playlist/amg01201-rakutentv-mtvlatinorakutentv/playlist.m3u8' },

  // ── Documentales ──
  { name: 'Discovery (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4249.playouts.now.amagi.tv/playlist/amg01201-rakutentv-dcrakutentv/playlist.m3u8' },
  { name: 'Nat Geo (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4254.playouts.now.amagi.tv/playlist/amg01201-rakutentv-ngrakutentv/playlist.m3u8' },

  // ── Infantiles / Animación ──
  { name: 'Cartoon Network (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4231.playouts.now.amagi.tv/playlist/amg01201-rakutentv-cnrakutentv/playlist.m3u8' },
  { name: 'Cartoon Network (mirror)', url: 'https://jmp2.uk/plu-5f1aca0b4e448e00075e7c5e.m3u8' },
  { name: 'Discovery Kids (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4250.playouts.now.amagi.tv/playlist/amg01201-rakutentv-dkrakutentv/playlist.m3u8' },
  { name: 'Nickelodeon (Rakuten)', url: 'https://amg01201-amg01201c4-rakuten-us-4196.playouts.now.amagi.tv/playlist/amg01201-rakutentv-nikrakutentv/playlist.m3u8' },
  { name: 'Tooncast (oficial)', url: 'https://tooncast-ak.akamaized.net/hls/live/2020238/toonastc/LAT.m3u8' },
  { name: 'Animax Latam', url: 'https://amg01201-amg01201c4-rakuten-us-4185.playouts.now.amagi.tv/playlist/amg01201-rakutentv-anxrakutentv/playlist.m3u8' },
];

async function probe(name, url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PelisTV-Probe/1.0)',
        Accept: '*/*',
      },
      redirect: 'follow',
    });
    const ms = Date.now() - start;
    const ct = res.headers.get('content-type') ?? '';
    let text = '';
    try {
      text = await res.text();
    } catch {}
    const isM3u8 =
      ct.includes('mpegurl') ||
      ct.includes('x-mpegURL') ||
      url.toLowerCase().includes('.m3u8');
    const valid = text.startsWith('#EXTM3U') || text.includes('#EXT-X-');
    return {
      name,
      url,
      ok: res.ok && isM3u8 && valid,
      status: res.status,
      ms,
      contentType: ct,
      isM3u8,
      valid,
      preview: text.slice(0, 150).replace(/\n/g, ' ⏎ '),
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
  console.log(`Probando ${CANDIDATES.length} feeds alternativos…\n`);
  const results = await Promise.all(CANDIDATES.map((c) => probe(c.name, c.url)));

  // Agrupar por nombre base
  const grouped = new Map();
  for (const r of results) {
    const baseName = r.name.split(' (')[0].trim();
    if (!grouped.has(baseName)) grouped.set(baseName, []);
    grouped.get(baseName).push(r);
  }

  let okCount = 0;
  let failCount = 0;
  const working = [];

  for (const [name, list] of grouped) {
    const winners = list.filter((r) => r.ok);
    const losers = list.filter((r) => !r.ok);
    if (winners.length > 0) {
      okCount++;
      const w = winners[0];
      console.log(`✅ ${name.padEnd(40)} → ${w.url}`);
      console.log(`     ${w.status} ${w.ms}ms m3u8=${w.isM3u8} valid=${w.valid}`);
      working.push({ name, url: w.url, ms: w.ms, status: w.status });
      if (losers.length > 0 && losers.length <= 2) {
        for (const l of losers) {
          console.log(`     ❌ alt: ${l.url.slice(0, 80)} (${l.status ?? l.error ?? 'err'})`);
        }
      }
    } else {
      failCount++;
      console.log(`❌ ${name.padEnd(40)} → TODOS LOS FEEDS CAÍDOS`);
      for (const l of losers) {
        console.log(`     ${l.url.slice(0, 80)} → ${l.status ?? 'err'} ${l.error ?? ''}`);
      }
    }
    console.log('');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${okCount} canales con feed OK · ${failCount} sin feed`);
  console.log('═══════════════════════════════════════════════════════');
  if (working.length > 0) {
    console.log('\n— Candidatos verificados para usar —');
    for (const w of working) {
      console.log(`  ${w.name.padEnd(30)} ${w.url}`);
    }
  }

  process.exit(failCount === 0 ? 0 : 1);
}

main();