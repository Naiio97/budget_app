import { prisma } from "@/lib/prisma";
import CategoryManagement from "@/components/CategoryManagement";

export default async function CategoriesPage() {
  const categories = await (prisma as any).category.findMany({ orderBy: { name: 'asc' }, include: { group: true } });
  const categoriesForClient = (categories as Array<any>).map((c: any) => ({ id: c.id, name: c.name, groupId: c.groupId ?? null, groupName: c.group?.name ?? null }));
  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="text-lg font-semibold">Kategorie</div>
        <div className="text-[13px] text-[var(--muted)]">Správa kategorií a skupin</div>
      </div>
      <CategoryManagement initialCategories={categoriesForClient} />
    </div>
  );
}


