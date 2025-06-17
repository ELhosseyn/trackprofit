/*
  Warnings:

  - Added the required column `shop` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "tracking" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "mobileA" TEXT NOT NULL,
    "mobileB" TEXT,
    "address" TEXT NOT NULL,
    "wilayaId" INTEGER NOT NULL,
    "wilaya" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "note" TEXT,
    "productType" TEXT NOT NULL,
    "deliveryType" INTEGER NOT NULL,
    "packageType" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "statusId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "cancelFee" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Shipment" ("address", "cancelFee", "client", "commune", "createdAt", "deliveryFee", "deliveryType", "externalId", "id", "mobileA", "mobileB", "note", "packageType", "productType", "status", "statusId", "total", "tracking", "updatedAt", "wilaya", "wilayaId") SELECT "address", "cancelFee", "client", "commune", "createdAt", "deliveryFee", "deliveryType", "externalId", "id", "mobileA", "mobileB", "note", "packageType", "productType", "status", "statusId", "total", "tracking", "updatedAt", "wilaya", "wilayaId" FROM "Shipment";
DROP TABLE "Shipment";
ALTER TABLE "new_Shipment" RENAME TO "Shipment";
CREATE UNIQUE INDEX "Shipment_tracking_key" ON "Shipment"("tracking");
CREATE INDEX "Shipment_tracking_idx" ON "Shipment"("tracking");
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");
CREATE INDEX "Shipment_shop_idx" ON "Shipment"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
