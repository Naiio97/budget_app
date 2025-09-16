-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceCZK" INTEGER NOT NULL,
    "asOf" DATETIME NOT NULL,
    "externalId" TEXT,
    "iban" TEXT,
    "institutionId" TEXT,
    "connectionId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "customName" TEXT,
    CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Account_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("accountName", "asOf", "balanceCZK", "connectionId", "currency", "externalId", "iban", "id", "institutionId", "provider") SELECT "accountName", "asOf", "balanceCZK", "connectionId", "currency", "externalId", "iban", "id", "institutionId", "provider" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
