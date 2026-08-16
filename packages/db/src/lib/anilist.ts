/**
 * AniList GraphQL helpers (no API key required).
 */

const ANILIST_API = 'https://graphql.anilist.co';

export interface AnilistMedia {
  id: number;
  idMal?: number | null;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  description?: string | null;
  genres?: string[] | null;
  episodes?: number | null;
  status?: string | null;
  seasonYear?: number | null;
  averageScore?: number | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  bannerImage?: string | null;
  format?: string | null;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`AniList API error: ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error('AniList GraphQL error');
  if (!json.data) throw new Error('AniList: empty response');
  return json.data;
}

export async function searchAnilist(title: string, year?: number): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `
    query ($search: String, $year: Int) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, startDate_like: $year) {
          id idMal title { romaji english native } description genres episodes status
          seasonYear averageScore coverImage { large extraLarge } bannerImage format
        }
      }
    }`,
    { search: title, year: year ? `${year}%` : undefined },
  );
  return data.Page.media;
}

export async function getAnilistById(anilistId: number): Promise<AnilistMedia | null> {
  const data = await anilistQuery<{ Media: AnilistMedia | null }>(
    `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id idMal title { romaji english native } description genres episodes status
        seasonYear averageScore coverImage { large extraLarge } bannerImage format
      }
    }`,
    { id: anilistId },
  );
  return data.Media;
}

export async function fetchAnilistCatalog(options: {
  sort?: string;
  genre?: string;
  seasonYear?: number;
  status?: string;
  perPage?: number;
  page?: number;
}): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $seasonYear: Int, $status: MediaStatus) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort, genre: $genre, seasonYear: $seasonYear, status: $status) {
          id idMal title { romaji english native } description genres episodes status
          seasonYear averageScore coverImage { large extraLarge } bannerImage format
        }
      }
    }`,
    {
      page: options.page ?? 1,
      perPage: options.perPage ?? 50,
      sort: options.sort ?? 'POPULARITY_DESC',
      genre: options.genre,
      seasonYear: options.seasonYear,
      status: options.status,
    },
  );
  return data.Page.media;
}

export function mapAnilistStatus(status?: string | null): 'ongoing' | 'completed' {
  if (status === 'RELEASING' || status === 'NOT_YET_RELEASED') return 'ongoing';
  return 'completed';
}

export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

export function pickAnilistTitle(media: AnilistMedia): string {
  return media.title.english || media.title.romaji || media.title.native || 'Sin título';
}
