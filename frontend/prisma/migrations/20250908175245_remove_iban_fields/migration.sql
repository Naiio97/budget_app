/*
  Warnings:

  - You are about to drop the column `creditorIban` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `debtorIban` on the `Transaction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL,
    "amountCZK" INTEGER NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "merchantNorm" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "externalId" TEXT,
    "currency" TEXT,
    "amountOriginal" INTEGER,
    "balanceAfter" INTEGER,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amountCZK", "amountOriginal", "balanceAfter", "categoryId", "currency", "externalId", "id", "merchantNorm", "rawDescription", "ts") SELECT "accountId", "amountCZK", "amountOriginal", "balanceAfter", "categoryId", "currency", "externalId", "id", "merchantNorm", "rawDescription", "ts" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_accountId_ts_idx" ON "Transaction"("accountId", "ts");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
