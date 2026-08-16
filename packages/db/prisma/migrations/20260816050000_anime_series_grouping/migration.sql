-- Group anime entries that belong to the same franchise under a shared series key.
ALTER TABLE "anime" ADD COLUMN     "format" TEXT,
                   ADD COLUMN     "seriesKey" TEXT,
                   ADD COLUMN     "seriesTitle" TEXT,
                   ADD COLUMN     "seasonNumber" INTEGER,
                   ADD COLUMN     "seasonLabel" TEXT,
                   ADD COLUMN     "isSeriesMain" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "anime_seriesKey_idx" ON "anime"("seriesKey");
CREATE INDEX "anime_seriesKey_seasonNumber_idx" ON "anime"("seriesKey", "seasonNumber");
