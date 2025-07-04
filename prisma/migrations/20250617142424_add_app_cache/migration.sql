/*
  Warnings:

  - You are about to drop the column `ad_accounts` on the `facebook_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `facebook_credentials` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "AppCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_facebook_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_facebook_credentials" ("access_token", "created_at", "expires_at", "id", "shop", "updated_at") SELECT "access_token", "created_at", "expires_at", "id", "shop", "updated_at" FROM "facebook_credentials";
DROP TABLE "facebook_credentials";
ALTER TABLE "new_facebook_credentials" RENAME TO "facebook_credentials";
CREATE UNIQUE INDEX "facebook_credentials_shop_key" ON "facebook_credentials"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AppCache_updatedAt_idx" ON "AppCache"("updatedAt");
