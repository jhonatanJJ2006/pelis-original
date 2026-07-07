export interface MediaItem {
  _id: string;
  name: string;
  image: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  videoUrl?: string;
  mediaType?: 'movie' | 'series';
  episodes?: number;
  featured?: boolean;
}
