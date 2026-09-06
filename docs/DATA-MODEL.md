# DATA-MODEL.md

Fuente: packages/db/prisma/schema.prisma. Shapes UI: packages/db/src/lib/shapes.ts (_id, enums minúsculas).

## Split Series (trampa)

Hay DOS sitios para series:

1. Movie.mediaType = SERIES — lo que lista /series (movies.listSeries). Favoritos e historial apuntan a Movie.
2. Tabla Series — solo /admin/series. Sin relacion a Favorite/History. No aparece en el catálogo publico.
   Unificar (migrar admin -> Movie.mediaType) esta pendiente.

## Better Auth

**User** (tabla user): id cuid, email unique, name, emailVerified, image, role USER|ADMIN, banned/banReason/banExpires, otp/otpExpiresAt/otpAttempts/otpLastSentAt, verifiedAt, lastLoginAt, lastSessionExpiresAt. Rel: sessions, accounts. Sin FK Prisma a Favorite/History/Subscription (userId es string suelto).
**Session**: token unique, expiresAt, userId -> User cascade, ipAddress, userAgent, impersonatedBy.
**Account**: providerId, accountId, userId, tokens OAuth, password (email).
**Verification**: identifier, value, expiresAt (Better Auth).

## Catalogo Movie / Plan / Subscription

**Movie**: id, name, image, imageId, backdropImage, backdropImageId, synopsis, genre, token unique, actors, classification, releaseYear, videoUrl, mediaType MOVIE|SERIES (default MOVIE), episodes, featured. Rel: favorites, history. Indices: genre, releaseYear, classification, mediaType, featured, name.
**Plan**: name, price, description, features String[], icon, months, recommended, stripePriceId unique. Rel: subscriptions.
**Subscription**: userId (string, no FK), planId -> Plan cascade, startDate, endDate, status ACTIVE|CANCELLED|EXPIRED, stripeSubscriptionId unique, stripeCustomerId, stripePriceId.

## Series (admin only)

**Series**: mismos campos de ficha que Movie (name, image, imageId, backdrop*, synopsis, genre, token unique, actors, classification, releaseYear, episodes, season, featured). SIN mediaType, SIN favorites/history, SIN videoUrl.

## TV

**TVChannel**: name, logo, category, country, language, streamUrl, source, sourcePlaylistId, tvgId, isActive, isPopular, sortOrder, streamStatus UNKNOWN|ONLINE|OFFLINE, lastCheckedAt, lastStreamError, consecutiveFailures.
**TVPlaylist**: name, m3uUrl, country, language, isActive, lastImportedAt, totalChannels. Sin FK a canales (sourcePlaylistId es string).

## Anime

**Anime**: title, alternativeTitle, slug unique, anilistId unique, malId, tmdbId, image, imageId, backdrop*, synopsis, genre String[], episodes, status ONGOING|COMPLETED, year, rating, format, seriesKey, seriesTitle, seasonNumber, seasonLabel, isSeriesMain, providers Json.
Agrupacion franchise: seriesKey + isSeriesMain. Ver docs/ANIME-PROVIDERS.md. Sin Favorite/History.

## Favorite / History (solo Movie)

**Favorite**: userId, movieId -> Movie cascade, unique (userId, movieId).
**History**: userId, movieId -> Movie cascade, progress, duration, lastWatched, unique (userId, movieId).
No hay favoritos/historial para Anime ni tabla Series.

## TV pairing

**TvPairing** (`tv_pairing`): code unique (6 chars), deviceId, status PENDING|APPROVED|CLAIMED|EXPIRED, userId (tras aprobar), expiresAt (10 min). La tele crea el código; `/link-tv` aprueba; claim crea Session Better Auth.
