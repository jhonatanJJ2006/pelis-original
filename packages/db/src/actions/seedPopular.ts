/**
 * seedPopularChannels: Seed ~150 popular TV channels across categories.
 * Used by the admin UI to bootstrap the TV guide with curated content.
 */
import { z } from 'zod';
import { prisma } from '../client';
import { notifyChange } from '../realtime';
import { register } from '../registry';
import { requireAdmin } from '../lib/requireAdmin';

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
  // ─── Noticias ──────────────────────────────────────────────────────
  // Solo feeds públicos verificados (Pluto TV + oficiales).
  // Antes teniamos CNN/BBC/RT/DW con feeds que ya no funcionan.
  { name: 'France 24 Español', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/France_24_logo_2018.svg/512px-France_24_logo_2018.svg.png', category: 'Noticias', country: 'Francia', language: 'es', streamUrl: 'https://static.france24.com/live/F24_ES_LO_HLS/live_web.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Euronews Spanish', logo: 'https://images.pluto.tv/channels/60d3583ef310610007fb02b1/colorLogoPNG.png', category: 'Noticias', country: 'España', language: 'es', streamUrl: 'https://jmp2.uk/plu-60d3583ef310610007fb02b1.m3u8', source: 'popular', sortOrder: 2 },

  // ─── Entretenimiento ───────────────────────────────────────────────
  // Pluto TV Latam (feeds públicos estables).
  { name: 'Pluto TV Comedia made in Spain', logo: 'https://images.pluto.tv/channels/5f1abce155a03d0007718834/colorLogoPNG.png', category: 'Entretenimiento', country: 'España', language: 'es', streamUrl: 'https://jmp2.uk/plu-5f1abce155a03d0007718834.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Comedia a lo bestia de Pluto TV', logo: 'https://images.pluto.tv/channels/68de3db35fc0afe85de0b843/colorLogoPNG.png', category: 'Entretenimiento', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-68de3db35fc0afe85de0b843.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'Pluto TV Comedias Románticas', logo: 'https://images.pluto.tv/channels/655b5d865812e80008843bd1/colorLogoPNG.png', category: 'Entretenimiento', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-655b5d865812e80008843bd1.m3u8', source: 'popular', sortOrder: 3 },

  // ─── Deportes ──────────────────────────────────────────────────────
  { name: 'Pluto TV E-Sports', logo: 'https://images.pluto.tv/channels/5ff3934600d4c7000733ff49/colorLogoPNG.png', category: 'Deportes', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5ff3934600d4c7000733ff49.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Claro Sports', logo: 'https://images.pluto.tv/channels/6320d2755e54db000783fd87/colorLogoPNG.png', category: 'Deportes', country: 'México', language: 'es', streamUrl: 'https://jmp2.uk/plu-6320d2755e54db000783fd87.m3u8', source: 'popular', sortOrder: 2 },

  // ─── Películas ─────────────────────────────────────────────────────
  { name: 'Cine Amor', logo: 'https://images.pluto.tv/channels/5f5136317aedfb0007016f93/colorLogoPNG.png', category: 'Películas', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5f5136317aedfb0007016f93.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Cine comedia', logo: 'https://images.pluto.tv/channels/5f513564e4622a0007c578c0/colorLogoPNG.png', category: 'Películas', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5f513564e4622a0007c578c0.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'Estrellas de Acción', logo: 'https://images.pluto.tv/channels/5e972a21ad709d00074195ba/colorLogoPNG.png', category: 'Películas', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5e972a21ad709d00074195ba.m3u8', source: 'popular', sortOrder: 3 },
  { name: 'Paramount Network de Pluto TV', logo: 'https://images.pluto.tv/channels/68d566603d3a9580eb461251/colorLogoPNG.png', category: 'Películas', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-68d566603d3a9580eb461251.m3u8', source: 'popular', sortOrder: 4 },

  // ─── Series ────────────────────────────────────────────────────────
  { name: 'Andromeda', logo: 'https://images.pluto.tv/channels/6850335b5965a2fd49f7e36d/colorLogoPNG.png', category: 'Series', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-6850335b5965a2fd49f7e36d.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'El Comisario', logo: 'https://images.pluto.tv/channels/60c343007bcabe0007242aa6/colorLogoPNG.png', category: 'Series', country: 'España', language: 'es', streamUrl: 'https://jmp2.uk/plu-60c343007bcabe0007242aa6.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'Empeños a lo bestia', logo: 'https://images.pluto.tv/channels/60218baa464ef900073168c1/colorLogoPNG.png', category: 'Series', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-60218baa464ef900073168c1.m3u8', source: 'popular', sortOrder: 3 },

  // ─── Música ────────────────────────────────────────────────────────
  { name: 'Concert Channel', logo: 'https://images.pluto.tv/channels/6868152657543d1f8be4ece3/colorLogoPNG.png', category: 'Música', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-6868152657543d1f8be4ece3.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Karaoke por Stingray', logo: 'https://images.pluto.tv/channels/5f85cf621d6d2200079f1de0/colorLogoPNG.png', category: 'Música', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5f85cf621d6d2200079f1de0.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'MTV Biggest Pop', logo: 'https://images.pluto.tv/channels/6047fabfce6e8e00070bcc9f/colorLogoPNG.png', category: 'Música', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-6047fabfce6e8e00070bcc9f.m3u8', source: 'popular', sortOrder: 3 },

  // ─── Documentales ──────────────────────────────────────────────────
  { name: 'Pluto TV Animales', logo: 'https://images.pluto.tv/channels/600ae6a78d801e0007117d21/colorLogoPNG.png', category: 'Documentales', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-600ae6a78d801e0007117d21.m3u8', source: 'popular', sortOrder: 1 },
  { name: 'Smithsonian Channel Pluto TV', logo: 'https://images.pluto.tv/channels/63a084934734f30007457b2c/colorLogoPNG.png', category: 'Documentales', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-63a084934734f30007457b2c.m3u8', source: 'popular', sortOrder: 2 },
  { name: 'Archivos Forenses', logo: 'https://images.pluto.tv/channels/5f984f4a09e92d0007d74647/colorLogoPNG.png', category: 'Documentales', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-5f984f4a09e92d0007d74647.m3u8', source: 'popular', sortOrder: 3 },
  { name: 'Crimen & Historia', logo: 'https://images.pluto.tv/channels/64ddcbb14c5ed80008fad416/colorLogoPNG.png', category: 'Documentales', country: 'Latinoamérica', language: 'es', streamUrl: 'https://jmp2.uk/plu-64ddcbb14c5ed80008fad416.m3u8', source: 'popular', sortOrder: 4 },

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
    streamUrl: 'https://jmp2.uk/plu-5ff4b9ccf938f8000779eb99.m3u8',
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
    streamUrl: 'https://jmp2.uk/plu-5dcde17bf6591d0009839e02.m3u8',
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
  // Disney Channel / Disney Jr. LatAm: NO hay HLS público en español.
  // El Pluto 62f3e8ad2a8e8000077b013d es Detective Conan Francia, no Disney.
  // saran-live/disneyjunior es feed MENA (401), no LATAM español.
  // No re-sembrar feeds PT/FR/EN etiquetados como es.
  {
    name: 'Pluto TV Kids LatAm',
    logo: 'https://images.pluto.tv/channels/5dd6dae8ce788b0009eaf77b/colorLogoPNG.png',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-5dd6dae8ce788b0009eaf77b.m3u8',
    source: 'popular',
    tvgId: 'PlutoTVKids.us@LatAm',
    sortOrder: 1,
  },
  {
    name: 'Pluto TV Junior LatAm',
    logo: 'https://images.pluto.tv/channels/5dcde2ac4bc6c500094ab45b/colorLogoPNG.png',
    category: 'Infantil',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-5dcde2ac4bc6c500094ab45b.m3u8',
    source: 'popular',
    tvgId: 'PlutoTVJunior.us@LatAm',
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
    streamUrl: 'https://jmp2.uk/plu-6181404ef48321000797bc41.m3u8',
    source: 'popular',
    tvgId: 'iCarly.de@ES',
    sortOrder: 6,
  },
  {
    name: 'South Park LatAm',
    logo: 'https://images.pluto.tv/channels/609ae5cd48d3200007b0a98e/colorLogoPNG.png',
    category: 'Animación',
    country: 'Latinoamérica',
    language: 'es',
    streamUrl: 'https://jmp2.uk/plu-609ae5cd48d3200007b0a98e.m3u8',
    source: 'popular',
    tvgId: 'ComedyCentralSouthPark.us@LatAm',
    sortOrder: 7,
  },

  // No re-sembrar Cartoon Network / Discovery Kids / Discovery / NatGeo en inglés (Rakuten US).
  // No hay HLS público LATAM/España verificado para esas marcas.
];

export const seedPopularChannels = register({
  kind: 'action',
  name: 'tv.seedPopularChannels',
  writes: ['tv_channel'],
  args: z.object({ dryRun: z.boolean().optional() }).optional(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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