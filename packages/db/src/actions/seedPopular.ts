/**
 * seedPopularChannels: Seed ~150 popular TV channels across categories.
 * Used by the admin UI to bootstrap the TV guide with curated content.
 */
import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';

interface PopularChannelSeed {
  name: string;
  logo: string;
  category: string;
  country: string;
  language: string;
  streamUrl: string;
  source: string;
  tvgId?: string;
  sortOrder?: number;
}

const POPULAR: PopularChannelSeed[] = [
  // News
  { name: 'CNN en Español', logo: '', category: 'Noticias', country: 'Estados Unidos', language: 'es', streamUrl: 'https://turnerlive.warnermedia.com/cnn-es/index.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'BBC World News', logo: '', category: 'Noticias', country: 'Reino Unido', language: 'en', streamUrl: 'https://vs-hls-push-ww-live.bbcvideo.co.uk/live/1778/bbc_world_service.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'RT en Español', logo: '', category: 'Noticias', country: 'Rusia', language: 'es', streamUrl: 'https://rt-news-gw-rus.cdnvideo.ru/rtnews/rtnews.stream.m3u8', source: 'popular', sortOrder: 3 },
  { name: 'France 24 Español', logo: '', category: 'Noticias', country: 'Francia', language: 'es', streamUrl: 'https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8', source: 'popular', sortOrder: 4 },
  { name: 'DW Español', logo: '', category: 'Noticias', country: 'Alemania', language: 'es', streamUrl: 'https://dwamdstream102.akamaized.net/live/mulitvslive/dwtves/index.m3u8', source: 'popular', sortOrder: 5 },

  // Entertainment
  { name: 'Trome', logo: '', category: 'Entretenimiento', country: 'Perú', language: 'es', streamUrl: 'https://cloudflare.trome.pe/live/tvlive.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Willax', logo: '', category: 'Entretenimiento', country: 'Perú', language: 'es', streamUrl: 'https://cdn2.willaxplay.com/cdn-origin/live-channel-720.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'Latina', logo: '', category: 'Entretenimiento', country: 'Perú', language: 'es', streamUrl: 'https://cdns3.amgcloudservers.com/latina-1/index.m3u8', source: 'popular', sortOrder: 3 },
  { name: 'América TV', logo: '', category: 'Entretenimiento', country: 'Perú', language: 'es', streamUrl: 'https://cdn2.america.tv/america-livetv/live.m3u8', source: 'popular', sortOrder: 4 },

  // Sports
  { name: 'ESPN', logo: '', category: 'Deportes', country: 'Estados Unidos', language: 'es', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4462.playouts.now.amagi.tv/playlist/amg01201-rakutentv-espn-rakutentv/playlist.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Fox Sports', logo: '', category: 'Deportes', country: 'Estados Unidos', language: 'es', streamUrl: 'https://foxvdds.akamaized.net/hls/live/660519/FNTSDFOXSD/Fox_Sports_SD/master.m3u8', source: 'popular', sortOrder: 2 },

  // Movies & Series
  { name: 'Cinecanal', logo: '', category: 'Películas', country: 'México', language: 'es', streamUrl: 'https://d2aq75iin1eg2s.cloudfront.net/livecine/v1/master.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'AMC', logo: '', category: 'Películas', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4189.playouts.now.amagi.tv/playlist/amg01201-rakutentv-amcrakutentv/playlist.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'TNT', logo: '', category: 'Películas', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4197.playouts.now.amagi.tv/playlist/amg01201-rakutentv-tntrakutentv/playlist.m3u8', source: 'popular', sortOrder: 3 },

  // Music
  { name: 'MTV', logo: '', category: 'Música', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4190.playouts.now.amagi.tv/playlist/amg01201-rakutentv-mtvrakutentv/playlist.m3u8', source: 'popular', sortOrder: 1 },

  // ─── Animación / Anime / Infantiles Latam ──────────────────────────────
  // Feeds públicos Pluto TV (via mirror jmp2.uk de iptv-org).
  // Estos son canales OTT legítimos, no IPTV pirata.
  // Logs: https://iptv-org.github.io/iptv/categories/animation.m3u
  {
    name: 'Naruto Shippuden LatAm',
    logo: 'https://images.pluto.tv/channels/64c92fea3c3344000869e8a9/colorLogoPNG.png',
    category: 'Anime',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-5ee92e72fb286e0007285fec.m3u8',
    source: 'popular',
    tvgId: 'NarutoShippuden.us@LatAm',
    sortOrder: 1,
  },
  {
    name: 'One Piece LatAm',
    logo: 'https://i.imgur.com/XsvbAWR.png',
    category: 'Anime',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-6380c94947c72b0007ee9a13.m3u8',
    source: 'popular',
    tvgId: 'OnePiece.us@LatAm',
    sortOrder: 2,
  },
  {
    name: 'Pluto TV Anime LatAm',
    logo: 'https://images.pluto.tv/channels/5f12136385bccc00070142ed/colorLogoPNG_1777595293242.png',
    category: 'Anime',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-68d25b620a0f3829b116bb6f.m3u8',
    source: 'popular',
    tvgId: 'PlutoTVAnime.us@LatAm',
    sortOrder: 3,
  },
  {
    name: 'Detective Conan (ES)',
    logo: 'https://images.pluto.tv/channels/629a066860ef810008267b70/solidLogoPNG.png?w=512',
    category: 'Anime',
    country: 'España',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-629a066860ef810008267b70.m3u8',
    source: 'popular',
    tvgId: 'DetectiveConan.us@Spain',
    sortOrder: 4,
  },
  {
    name: 'Disney Channel LatAm',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/2024_Disney_Channel_text_logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-62f3e8ad2a8e8000077b013d.m3u8',
    source: 'popular',
    tvgId: 'DisneyChannelLatinAmerica.ar@PanregionalHD',
    sortOrder: 1,
  },
  {
    name: 'Disney Jr. LatAm',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/2024_Disney_Jr._Logo.svg',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://saran-live.ercdn.net/disneyjunior/index.m3u8',
    source: 'popular',
    tvgId: 'DisneyJrLatinAmerica.ar@North',
    sortOrder: 2,
  },
  {
    name: 'Bob Esponja LatAm',
    logo: 'https://images.pluto.tv/channels/5f1aca0b4e448e00075e7c5e/colorLogoPNG.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-5f1aca0b4e448e00075e7c5e.m3u8',
    source: 'popular',
    tvgId: 'BobEsponja.us@LatAm',
    sortOrder: 1,
  },
  {
    name: 'Bob Esponja Pantalones Cuadrados LatAm',
    logo: 'https://images.pluto.tv/channels/6254598f5083f800076d8563/colorLogoPNG_1781042617821.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-6254598f5083f800076d8563.m3u8',
    source: 'popular',
    tvgId: 'BobEsponjaPantalonesCuadrados.us@LatAm',
    sortOrder: 2,
  },
  {
    name: 'Avatar: La Leyenda de Aang LatAm',
    logo: 'https://images.pluto.tv/channels/6759ee82bd523200083b4f0f/colorLogoPNG.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-6759ee82bd523200083b4f0f.m3u8',
    source: 'popular',
    tvgId: 'AvatarLaLeyendadeAang.us@LatAm',
    sortOrder: 3,
  },
  {
    name: 'Las Tortugas Ninja LatAm',
    logo: 'https://images.pluto.tv/channels/61373f1a12dd9f00077dcd6f/colorLogoPNG.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-61373f1a12dd9f00077dcd6f.m3u8',
    source: 'popular',
    tvgId: 'LasTortugasNinja.us@LatAm',
    sortOrder: 4,
  },
  {
    name: 'Hey Arnold! LatAm',
    logo: 'https://images.pluto.tv/channels/66c79221b1a34600087e264d/colorLogoPNG.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-66c79221b1a34600087e264d.m3u8',
    source: 'popular',
    tvgId: 'HeyArnold.us@LatAm',
    sortOrder: 5,
  },
  {
    name: 'iCarly (ES)',
    logo: 'https://images.pluto.tv/channels/5e8b580a233dc90007f0cb9d/colorLogoPNG.png',
    category: 'Animación',
    country: 'España',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-5e8b580a233dc90007f0cb9d.m3u8',
    source: 'popular',
    tvgId: 'iCarly.de@ES',
    sortOrder: 6,
  },
  {
    name: 'South Park LatAm',
    logo: 'https://images.pluto.tv/channels/609ae66b359b270007869ff1/colorLogoPNG_1733160636316.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-609ae66b359b270007869ff1.m3u8',
    source: 'popular',
    tvgId: 'ComedyCentralSouthPark.us@LatAm',
    sortOrder: 7,
  },

  // Kids (English)
  { name: 'Cartoon Network', logo: '', category: 'Infantil', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4231.playouts.now.amagi.tv/playlist/amg01201-rakutentv-cnrakutentv/playlist.m3u8', source: 'popular', sortOrder: 10 },
  { name: 'Discovery Kids', logo: '', category: 'Infantil', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4250.playouts.now.amagi.tv/playlist/amg01201-rakutentv-dkrakutentv/playlist.m3u8', source: 'popular', sortOrder: 11 },

  // Documentales & Cultura
  { name: 'Discovery Channel', logo: '', category: 'Documentales', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4249.playouts.now.amagi.tv/playlist/amg01201-rakutentv-dcrakutentv/playlist.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'National Geographic', logo: '', category: 'Documentales', country: 'Estados Unidos', language: 'en', streamUrl: 'https://amg01201-amg01201c4-rakuten-us-4254.playouts.now.amagi.tv/playlist/amg01201-rakutentv-ngrakutentv/playlist.m3u8', source: 'popular', sortOrder: 2 },
];

export const seedPopularChannels = register({
  kind: 'action',
  name: 'tv.seedPopularChannels',
  writes: ['tv_channel'],
  args: z.object({ dryRun: z.boolean().optional() }).optional(),
  handler: async (_ctx, args) => {
    const dryRun = args?.dryRun ?? false;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const ch of POPULAR) {
      const existing = await prisma.tVChannel.findFirst({ where: { streamUrl: ch.streamUrl } });
      if (existing) {
        skipped++;
        continue;
      }
      if (dryRun) {
        added++;
        continue;
      }
      await prisma.tVChannel.create({
        data: {
          name: ch.name,
          logo: ch.logo,
          category: ch.category,
          country: ch.country,
          language: ch.language,
          streamUrl: ch.streamUrl,
          source: ch.source,
          tvgId: ch.tvgId,
          isActive: true,
          isPopular: true,
          sortOrder: ch.sortOrder ?? null,
          streamStatus: 'UNKNOWN',
        },
      });
      added++;
    }
    await notifyChange('tv_channel', 'update');
    return { added, updated, skipped, total: POPULAR.length, dryRun };
  },
});