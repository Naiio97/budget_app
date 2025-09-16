-- CreateTable
CREATE TABLE "EnvelopeTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "fromEnvelopeId" TEXT,
    "toEnvelopeId" TEXT,
    "amountCZK" INTEGER NOT NULL,
    "note" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnvelopeTransfer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnvelopeTransfer_fromEnvelopeId_fkey" FOREIGN KEY ("fromEnvelopeId") REFERENCES "Envelope" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EnvelopeTransfer_toEnvelopeId_fkey" FOREIGN KEY ("toEnvelopeId") REFERENCES "Envelope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EnvelopeTransfer_accountId_ts_idx" ON "EnvelopeTransfer"("accountId", "ts");
