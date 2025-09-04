// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
// Relativně, ať to jede bez tsconfig-paths:
import { accounts as mockAccounts } from "../src/lib/accounts";
import { transactions as mockTx } from "../src/lib/mock-data";
import { categories as baseCats, categoryId } from "../src/lib/categories";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1) Kategorie – nejdřív základní sada
    for (const name of baseCats) {
      await tx.category.upsert({
        where: { id: categoryId(name) },
        update: { name },
        create: { id: categoryId(name), name },
      });
    }

    // 2) Dovytvoř kategorie, které se objeví v mock transakcích navíc
    const extraCats = Array.from(
      new Set(
        mockTx
          .map((t) => t.category?.trim())
          .filter(Boolean) as string[]
      )
    ).filter((name) => !baseCats.includes(name as any));

    for (const name of extraCats) {
      await tx.category.upsert({
        where: { id: categoryId(name) },
        update: { name },
        create: { id: categoryId(name), name },
      });
    }

    // 3) Účty
    for (const a of mockAccounts) {
      await tx.account.upsert({
        where: { id: a.id },
        update: {
          provider: a.provider,
          accountName: a.accountName,
          currency: a.currency,
          balanceCZK: a.balanceCZK,
          asOf: new Date(a.asOf),
        },
        create: {
          id: a.id,
          provider: a.provider,
          accountName: a.accountName,
          currency: a.currency,
          balanceCZK: a.balanceCZK,
          asOf: new Date(a.asOf),
        },
      });
    }

    // 4) Transakce
    for (const t of mockTx) {
      const catId = t.category ? categoryId(t.category) : null;

      await tx.transaction.upsert({
        where: { id: t.id },
        update: {
          ts: new Date(t.ts),
          amountCZK: t.amountCZK,
          rawDescription: t.rawDescription,
          merchantNorm: t.merchantNorm,
          accountId: t.accountId,
          categoryId: catId,
        },
        create: {
          id: t.id,
          ts: new Date(t.ts),
          amountCZK: t.amountCZK,
          rawDescription: t.rawDescription,
          merchantNorm: t.merchantNorm,
          accountId: t.accountId,
          categoryId: catId,
        },
      });
    }
  });

  console.log("✅ Seed hotov");
}

main()
  .catch((e) => {
    console.error("❌ Chyba při seedu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
