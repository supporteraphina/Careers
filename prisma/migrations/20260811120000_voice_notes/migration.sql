-- CreateTable
CREATE TABLE "VoiceNote" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "data" BYTEA NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceNote_createdAt_idx" ON "VoiceNote"("createdAt");

-- CreateIndex
CREATE INDEX "VoiceNote_claimedAt_idx" ON "VoiceNote"("claimedAt");
