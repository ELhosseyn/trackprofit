-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "ZRExpressCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateIndex
CREATE UNIQUE INDEX "ZRExpressCredential_shop_key" ON "ZRExpressCredential"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_tracking_key" ON "Shipment"("tracking");

-- CreateIndex
CREATE INDEX "Shipment_tracking_idx" ON "Shipment"("tracking");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");
