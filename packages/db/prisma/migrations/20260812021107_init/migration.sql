-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'SERIES');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "AnimeStatus" AS ENUM ('ONGOING', 'COMPLETED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER DEFAULT 0,
    "otpLastSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastSessionExpiresAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageId" TEXT,
    "backdropImage" TEXT,
    "backdropImageId" TEXT,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "actors" TEXT NOT NULL DEFAULT '',
    "classification" TEXT NOT NULL DEFAULT 'PG-13',
    "releaseYear" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "mediaType" "MediaType" NOT NULL DEFAULT 'MOVIE',
    "episodes" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT NOT NULL DEFAULT 'Zap',
    "months" INTEGER NOT NULL DEFAULT 1,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageId" TEXT,
    "backdropImage" TEXT,
    "backdropImageId" TEXT,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "actors" TEXT NOT NULL DEFAULT '',
    "classification" TEXT NOT NULL DEFAULT 'PG-13',
    "releaseYear" TEXT NOT NULL DEFAULT '',
    "episodes" INTEGER,
    "season" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "country" TEXT,
    "language" TEXT,
    "streamUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourcePlaylistId" TEXT,
    "tvgId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "streamStatus" "StreamStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3),
    "lastStreamError" TEXT,
    "consecutiveFailures" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_playlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "m3uUrl" TEXT NOT NULL,
    "country" TEXT,
    "language" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastImportedAt" TIMESTAMP(3),
    "totalChannels" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anime" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "alternativeTitle" TEXT,
    "image" TEXT NOT NULL,
    "imageId" TEXT,
    "backdropImage" TEXT,
    "backdropImageId" TEXT,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "genre" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "episodes" INTEGER NOT NULL DEFAULT 0,
    "status" "AnimeStatus" NOT NULL,
    "year" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "providers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastWatched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "movie_token_key" ON "movie"("token");

-- CreateIndex
CREATE INDEX "movie_genre_idx" ON "movie"("genre");

-- CreateIndex
CREATE INDEX "movie_releaseYear_idx" ON "movie"("releaseYear");

-- CreateIndex
CREATE INDEX "movie_classification_idx" ON "movie"("classification");

-- CreateIndex
CREATE INDEX "movie_mediaType_idx" ON "movie"("mediaType");

-- CreateIndex
CREATE INDEX "movie_featured_idx" ON "movie"("featured");

-- CreateIndex
CREATE INDEX "movie_name_idx" ON "movie"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripePriceId_key" ON "plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_userId_idx" ON "subscription"("userId");

-- CreateIndex
CREATE INDEX "subscription_planId_idx" ON "subscription"("planId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_stripeSubscriptionId_idx" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "series_token_key" ON "series"("token");

-- CreateIndex
CREATE INDEX "series_genre_idx" ON "series"("genre");

-- CreateIndex
CREATE INDEX "series_classification_idx" ON "series"("classification");

-- CreateIndex
CREATE INDEX "series_name_idx" ON "series"("name");

-- CreateIndex
CREATE INDEX "tv_channel_category_idx" ON "tv_channel"("category");

-- CreateIndex
CREATE INDEX "tv_channel_source_idx" ON "tv_channel"("source");

-- CreateIndex
CREATE INDEX "tv_channel_country_idx" ON "tv_channel"("country");

-- CreateIndex
CREATE INDEX "tv_channel_sourcePlaylistId_idx" ON "tv_channel"("sourcePlaylistId");

-- CreateIndex
CREATE INDEX "tv_channel_isPopular_idx" ON "tv_channel"("isPopular");

-- CreateIndex
CREATE INDEX "tv_channel_streamStatus_idx" ON "tv_channel"("streamStatus");

-- CreateIndex
CREATE INDEX "tv_channel_isActive_idx" ON "tv_channel"("isActive");

-- CreateIndex
CREATE INDEX "tv_channel_streamUrl_idx" ON "tv_channel"("streamUrl");

-- CreateIndex
CREATE INDEX "tv_playlist_isActive_idx" ON "tv_playlist"("isActive");

-- CreateIndex
CREATE INDEX "anime_title_idx" ON "anime"("title");

-- CreateIndex
CREATE INDEX "anime_status_idx" ON "anime"("status");

-- CreateIndex
CREATE INDEX "favorite_userId_idx" ON "favorite"("userId");

-- CreateIndex
CREATE INDEX "favorite_movieId_idx" ON "favorite"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_userId_movieId_key" ON "favorite"("userId", "movieId");

-- CreateIndex
CREATE INDEX "history_userId_idx" ON "history"("userId");

-- CreateIndex
CREATE INDEX "history_movieId_idx" ON "history"("movieId");

-- CreateIndex
CREATE INDEX "history_lastWatched_idx" ON "history"("lastWatched");

-- CreateIndex
CREATE UNIQUE INDEX "history_userId_movieId_key" ON "history"("userId", "movieId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
