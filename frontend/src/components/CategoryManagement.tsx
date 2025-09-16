"use client";

import { useEffect, useState } from "react";

interface Category { id: string; name: string; groupId?: string | null; groupName?: string | null }
interface CategoryGroup { id: string; name: string; order: number }

export default function CategoryManagement({ initialCategories = [] as Category[] }: { initialCategories?: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  useEffect(() => { fetch('/api/category-groups').then(r=>r.json()).then((gs)=> setGroups(Array.isArray(gs)? gs:[])).catch(()=>{}); }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName.trim() }) });
      if (!res.ok) throw new Error('Nepodařilo se přidat kategorii');
      const created = await res.json();
      setCategories(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name,'cs')));
      setNewCategoryName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nepodařilo se přidat kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    console.log('Zahajuji úpravu kategorie:', category);
    setEditingCategory(category);
    setEditName(category.name);
    setActionError(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    console.log('Ukládám úpravu kategorie:', { editingCategory, editName: editName.trim() });
    setIsSubmitting(true);
    setActionError(null);

    try {
      const encodedId = encodeURIComponent(editingCategory.id);
      const res = await fetch(`/api/categories/${encodedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName.trim(), groupId: editingCategory.groupId ?? null }) });
      if (!res.ok) throw new Error('Nepodařilo se upravit kategorii');
      const updated = await res.json();
      setCategories(prev => prev.map(c=>c.id===updated.id?updated:c).sort((a,b)=>a.name.localeCompare(b.name,'cs')));
      setEditingCategory(null);
      setEditName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nepodařilo se upravit kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Opravdu chcete smazat kategorii "${category.name}"?`)) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const encodedId = encodeURIComponent(category.id);
      const res = await fetch(`/api/categories/${encodedId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Nepodařilo se smazat kategorii');
      setCategories(prev => prev.filter(c=>c.id!==category.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nepodařilo se smazat kategorii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditName("");
    setActionError(null);
  };

  // Správa skupin (rozpočtových oblastí)
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    try {
      setGroupSubmitting(true);
      const res = await fetch('/api/category-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'Chyba'}));
        throw new Error(err.error || 'Chyba při vytváření skupiny');
      }
      const created: CategoryGroup = await res.json();
      setGroups(prev => [...prev, created].sort((a,b)=> a.order-b.order || a.name.localeCompare(b.name,'cs')));
      setNewGroupName("");
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při vytváření skupiny', type: 'error' } }));
    } finally {
      setGroupSubmitting(false);
    }
  };

  const startEditGroup = (g: CategoryGroup) => {
    setEditingGroup(g);
    setEditGroupName(g.name);
  };

  const cancelEditGroup = () => {
    setEditingGroup(null);
    setEditGroupName("");
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const name = editGroupName.trim();
    if (!name) return;
    try {
      setGroupSubmitting(true);
      const res = await fetch(`/api/category-groups/${encodeURIComponent(editingGroup.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error('Chyba při přejmenování skupiny');
      const updated: CategoryGroup = await res.json();
      setGroups(prev => prev.map(g=> g.id===updated.id ? updated : g).sort((a,b)=> a.order-b.order || a.name.localeCompare(b.name,'cs')));
      // aktualizuj názvy ve vybraných kategoriích
      setCategories(prev => prev.map(c => c.groupId === updated.id ? { ...c, groupName: updated.name } : c));
      setEditingGroup(null);
      setEditGroupName("");
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při úpravě skupiny', type: 'error' } }));
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleDeleteGroup = async (g: CategoryGroup) => {
    if (!confirm(`Smazat skupinu "${g.name}"? Kategorie z této skupiny zůstanou zachovány, jen budou bez skupiny.`)) return;
    try {
      setGroupSubmitting(true);
      const res = await fetch(`/api/category-groups/${encodeURIComponent(g.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Mazání skupiny selhalo');
      setGroups(prev => prev.filter(x => x.id !== g.id));
      setCategories(prev => prev.map(c => c.groupId === g.id ? { ...c, groupId: null, groupName: null } : c));
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při mazání skupiny', type: 'error' } }));
    } finally {
      setGroupSubmitting(false);
    }
  };

  const quickAssignGroup = async (category: Category, newGroupId: string) => {
    try {
      setIsSubmitting(true);
      const encodedId = encodeURIComponent(category.id);
      const res = await fetch(`/api/categories/${encodedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: category.name, groupId: newGroupId || null })
      });
      if (!res.ok) throw new Error('Uložení skupiny selhalo');
      const updated = await res.json();
      const groupName = groups.find(g=> g.id === (updated.groupId||''))?.name || null;
      setCategories(prev => prev.map(c=> c.id===category.id ? { ...c, groupId: updated.groupId ?? null, groupName } : c));
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při přiřazení skupiny', type: 'error' } }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="text-sm text-[var(--muted)]">Načítání kategorií...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="glass p-4">
          <div className="text-sm text-red-600">Chyba při načítání kategorií: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Správa skupin */}
      <div className="glass p-4">
        <h3 className="text-lg font-semibold mb-3">Skupiny rozpočtu</h3>
        <form onSubmit={handleAddGroup} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newGroupName}
            onChange={(e)=> setNewGroupName(e.target.value)}
            placeholder="Název nové skupiny…"
            className="glass flex-1 px-3 py-2 rounded-xl text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
            disabled={groupSubmitting}
          />
          <button type="submit" disabled={!newGroupName.trim()||groupSubmitting} className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm disabled:opacity-50">Přidat</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div key={g.id} className="px-2 py-1 bg-black/10 rounded flex items-center gap-2">
              {editingGroup?.id === g.id ? (
                <form onSubmit={handleUpdateGroup} className="flex items-center gap-2">
                  <input value={editGroupName} onChange={(e)=> setEditGroupName(e.target.value)} className="glass px-2 py-1 rounded text-sm border border-white/20" />
                  <button type="submit" disabled={!editGroupName.trim()||groupSubmitting} className="px-2 py-1 text-xs text-[var(--success)] hover:text-white hover:bg-[var(--success)] rounded">✓</button>
                  <button type="button" onClick={cancelEditGroup} className="px-2 py-1 text-xs text-[var(--muted)] hover:text-white hover:bg-[var(--muted)] rounded">✕</button>
                </form>
              ) : (
                <>
                  <span className="text-xs font-medium">{g.name}</span>
                  <button onClick={()=> startEditGroup(g)} className="p-1 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] rounded" title="Přejmenovat" style={{ transform: 'scaleX(-1)' }}>✎</button>
                  <button onClick={()=> handleDeleteGroup(g)} className="p-1 text-[var(--danger)] hover:text-white hover:bg-[var(--danger)] rounded" title="Smazat">✕</button>
                </>
              )}
            </div>
          ))}
          {groups.length===0 && <div className="text-sm text-[var(--muted)]">Zatím žádné skupiny.</div>}
        </div>
      </div>

      {/* Přidat novou kategorii */}
      <div className="glass p-4">
        <h3 className="text-lg font-semibold mb-4">Přidat novou kategorii</h3>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Název kategorie..."
            className="glass flex-1 px-3 py-2 rounded-xl text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newCategoryName.trim() || isSubmitting}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Přidávám...' : 'Přidat'}
          </button>
        </form>
        {actionError && (
          <div className="mt-2 text-sm text-red-600">{actionError}</div>
        )}
      </div>

      {/* Seznam kategorií */}
      <div className="glass p-4">
        <h3 className="text-lg font-semibold mb-4">Existující kategorie ({categories.length})</h3>
        {categories.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">Žádné kategorie nenalezeny</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto hide-scrollbar">
            {categories.map((category: Category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                {editingCategory?.id === category.id ? (
                  // Režim úprav
                  <form onSubmit={handleUpdateCategory} className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="glass flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <select
                        className="glass px-2 py-1 rounded text-sm border border-white/20"
                        value={editingCategory?.groupId || ''}
                        onChange={(e)=> setEditingCategory(prev => prev ? { ...prev, groupId: e.target.value || null, groupName: groups.find(g=>g.id===e.target.value)?.name || null } : prev)}
                      >
                        <option value="">(Bez skupiny)</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button
                        type="submit"
                        disabled={!editName.trim() || isSubmitting}
                        className="px-2 py-1 text-xs text-[var(--success)] hover:text-white hover:bg-[var(--success)] rounded transition-colors disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSubmitting}
                        className="px-2 py-1 text-xs text-[var(--muted)] hover:text-white hover:bg-[var(--muted)] rounded transition-colors disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                ) : (
                  // Normální zobrazení
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      <select
                        className="glass px-2 py-1 rounded text-xs border border-white/20"
                        value={category.groupId || ''}
                        onChange={(e)=> quickAssignGroup(category, e.target.value)}
                        title="Přiřadit do skupiny"
                      >
                        <option value="">(Bez skupiny)</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        disabled={isSubmitting}
                        className="p-1 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] rounded transition-colors disabled:opacity-50"
                        title="Upravit kategorii"
                        style={{ transform: 'scaleX(-1)' }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        disabled={isSubmitting}
                        className="p-1 text-[var(--danger)] hover:text-white hover:bg-[var(--danger)] rounded transition-colors disabled:opacity-50"
                        title="Smazat kategorii"
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
