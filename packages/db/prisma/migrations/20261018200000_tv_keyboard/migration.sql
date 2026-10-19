-- CreateTable
CREATE TABLE "TvKeyboardSession" (
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvKeyboardSession_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "TvKeyboardSession_expiresAt_idx" ON "TvKeyboardSession"("expiresAt");
