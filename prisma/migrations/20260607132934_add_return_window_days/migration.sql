-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "language" TEXT NOT NULL DEFAULT 'en',
    "primaryColor" TEXT NOT NULL DEFAULT '#16a34a',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "socialLinks" TEXT NOT NULL DEFAULT '{}',
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("address", "createdAt", "currency", "description", "email", "favicon", "id", "language", "logo", "merchantId", "metaDesc", "metaTitle", "name", "phone", "primaryColor", "slug", "socialLinks", "timezone", "updatedAt") SELECT "address", "createdAt", "currency", "description", "email", "favicon", "id", "language", "logo", "merchantId", "metaDesc", "metaTitle", "name", "phone", "primaryColor", "slug", "socialLinks", "timezone", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_merchantId_key" ON "Store"("merchantId");
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
