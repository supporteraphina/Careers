-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "country" TEXT,
    "incomeUsd" REAL,
    "referral" BOOLEAN NOT NULL DEFAULT false,
    "answers" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "utm" TEXT,
    "referrerUrl" TEXT,
    "ip" TEXT,
    "lang" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Application_slug_idx" ON "Application"("slug");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");
