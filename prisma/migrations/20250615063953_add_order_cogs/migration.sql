-- CreateTable
CREATE TABLE "OrderCOGS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "totalCost" REAL NOT NULL,
    "totalRevenue" REAL NOT NULL,
    "profit" REAL NOT NULL,
    "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "price" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "totalRevenue" REAL NOT NULL,
    "profit" REAL NOT NULL,
    "orderCOGSId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderItem_orderCOGSId_fkey" FOREIGN KEY ("orderCOGSId") REFERENCES "OrderCOGS" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrderCOGS_shop_idx" ON "OrderCOGS"("shop");

-- CreateIndex
CREATE INDEX "OrderCOGS_createdAt_idx" ON "OrderCOGS"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCOGS_shop_orderId_key" ON "OrderCOGS"("shop", "orderId");
