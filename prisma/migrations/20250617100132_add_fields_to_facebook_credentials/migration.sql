/*
  Warnings:

  - You are about to drop the `ProductCost` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "facebook_credentials" ADD COLUMN "ad_accounts" JSONB DEFAULT [];
ALTER TABLE "facebook_credentials" ADD COLUMN "last_updated" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProductCost";
PRAGMA foreign_keys=on;
