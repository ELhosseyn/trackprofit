-- AlterTable
ALTER TABLE "facebook_credentials" ADD COLUMN "ad_accounts" JSONB;
ALTER TABLE "facebook_credentials" ADD COLUMN "last_updated" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppCache" ("createdAt", "key", "updatedAt", "value") SELECT "createdAt", "key", "updatedAt", "value" FROM "AppCache";
DROP TABLE "AppCache";
ALTER TABLE "new_AppCache" RENAME TO "AppCache";
CREATE INDEX "AppCache_updatedAt_idx" ON "AppCache"("updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
