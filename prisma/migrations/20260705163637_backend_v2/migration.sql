-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Answer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "history" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "formVersion" INTEGER NOT NULL DEFAULT 1,
    "outcome" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'new',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
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
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Application" ("answers", "country", "createdAt", "email", "firstName", "id", "incomeUsd", "ip", "lang", "lastName", "outcome", "path", "referral", "referrerUrl", "role", "slug", "utm") SELECT "answers", "country", "createdAt", "email", "firstName", "id", "incomeUsd", "ip", "lang", "lastName", "outcome", "path", "referral", "referrerUrl", "role", "slug", "utm" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_slug_idx" ON "Application"("slug");
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");
CREATE INDEX "Application_email_idx" ON "Application"("email");
CREATE INDEX "Application_reviewStatus_idx" ON "Application"("reviewStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Answer_applicationId_idx" ON "Answer"("applicationId");

-- CreateIndex
CREATE INDEX "Answer_fieldId_value_idx" ON "Answer"("fieldId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "FormSnapshot_slug_version_key" ON "FormSnapshot"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_token_key" ON "Draft"("token");

-- CreateIndex
CREATE INDEX "Draft_slug_idx" ON "Draft"("slug");

-- CreateIndex
CREATE INDEX "Draft_updatedAt_idx" ON "Draft"("updatedAt");

-- CreateIndex
CREATE INDEX "Draft_email_idx" ON "Draft"("email");

-- CreateIndex
CREATE INDEX "FunnelEvent_slug_pageId_idx" ON "FunnelEvent"("slug", "pageId");

-- CreateIndex
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");
