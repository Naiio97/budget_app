-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logo" TEXT,
    "website" TEXT
);
INSERT INTO "new_Institution" ("country", "id", "logo", "name", "website") SELECT "country", "id", "logo", "name", "website" FROM "Institution";
DROP TABLE "Institution";
ALTER TABLE "new_Institution" RENAME TO "Institution";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
