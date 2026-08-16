-- AlterTable
ALTER TABLE "anime" ADD COLUMN "slug" TEXT,
ADD COLUMN "anilistId" INTEGER,
ADD COLUMN "malId" INTEGER,
ADD COLUMN "tmdbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "anime_slug_key" ON "anime"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "anime_anilistId_key" ON "anime"("anilistId");

-- CreateIndex
CREATE INDEX "anime_anilistId_idx" ON "anime"("anilistId");
