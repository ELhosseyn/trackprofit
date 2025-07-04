-- CreateTable
CREATE TABLE "ProductCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "cost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProductCost_shop_idx" ON "ProductCost"("shop");

-- CreateIndex
CREATE INDEX "ProductCost_productId_idx" ON "ProductCost"("productId");

-- CreateIndex
CREATE INDEX "ProductCost_variantId_idx" ON "ProductCost"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCost_shop_variantId_key" ON "ProductCost"("shop", "variantId");
