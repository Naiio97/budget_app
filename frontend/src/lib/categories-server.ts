import { prisma } from './prisma';

// Server-side funkce pro načítání kategorií z databáze
export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return categories;
  } catch (error) {
    console.error('Chyba při načítání kategorií:', error);
    return [];
  }
}

// Server-side funkce pro přidání kategorie
export async function addCategory(name: string) {
  try {
    const { categoryId } = await import('./categories');
    
    // Zkontroluj, jestli kategorie už neexistuje
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingCategory) {
      throw new Error('Kategorie s tímto názvem už existuje');
    }
    
    const newCategory = await prisma.category.create({
      data: {
        id: categoryId(name.trim()),
        name: name.trim()
      }
    });
    
    return newCategory;
  } catch (error) {
    console.error('Chyba při vytváření kategorie:', error);
    throw error;
  }
}

// Server-side funkce pro smazání kategorie
export async function deleteCategory(id: string) {
  try {
    // Zkontroluj, jestli kategorie není používána v transakcích
    const usageCount = await prisma.transaction.count({
      where: { categoryId: id }
    });
    
    if (usageCount > 0) {
      throw new Error('Kategorie je používána v transakcích a nelze ji smazat');
    }
    
    await prisma.category.delete({
      where: { id }
    });
    
    return true;
  } catch (error) {
    console.error('Chyba při mazání kategorie:', error);
    throw error;
  }
}

// Server-side funkce pro úpravu kategorie
export async function updateCategory(id: string, name: string) {
  try {
    const trimmedName = name.trim();
    
    // Zkontroluj, jestli kategorie s novým názvem už neexistuje
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: trimmedName,
        id: { not: id }
      }
    });
    
    if (existingCategory) {
      throw new Error('Kategorie s tímto názvem už existuje');
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name: trimmedName }
    });
    
    return updatedCategory;
  } catch (error) {
    console.error('Chyba při úpravě kategorie:', error);
    throw error;
  }
}
