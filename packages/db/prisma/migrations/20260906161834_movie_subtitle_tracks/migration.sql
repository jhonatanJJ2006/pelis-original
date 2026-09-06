-- Optional subtitle track metadata for movies (WebVTT / VTT playlist paths under stream output).
ALTER TABLE "movie" ADD COLUMN "subtitleTracks" JSONB;
