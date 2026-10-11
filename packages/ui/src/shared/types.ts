export interface MediaItem {
  _id: string;
  name: string;
  image: string;
  backdropImage?: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  videoUrl?: string;
  /** Optional subtitle tracks: [{lang, label?, path}] relative under stream output. */
  subtitleTracks?: Array<{ lang: string; label?: string; path: string }> | null;
  mediaType?: 'movie' | 'series';
  episodes?: number;
  featured?: boolean;
  /** Serie sin video todavía: se lista como "Próximamente" y nunca se destaca. */
  comingSoon?: boolean;
}
