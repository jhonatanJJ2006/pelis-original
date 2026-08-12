import { z } from 'zod';
import { prisma } from '../client.js';
import { notifyChange } from '../realtime.js';
import { register } from '../registry.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import { resolveMovieImagePath } from '../lib/resolveMovieImage.js';

const MovieCreate = z.object({
  name: z.string(),
  image: z.string(),
  imageId: z.string().optional(),
  backdropImage: z.string().optional(),
  backdropImageId: z.string().optional(),
  synopsis: z.string(),
  genre: z.string(),
  token: z.string(),
  actors: z.string(),
  classification: z.string(),
  releaseYear: z.string(),
  videoUrl: z.string().optional(),
  mediaType: z.enum(['movie', 'series']).optional(),
  episodes: z.number().optional(),
  featured: z.boolean().optional(),
});

export const create = register({
  kind: 'mutation',
  name: 'movies.create',
  writes: ['movie'],
  args: MovieCreate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const image = args.imageId
      ? `/uploads/${args.imageId}.webp`
      : resolveMovieImagePath(args.image);
    const backdropImage = args.backdropImage
      ? args.backdropImageId
        ? `/uploads/${args.backdropImageId}.webp`
        : resolveMovieImagePath(args.backdropImage)
      : undefined;
    const created = await prisma.movie.create({
      data: {
        name: args.name,
        image,
        imageId: args.imageId ?? null,
        backdropImage: backdropImage ?? null,
        backdropImageId: args.backdropImageId ?? null,
        synopsis: args.synopsis,
        genre: args.genre,
        token: args.token,
        actors: args.actors,
        classification: args.classification,
        releaseYear: args.releaseYear,
        videoUrl: args.videoUrl ?? null,
        mediaType: args.mediaType === 'series' ? 'SERIES' : 'MOVIE',
        episodes: args.episodes ?? null,
        featured: args.featured ?? false,
      },
    });
    await notifyChange('movie', 'insert', created.id);
    return created.id;
  },
});

const MovieUpdate = MovieCreate.extend({ id: z.string() });

export const update = register({
  kind: 'mutation',
  name: 'movies.update',
  writes: ['movie'],
  args: MovieUpdate,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const image = args.imageId
      ? `/uploads/${args.imageId}.webp`
      : resolveMovieImagePath(args.image);
    const backdropImage = args.backdropImage !== undefined
      ? args.backdropImageId
        ? `/uploads/${args.backdropImageId}.webp`
        : resolveMovieImagePath(args.backdropImage)
      : undefined;
    await prisma.movie.update({
      where: { id: args.id },
      data: {
        name: args.name,
        image,
        imageId: args.imageId ?? null,
        backdropImage: backdropImage ?? null,
        backdropImageId: args.backdropImageId ?? null,
        synopsis: args.synopsis,
        genre: args.genre,
        token: args.token,
        actors: args.actors,
        classification: args.classification,
        releaseYear: args.releaseYear,
        videoUrl: args.videoUrl ?? null,
        mediaType: args.mediaType === 'series' ? 'SERIES' : 'MOVIE',
        episodes: args.episodes ?? null,
        featured: args.featured ?? false,
      },
    });
    await notifyChange('movie', 'update', args.id);
    return args.id;
  },
});

export const remove = register({
  kind: 'mutation',
  name: 'movies.remove',
  writes: ['movie', 'favorite', 'history'],
  args: z.object({ id: z.string() }),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await prisma.$transaction([
      prisma.favorite.deleteMany({ where: { movieId: id } }),
      prisma.history.deleteMany({ where: { movieId: id } }),
      prisma.movie.delete({ where: { id } }),
    ]);
    await notifyChange('movie', 'delete', id);
    return true;
  },
});

export const generateUploadUrl = register({
  kind: 'mutation',
  name: 'movies.generateUploadUrl',
  writes: ['movie'],
  args: z.object({}).optional(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Client should POST the file to /api/storage/upload (see storage.ts).
    // Returning the URL of the upload endpoint preserves the Convex-like API.
    return '/api/storage/upload';
  },
});