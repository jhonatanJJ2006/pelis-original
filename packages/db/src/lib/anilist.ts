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
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
}

export interface AnilistRelation {
  relationType: string;
  id: number;
  format?: string | null;
  type?: string | null;
}

export interface AnilistMediaWithRelations extends AnilistMedia {
  relations: AnilistRelation[];
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * AniList allows 30 requests/minute and answers 429 with a `Retry-After`
 * header. Bulk passes over the catalog hit that ceiling, so wait and retry
 * instead of failing the whole run.
 */
async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0
): Promise<T> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 429 && attempt < 3) {
    const retryAfter = Number(response.headers.get('retry-after')) || 60;
    await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
    return anilistQuery<T>(query, variables, attempt + 1);
  }

  if (!response.ok) throw new Error(`AniList API error: ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error('AniList GraphQL error');
  if (!json.data) throw new Error('AniList: empty response');
  return json.data;
}

/**
 * Search AniList by title. `year` is used to re-rank results rather than to
 * filter them, because catalog rows often carry an approximate year and a hard
 * filter would drop the correct match.
 */
export async function searchAnilist(title: string, year?: number): Promise<AnilistMedia[]> {
  const data = await anilistQuery<{ Page: { media: AnilistMedia[] } }>(
    `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id idMal title { romaji english native } description genres episodes status
          seasonYear averageScore coverImage { large extraLarge } bannerImage format
          startDate { year month day }
        }
      }
    }`,
    { search: title }
  );

  const media = data.Page.media;
  if (!year) return media;

  return [...media].sort((a, b) => {
    const da = Math.abs((a.seasonYear ?? 0) - year);
    const db = Math.abs((b.seasonYear ?? 0) - year);
    return da - db;
  });
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
    { id: anilistId }
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
    }
  );
  return data.Page.media;
}

/**
 * Fetch media plus franchise relations in batches. AniList allows 50 items per
 * page, which keeps a full catalog pass within the rate limit.
 */
export async function fetchAnilistWithRelations(
  anilistIds: number[]
): Promise<AnilistMediaWithRelations[]> {
  const out: AnilistMediaWithRelations[] = [];
  const batchSize = 50;

  for (let i = 0; i < anilistIds.length; i += batchSize) {
    const ids = anilistIds.slice(i, i + batchSize);
    const data = await anilistQuery<{
      Page: {
        media: Array<
          AnilistMedia & {
            relations?: {
              edges?: Array<{
                relationType?: string | null;
                node?: { id: number; format?: string | null; type?: string | null } | null;
              }> | null;
            } | null;
          }
        >;
      };
    }>(
      `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, type: ANIME) {
            id idMal title { romaji english native } description genres episodes status
            seasonYear averageScore coverImage { large extraLarge } bannerImage format
            startDate { year month day }
            relations { edges { relationType node { id format type } } }
          }
        }
      }`,
      { ids }
    );

    for (const media of data.Page.media) {
      const relations: AnilistRelation[] = (media.relations?.edges ?? [])
        .filter((edge) => edge?.node?.id && edge.relationType)
        .map((edge) => ({
          relationType: edge.relationType as string,
          id: edge.node!.id,
          format: edge.node!.format ?? null,
          type: edge.node!.type ?? null,
        }));
      out.push({ ...media, relations });
    }

    if (i + batchSize < anilistIds.length) {
      // AniList allows 30 requests/minute; stay well under it.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  return out;
}

export function mapAnilistStatus(status?: string | null): 'ongoing' | 'completed' {
  if (status === 'RELEASING' || status === 'NOT_YET_RELEASED') return 'ongoing';
  return 'completed';
}

export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function pickAnilistTitle(media: AnilistMedia): string {
  return media.title.english || media.title.romaji || media.title.native || 'Sin título';
}
