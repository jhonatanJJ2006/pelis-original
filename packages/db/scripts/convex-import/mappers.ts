import type {
  AnimeStatus,
  MediaType,
  Prisma,
  StreamStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import type { ConvexDoc } from './read-jsonl.js';

export function msToDate(value: unknown, fallback?: unknown): Date {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  if (value instanceof Date) return value;
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return new Date(fallback);
  }
  return new Date();
}

export function optionalMs(value: unknown): Date | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  return undefined;
}

export function optionalInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return undefined;
}

export function optionalFloat(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function mapEnum<T extends string>(
  value: unknown,
  map: Record<string, T>,
  fallback: T,
): T {
  if (typeof value !== 'string') return fallback;
  return map[value.toLowerCase()] ?? fallback;
}

export function mapMediaType(value: unknown): MediaType {
  return mapEnum(
    value,
    { movie: 'MOVIE', series: 'SERIES' },
    'MOVIE',
  );
}

export function mapUserRole(value: unknown): UserRole {
  return mapEnum(value, { admin: 'ADMIN', user: 'USER' }, 'USER');
}

export function mapSubscriptionStatus(value: unknown): SubscriptionStatus {
  return mapEnum(
    value,
    { active: 'ACTIVE', cancelled: 'CANCELLED', expired: 'EXPIRED' },
    'ACTIVE',
  );
}

export function mapAnimeStatus(value: unknown): AnimeStatus {
  return mapEnum(
    value,
    { ongoing: 'ONGOING', completed: 'COMPLETED' },
    'ONGOING',
  );
}

export function mapStreamStatus(value: unknown): StreamStatus {
  return mapEnum(
    value,
    { online: 'ONLINE', offline: 'OFFLINE', unknown: 'UNKNOWN' },
    'UNKNOWN',
  );
}

type DomainUser = ConvexDoc & {
  userId: string;
  role?: string;
  otp?: string;
  otpAttempts?: number;
  otpExpiresAt?: number;
  otpLastSentAt?: number;
  verifiedAt?: number;
  lastLoginAt?: number;
  lastSessionExpiresAt?: number;
};

type BaUser = ConvexDoc & {
  email: string;
  name: string;
  emailVerified?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export function mapPlan(doc: ConvexDoc): Prisma.PlanCreateManyInput {
  return {
    id: doc._id,
    name: String(doc.name ?? ''),
    price: Number(doc.price ?? 0),
    description: String(doc.description ?? ''),
    features: Array.isArray(doc.features) ? doc.features.map(String) : [],
    icon: String(doc.icon ?? 'Zap'),
    months: optionalInt(doc.months) ?? 1,
    recommended: Boolean(doc.recommended),
    stripePriceId: optionalString(doc.stripePriceId) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapUsers(
  baUsers: BaUser[],
  domainUsers: DomainUser[],
): Prisma.UserCreateManyInput[] {
  const domainByAuthId = new Map(
    domainUsers.filter((u) => u.userId).map((u) => [u.userId, u]),
  );

  return baUsers.map((ba) => {
    const domain = domainByAuthId.get(ba._id);
    const emailVerified = Boolean(ba.emailVerified ?? domain?.emailVerified);
    const verifiedAt = optionalMs(domain?.verifiedAt);

    return {
      id: ba._id,
      email: String(ba.email ?? domain?.email ?? '').toLowerCase(),
      name: String(ba.name ?? domain?.name ?? ba.email ?? 'User'),
      emailVerified,
      role: mapUserRole(domain?.role),
      otp: optionalString(domain?.otp) ?? null,
      otpExpiresAt: optionalMs(domain?.otpExpiresAt) ?? null,
      otpAttempts: optionalInt(domain?.otpAttempts) ?? 0,
      otpLastSentAt: optionalMs(domain?.otpLastSentAt) ?? null,
      verifiedAt: verifiedAt ?? (emailVerified ? msToDate(ba.createdAt, ba._creationTime) : null),
      lastLoginAt: optionalMs(domain?.lastLoginAt) ?? null,
      lastSessionExpiresAt: optionalMs(domain?.lastSessionExpiresAt) ?? null,
      createdAt: msToDate(ba.createdAt, ba._creationTime),
      updatedAt: msToDate(ba.updatedAt ?? domain?.updatedAt, ba._creationTime),
    };
  });
}

export function mapAccount(doc: ConvexDoc): Prisma.AccountCreateManyInput {
  return {
    id: doc._id,
    accountId: String(doc.accountId ?? doc.userId ?? doc._id),
    providerId: String(doc.providerId ?? 'credential'),
    userId: String(doc.userId),
    accessToken: optionalString(doc.accessToken) ?? null,
    refreshToken: optionalString(doc.refreshToken) ?? null,
    idToken: optionalString(doc.idToken) ?? null,
    accessTokenExpiresAt: optionalMs(doc.accessTokenExpiresAt) ?? null,
    refreshTokenExpiresAt: optionalMs(doc.refreshTokenExpiresAt) ?? null,
    scope: optionalString(doc.scope) ?? null,
    password: optionalString(doc.password) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapSession(doc: ConvexDoc): Prisma.SessionCreateManyInput {
  return {
    id: doc._id,
    expiresAt: msToDate(doc.expiresAt, doc._creationTime),
    token: String(doc.token),
    userId: String(doc.userId),
    ipAddress: optionalString(doc.ipAddress) ?? null,
    userAgent: optionalString(doc.userAgent) ?? null,
    activeOrganizationId: optionalString(doc.activeOrganizationId) ?? null,
    impersonatedBy: optionalString(doc.impersonatedBy) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapMovie(doc: ConvexDoc): Prisma.MovieCreateManyInput {
  return {
    id: doc._id,
    name: String(doc.name ?? ''),
    image: String(doc.image ?? ''),
    imageId: optionalString(doc.imageId) ?? null,
    backdropImage: optionalString(doc.backdropImage) ?? null,
    backdropImageId: optionalString(doc.backdropImageId) ?? null,
    synopsis: String(doc.synopsis ?? ''),
    genre: String(doc.genre ?? ''),
    token: String(doc.token ?? doc._id),
    actors: String(doc.actors ?? ''),
    classification: String(doc.classification ?? 'PG-13'),
    releaseYear: String(doc.releaseYear ?? ''),
    videoUrl: optionalString(doc.videoUrl) ?? null,
    mediaType: mapMediaType(doc.mediaType),
    episodes: optionalInt(doc.episodes) ?? null,
    featured: Boolean(doc.featured),
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapAnime(doc: ConvexDoc): Prisma.AnimeCreateManyInput {
  return {
    id: doc._id,
    title: String(doc.title ?? ''),
    alternativeTitle: optionalString(doc.alternativeTitle) ?? null,
    image: String(doc.image ?? ''),
    imageId: optionalString(doc.imageId) ?? null,
    backdropImage: optionalString(doc.backdropImage) ?? null,
    backdropImageId: optionalString(doc.backdropImageId) ?? null,
    synopsis: String(doc.synopsis ?? ''),
    genre: Array.isArray(doc.genre) ? doc.genre.map(String) : [],
    episodes: optionalInt(doc.episodes) ?? 0,
    status: mapAnimeStatus(doc.status),
    year: optionalInt(doc.year) ?? 0,
    rating: optionalFloat(doc.rating) ?? null,
    providers: Array.isArray(doc.providers) ? doc.providers : [],
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapSeries(doc: ConvexDoc): Prisma.SeriesCreateManyInput {
  return {
    id: doc._id,
    name: String(doc.name ?? ''),
    image: String(doc.image ?? ''),
    imageId: optionalString(doc.imageId) ?? null,
    backdropImage: optionalString(doc.backdropImage) ?? null,
    backdropImageId: optionalString(doc.backdropImageId) ?? null,
    synopsis: String(doc.synopsis ?? ''),
    genre: String(doc.genre ?? ''),
    token: String(doc.token ?? doc._id),
    actors: String(doc.actors ?? ''),
    classification: String(doc.classification ?? 'PG-13'),
    releaseYear: String(doc.releaseYear ?? ''),
    episodes: optionalInt(doc.episodes) ?? null,
    season: optionalInt(doc.season) ?? null,
    featured: Boolean(doc.featured),
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapTvPlaylist(doc: ConvexDoc): Prisma.TVPlaylistCreateManyInput {
  return {
    id: doc._id,
    name: String(doc.name ?? ''),
    m3uUrl: String(doc.m3uUrl ?? ''),
    country: optionalString(doc.country) ?? null,
    language: optionalString(doc.language) ?? null,
    isActive: doc.isActive !== false,
    lastImportedAt: optionalMs(doc.lastImportedAt) ?? null,
    totalChannels: optionalInt(doc.totalChannels) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapTvChannel(doc: ConvexDoc): Prisma.TVChannelCreateManyInput {
  return {
    id: doc._id,
    name: String(doc.name ?? ''),
    logo: String(doc.logo ?? ''),
    category: String(doc.category ?? 'General'),
    country: optionalString(doc.country) ?? null,
    language: optionalString(doc.language) ?? null,
    streamUrl: String(doc.streamUrl ?? ''),
    source: String(doc.source ?? 'manual'),
    sourcePlaylistId: optionalString(doc.sourcePlaylistId) ?? null,
    tvgId: optionalString(doc.tvgId) ?? null,
    isActive: doc.isActive !== false,
    isPopular: Boolean(doc.isPopular),
    sortOrder: optionalInt(doc.sortOrder) ?? null,
    streamStatus: mapStreamStatus(doc.streamStatus),
    lastCheckedAt: optionalMs(doc.lastCheckedAt) ?? null,
    lastStreamError: optionalString(doc.lastStreamError) ?? null,
    consecutiveFailures: optionalInt(doc.consecutiveFailures) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapSubscription(doc: ConvexDoc): Prisma.SubscriptionCreateManyInput {
  return {
    id: doc._id,
    userId: String(doc.userId),
    planId: String(doc.planId),
    startDate: msToDate(doc.startDate, doc._creationTime),
    endDate: msToDate(doc.endDate, doc._creationTime),
    status: mapSubscriptionStatus(doc.status),
    stripeSubscriptionId: optionalString(doc.stripeSubscriptionId) ?? null,
    stripeCustomerId: optionalString(doc.stripeCustomerId) ?? null,
    stripePriceId: optionalString(doc.stripePriceId) ?? null,
    createdAt: msToDate(doc.createdAt, doc._creationTime),
    updatedAt: msToDate(doc.updatedAt, doc._creationTime),
  };
}

export function mapFavorite(doc: ConvexDoc): Prisma.FavoriteCreateManyInput {
  return {
    id: doc._id,
    userId: String(doc.userId),
    movieId: String(doc.movieId),
    createdAt: msToDate(doc.createdAt, doc._creationTime),
  };
}

export function mapHistory(doc: ConvexDoc): Prisma.HistoryCreateManyInput {
  return {
    id: doc._id,
    userId: String(doc.userId),
    movieId: String(doc.movieId),
    progress: optionalFloat(doc.progress) ?? 0,
    duration: optionalFloat(doc.duration) ?? 0,
    lastWatched: msToDate(doc.lastWatched, doc._creationTime),
  };
}
