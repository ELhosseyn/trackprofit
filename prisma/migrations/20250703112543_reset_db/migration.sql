-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OrderItem" ("createdAt", "id", "orderCOGSId", "price", "productId", "profit", "quantity", "title", "totalCost", "totalRevenue", "unitCost", "updatedAt", "variantId") SELECT "createdAt", "id", "orderCOGSId", "price", "productId", "profit", "quantity", "title", "totalCost", "totalRevenue", "unitCost", "updatedAt", "variantId" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
