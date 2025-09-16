// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { categories as baseCats, categoryId } from "../src/lib/categories";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1) Kategorie – vytvoř základní sadu kategorií
    for (const name of baseCats) {
      await tx.category.upsert({
        where: { id: categoryId(name) },
        update: { name },
        create: { id: categoryId(name), name },
      });
    }
  });

  console.log("✅ Seed hotov - vytvořeny základní kategorie");
}

main()
  .catch((e) => {
    console.error("❌ Chyba při seedu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
