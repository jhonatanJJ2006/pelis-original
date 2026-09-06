import { z } from 'zod';
import { movieSchema } from '@pelis/validators';

/** Admin-only image fields accepted by movies.create / movies.update. */
const adminMovieImageFields = {
  imageId: z.string().min(1).optional(),
  backdropImage: z.string().optional(),
  backdropImageId: z.string().min(1).optional(),
};

/**
 * Canonical admin movie body: `@pelis/validators` `movieSchema`
 * plus optional upload / backdrop ids used by the admin form.
 */
export const movieCreateSchema = movieSchema.extend(adminMovieImageFields);

export const movieUpdateSchema = movieCreateSchema.extend({
  id: z.string().min(1, 'El id es requerido'),
});

/**
 * Admin Series table is movie-shaped (same ficha fields) but has `season`
 * and no `videoUrl` / `mediaType`. Reuses movieSchema so create/update
 * reject the same invalid names, years, synopses, and image paths.
 */
export const seriesCreateSchema = movieSchema.omit({ videoUrl: true, mediaType: true }).extend({
  season: z.number().int().positive().optional(),
});

export const seriesUpdateSchema = seriesCreateSchema.extend({
  id: z.string().min(1, 'El id es requerido'),
});

export type MovieCreateInput = z.infer<typeof movieCreateSchema>;
export type MovieUpdateInput = z.infer<typeof movieUpdateSchema>;
export type SeriesCreateInput = z.infer<typeof seriesCreateSchema>;
export type SeriesUpdateInput = z.infer<typeof seriesUpdateSchema>;
