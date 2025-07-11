-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZRExpressCredential" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZRExpressCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "tracking" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "mobileA" TEXT NOT NULL,
    "mobileB" TEXT,
    "address" TEXT NOT NULL,
    "wilayaId" INTEGER NOT NULL,
    "wilaya" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "productType" TEXT NOT NULL,
    "deliveryType" INTEGER NOT NULL,
    "packageType" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "statusId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancelFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "totalCost" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_credentials" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ad_accounts" JSONB,
    "last_updated" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCOGS" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCOGS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "orderCOGSId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCache" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZRExpressCredential_shop_key" ON "ZRExpressCredential"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_tracking_key" ON "Shipment"("tracking");

-- CreateIndex
CREATE INDEX "Shipment_tracking_idx" ON "Shipment"("tracking");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_shop_idx" ON "Shipment"("shop");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_credentials_shop_key" ON "facebook_credentials"("shop");

-- CreateIndex
CREATE INDEX "OrderCOGS_shop_idx" ON "OrderCOGS"("shop");

-- CreateIndex
CREATE INDEX "OrderCOGS_createdAt_idx" ON "OrderCOGS"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCOGS_shop_orderId_key" ON "OrderCOGS"("shop", "orderId");

-- CreateIndex
CREATE INDEX "AppCache_updatedAt_idx" ON "AppCache"("updatedAt");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderCOGSId_fkey" FOREIGN KEY ("orderCOGSId") REFERENCES "OrderCOGS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

