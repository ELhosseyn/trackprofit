-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN "orderId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "totalCost" REAL;
ALTER TABLE "Shipment" ADD COLUMN "totalRevenue" REAL;
ALTER TABLE "Shipment" ADD COLUMN "profit" REAL;

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");
