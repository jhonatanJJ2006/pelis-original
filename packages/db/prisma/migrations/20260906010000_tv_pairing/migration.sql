-- Pairing TV ↔ móvil/web (código + QR).
CREATE TYPE "TvPairingStatus" AS ENUM ('PENDING', 'APPROVED', 'CLAIMED', 'EXPIRED');

CREATE TABLE "tv_pairing" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "TvPairingStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_pairing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tv_pairing_code_key" ON "tv_pairing"("code");
CREATE INDEX "tv_pairing_deviceId_idx" ON "tv_pairing"("deviceId");
CREATE INDEX "tv_pairing_status_expiresAt_idx" ON "tv_pairing"("status", "expiresAt");
