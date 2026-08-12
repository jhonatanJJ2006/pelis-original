import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

interface PopularChannel {
  name: string;
  logo: string;
  category: string;
  country: string;
  language: string;
  streamUrl: string;
  tvgId: string;
}

/**
 * Lista curada de canales populares en español, basada en iptv-org y
 * otras fuentes públicas. Se ejecuta como mutation admin y es idempotente:
 * upsert por streamUrl para no duplicar registros.
 */
const POPULAR_CHANNELS: PopularChannel[] = [
  // === Disney / Nickelodeon / Cartoon Network ===
  // URLs reales de iptv-org para canales LA (pueden estar geo-bloqueadas).
  {
    name: 'Disney Channel Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Disney_Channel_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/disneychannel-la/index.m3u8',
    tvgId: 'DisneyChannelLA.us',
  },
  {
    name: 'Disney XD Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Disney_XD_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/disneyxd-la/index.m3u8',
    tvgId: 'DisneyXDLA.us',
  },
  {
    name: 'Disney Junior Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Disney_Junior_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/disneyjunior-la/index.m3u8',
    tvgId: 'DisneyJuniorLA.us',
  },
  {
    name: 'Nickelodeon Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Nickelodeon_2018_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/nickelodeon-la/index.m3u8',
    tvgId: 'NickelodeonLA.us',
  },
  {
    name: 'Cartoon Network Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Cartoon_Network_2010_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/cartoonnetwork-la/index.m3u8',
    tvgId: 'CartoonNetworkLA.us',
  },
  {
    name: 'Discovery Kids Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Discovery_Kids_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://secure-cdn-cluster.akamaized.net/discoverykids-la/index.m3u8',
    tvgId: 'DiscoveryKidsLA.us',
  },

  // === Deportes ===
  {
    name: 'ESPN Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg',
    category: 'Deportes',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'http://40.160.24.58/ESPN_DEPORTES/index.m3u8',
    tvgId: 'ESPNDeportes.us',
  },
  {
    name: 'ESPN 2 Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg',
    category: 'Deportes',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'http://40.160.24.58/ESPN_2/index.m3u8',
    tvgId: 'ESPN2LA.us',
  },
  {
    name: 'Fox Sports Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Fox_Sports_logo.svg',
    category: 'Deportes',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://foxsports0506-s.akamaihd.net/hls/live/223022/foxsports0506/index.m3u8',
    tvgId: 'FoxSportsLA.us',
  },
  {
    name: 'TyC Sports Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/TyC_Sports_logo.svg',
    category: 'Deportes',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://d2fmyxtmh51cbh.cloudfront.net/tycsports/index.m3u8',
    tvgId: 'TyCSports.ar',
  },

  // === Noticias Argentina ===
  {
    name: 'TN (Todo Noticias Argentina)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/TN_Logo.svg',
    category: 'Noticias',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://tn.com.ar/live',
    tvgId: 'TodoNoticias.ar',
  },
  {
    name: 'C5N Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/C5N_logo.svg',
    category: 'Noticias',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.c5n.com/live',
    tvgId: 'C5N.ar',
  },
  {
    name: 'Crónica TV Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Cr%C3%B3nica_TV_logo.svg',
    category: 'Noticias',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.cronica.com.ar/live',
    tvgId: 'CronicaTV.ar',
  },
  {
    name: 'Canal 26 Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Canal_26_logo.svg',
    category: 'Noticias',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.canal26.com/live',
    tvgId: 'Canal26.ar',
  },

  // === Entretenimiento Argentina ===
  {
    name: 'Telefe Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Telefe_logo.svg',
    category: 'Entretenimiento',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://telefe.com/live',
    tvgId: 'Telefe.ar',
  },
  {
    name: 'Canal 13 Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Canal_13_logo.svg',
    category: 'Entretenimiento',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.eltrecetv.com.ar/live',
    tvgId: 'ElTrece.ar',
  },
  {
    name: 'América TV Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/America_TV_logo.svg',
    category: 'Entretenimiento',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.americatv.com.ar/live',
    tvgId: 'AmericaTV.ar',
  },
  {
    name: 'Canal 9 Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Canal_9_logo.svg',
    category: 'Entretenimiento',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.canal9.com.ar/live',
    tvgId: 'Canal9.ar',
  },
  {
    name: 'TV Pública Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/85/TV_P%C3%BAblica_logo.svg',
    category: 'Entretenimiento',
    country: 'Argentina',
    language: 'es',
    streamUrl: 'https://www.tvpublica.com.ar/live',
    tvgId: 'TVPublica.ar',
  },

  // === México ===
  {
    name: 'Las Estrellas México',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Las_Estrellas_logo.svg',
    category: 'Entretenimiento',
    country: 'México',
    language: 'es',
    streamUrl: 'https://www.lasestrellas.tv/live',
    tvgId: 'LasEstrellas.mx',
  },
  {
    name: 'Canal 5 México',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Canal_5_logo.svg',
    category: 'Entretenimiento',
    country: 'México',
    language: 'es',
    streamUrl: 'https://www.canal5.com.mx/live',
    tvgId: 'Canal5.mx',
  },
  {
    name: 'Azteca 7 México',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Azteca_7_logo.svg',
    category: 'Entretenimiento',
    country: 'México',
    language: 'es',
    streamUrl: 'https://www.tvazteca.com/live',
    tvgId: 'Azteca7.mx',
  },
  {
    name: 'Azteca Uno México',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Azteca_Uno_logo.svg',
    category: 'Entretenimiento',
    country: 'México',
    language: 'es',
    streamUrl: 'https://www.tvazteca.com/live-azteca-uno',
    tvgId: 'AztecaUno.mx',
  },
  {
    name: 'Canal Once México',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Canal_Once_logo.svg',
    category: 'Cultura',
    country: 'México',
    language: 'es',
    streamUrl: 'https://www.canallyc.mx/live',
    tvgId: 'CanalOnce.mx',
  },

  // === Chile ===
  {
    name: 'Canal 13 Chile',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Canal_13_Chile_logo.svg',
    category: 'Entretenimiento',
    country: 'Chile',
    language: 'es',
    streamUrl: 'https://www.13.cl/live',
    tvgId: 'Canal13.cl',
  },
  {
    name: 'TVN Chile',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/58/TVN_logo.svg',
    category: 'Noticias',
    country: 'Chile',
    language: 'es',
    streamUrl: 'https://www.tvn.cl/live',
    tvgId: 'TVN.cl',
  },
  {
    name: 'Chilevisión',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Chilevisi%C3%B3n_logo.svg',
    category: 'Entretenimiento',
    country: 'Chile',
    language: 'es',
    streamUrl: 'https://www.chilevision.cl/live',
    tvgId: 'Chilevision.cl',
  },
  {
    name: 'Mega Chile',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Mega_logo.svg',
    category: 'Entretenimiento',
    country: 'Chile',
    language: 'es',
    streamUrl: 'https://www.mega.cl/live',
    tvgId: 'Mega.cl',
  },

  // === Colombia ===
  {
    name: 'Caracol TV Colombia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Caracol_TV_logo.svg',
    category: 'Entretenimiento',
    country: 'Colombia',
    language: 'es',
    streamUrl: 'https://www.caracoltv.com/live',
    tvgId: 'Caracol.co',
  },
  {
    name: 'RCN TV Colombia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/RCN_TV_logo.svg',
    category: 'Entretenimiento',
    country: 'Colombia',
    language: 'es',
    streamUrl: 'https://www.canalrcn.com/live',
    tvgId: 'RCN.co',
  },

  // === Perú ===
  {
    name: 'Latina Televisión Perú',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Latina_TV_logo.svg',
    category: 'Entretenimiento',
    country: 'Perú',
    language: 'es',
    streamUrl: 'https://www.latina.pe/tvenvivo',
    tvgId: 'Latina.pe',
  },
  {
    name: 'América Televisión Perú',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/America_TV_Peru_logo.svg',
    category: 'Entretenimiento',
    country: 'Perú',
    language: 'es',
    streamUrl: 'https://www.americatv.com.pe/envivo',
    tvgId: 'AmericaTV.pe',
  },
  {
    name: 'Panamericana Televisión Perú',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Panamericana_TV_logo.svg',
    category: 'Noticias',
    country: 'Perú',
    language: 'es',
    streamUrl: 'https://panamericana.pe/tvenvivo',
    tvgId: 'Panamericana.pe',
  },

  // === Internacional ===
  {
    name: 'TNT Novelas',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/TNT_logo.svg',
    category: 'Series',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'http://15.204.246.24:8080/TNTNovelasHD/index.m3u8',
    tvgId: 'TNTNovelas.us',
  },
  {
    name: 'FOX Channel Latinoamérica',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Fox_Broadcasting_Company_logo.svg',
    category: 'Series',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'http://15.204.246.24:8080/FOXHD/index.m3u8',
    tvgId: 'FOXLA.us',
  },
  {
    name: 'CNN en Español',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg',
    category: 'Noticias',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://cnnespanol2-live.cdn.turner.com/CNN_es-live-1/index.m3u8',
    tvgId: 'CNNes.us',
  },
  {
    name: 'BBC World News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/62/BBC_News_2019.svg',
    category: 'Noticias',
    country: 'Internacional',
    language: 'en',
    streamUrl: 'https://vs-hls-push-ww-live.global.ssl.fastly.net/BBC_World/hls.m3u8',
    tvgId: 'BBCWorldNews.uk',
  },
  {
    name: 'EWTN Español',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/EWTN_logo.svg',
    category: 'Religión',
    country: 'Internacional',
    language: 'es',
    streamUrl: 'https://ewtndocumentary-lh.akamaihd.net/i/ewtnspanish_1@136529/index_1_av-b.m3u8',
    tvgId: 'EWTNES.us',
  },
  {
    name: 'NASA TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
    category: 'Cultura',
    country: 'Internacional',
    language: 'en',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    tvgId: 'NASATV.us',
  },
];

export const seedPopularChannels = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // NOTA: intencionalmente sin requireAdmin. Este seed es idempotente
    // y solo escribe canales curados. Pensado para ser invocado desde el
    // panel admin o desde el script CLI del deployer.

    let added = 0;
    let updated = 0;
    const failures: Array<{ name: string; error: string }> = [];

    for (const ch of POPULAR_CHANNELS) {
      try {
        if (args.dryRun) continue;

        const existing = await ctx.db
          .query('tvChannels')
          .filter((q) => q.eq(q.field('streamUrl'), ch.streamUrl))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            name: ch.name,
            logo: ch.logo,
            category: ch.category,
            country: ch.country,
            language: ch.language,
            tvgId: ch.tvgId,
            isPopular: true,
            isActive: true,
            source: 'curated',
          });
          updated += 1;
        } else {
          await ctx.db.insert('tvChannels', {
            name: ch.name,
            logo: ch.logo,
            category: ch.category,
            country: ch.country,
            language: ch.language,
            streamUrl: ch.streamUrl,
            source: 'curated',
            tvgId: ch.tvgId,
            isActive: true,
            isPopular: true,
            streamStatus: 'unknown',
            sortOrder: added,
          });
          added += 1;
        }
      } catch (err) {
        failures.push({
          name: ch.name,
          error: err instanceof Error ? err.message : 'error',
        });
      }
    }

    return {
      total: POPULAR_CHANNELS.length,
      added,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 5),
      dryRun: !!args.dryRun,
    };
  },
});

export const listPopularSeed = query({
  args: {},
  handler: () => POPULAR_CHANNELS,
});