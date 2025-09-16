import { useEffect, useState, useCallback, useMemo } from 'react';

// Cache není potřeba - data se načítají přímo z DB
const CACHE_DURATION = Infinity; // Trvalá cache

// Hook pro načítání účtů
export function useAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    console.log("Načítám účty přímo z DB");
    setLoading(true);
    
    try {
      const response = await fetch(`/api/accounts`, { 
        next: { revalidate: 0 }
      });
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst účty');
      }
      const data = await response.json();
      
      // Filtruj pouze viditelné účty (isVisible není false)
      const visibleAccounts = data.filter((account: any) => account.isVisible !== false);
      
      setAccounts(visibleAccounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      console.error('Chyba při načítání účtů:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, []); // Prázdné dependency array - spustí se pouze jednou

  // Sledování custom eventu pro refresh po synchronizaci
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("Sync dokončen, obnovuji účty");
      fetchAccounts();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [fetchAccounts]); // Prázdné dependency array

  return { accounts, loading, error };
}

// Cache není potřeba - data se načítají přímo z DB

// Hook pro načítání všech účtů (včetně skrytých) - pro správu účtů
export function useAllAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAccounts = useCallback(async () => {
    console.log("Načítám všechny účty přímo z DB");
    setLoading(true);
    
    try {
      const response = await fetch(`/api/accounts/all`, { 
        next: { revalidate: 0 }
      });
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst účty');
      }
      const data = await response.json();
      
      setAccounts(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      console.error('Chyba při načítání všech účtů:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAccounts();
  }, []); // Prázdné dependency array - spustí se pouze jednou

  // Sledování custom eventu pro refresh po synchronizaci
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("Sync dokončen, obnovuji všechny účty");
      fetchAllAccounts();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [fetchAllAccounts]); // Prázdné dependency array

  return { accounts, loading, error };
}

// Cache není potřeba - data se načítají přímo z DB

// Hook pro načítání transakcí pro konkrétní účet
export function useAccountTransactions(accountId: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accounts } = useAllAccounts();

  const fetchTransactions = useCallback(async () => {
    if (!accountId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/accounts/${accountId}/transactions`, { 
        next: { revalidate: 0 }
      });
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst transakce');
      }
      const data = await response.json();
      
      // Najdi informace o účtu
      const account = accounts.find(acc => acc.id === accountId);
      const enrichedData = data.map((tx: any) => ({
        ...tx,
        accountName: account?.accountName,
        accountProvider: account?.provider,
        accountDisplayName: account?.customName || account?.accountName
      }));
      
      setTransactions(enrichedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      console.error('Chyba při načítání transakcí:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId, accounts]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Sledování custom eventu pro refresh po synchronizaci
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("Sync dokončen, obnovuji transakce");
      fetchTransactions();
    };

    const handleAccountUpdate = () => {
      console.log("Účet aktualizován, obnovuji transakce");
      fetchTransactions();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('account-updated', handleAccountUpdate);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('account-updated', handleAccountUpdate);
    };
  }, [accountId, fetchTransactions]);

  return { transactions, loading, error };
}

// Cache není potřeba - data se načítají přímo z DB

// Hook pro načítání všech transakcí ze všech účtů
export function useAllTransactions() {
  const { accounts, loading: accountsLoading } = useAllAccounts();
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTransactions = useCallback(async () => {
    if (accountsLoading || accounts.length === 0) {
      return;
    }

    try {
      setLoading(true);
      // Filtruj pouze viditelné účty pro načítání transakcí
      const visibleAccounts = accounts.filter(acc => acc.isVisible !== false);
      const promises = visibleAccounts.map(account => 
        fetch(`/api/accounts/${account.id}/transactions`, {
          next: { revalidate: 0 }
        })
          .then(res => res.json())
          .then(transactions => transactions.map((tx: any) => ({
            ...tx,
            accountName: account.accountName,
            accountProvider: account.provider,
            accountDisplayName: account.customName || account.accountName
          })))
          .catch(err => {
            console.error(`Chyba při načítání transakcí pro účet ${account.id}:`, err);
            return [];
          })
      );

      const results = await Promise.all(promises);
      const combined = results.flat();
      
      // Seřadit podle data (nejnovější první)
      combined.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      
      setAllTransactions(combined);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      console.error('Chyba při načítání všech transakcí:', err);
    } finally {
      setLoading(false);
    }
  }, [accounts, accountsLoading]);

  useEffect(() => {
    fetchAllTransactions();
  }, [fetchAllTransactions]);

  // Sledování custom eventu pro refresh po synchronizaci
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("Sync dokončen, obnovuji všechny transakce");
      fetchAllTransactions();
    };

    const handleAccountUpdate = () => {
      console.log("Účet aktualizován, obnovuji všechny transakce");
      fetchAllTransactions();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('account-updated', handleAccountUpdate);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('account-updated', handleAccountUpdate);
    };
  }, [fetchAllTransactions]);

  return { transactions: allTransactions, loading, error };
}

// Cache pro kategorie - trvalá cache, obnoví se pouze při změnách
// Cache není potřeba - data se načítají přímo z DB

// Hook pro načítání kategorií
export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    console.log("Načítám kategorie přímo z DB");
    setLoading(true);
    
    try {
      const response = await fetch('/api/categories', { 
        next: { revalidate: 0 }
      });
      if (!response.ok) {
        throw new Error('Nepodařilo se načíst kategorie');
      }
      const data = await response.json();
      
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      console.error('Chyba při načítání kategorií:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []); // Prázdné dependency array - spustí se pouze jednou

  // Sledování custom eventu pro refresh po synchronizaci
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log("Sync dokončen, obnovuji kategorie");
      fetchCategories();
    };

    window.addEventListener('sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [fetchCategories]);

  // Funkce pro přidání kategorie
  const addCategory = useCallback(async (name: string) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodařilo se přidat kategorii');
      }

      const newCategory = await response.json();
      
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name, 'cs')));
      return newCategory;
    } catch (err) {
      console.error('Chyba při přidávání kategorie:', err);
      throw err;
    }
  }, []);

  // Funkce pro smazání kategorie
  const deleteCategory = useCallback(async (id: string) => {
    try {
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/categories/${encodedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodařilo se smazat kategorii');
      }

      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      console.error('Chyba při mazání kategorie:', err);
      throw err;
    }
  }, []);

  // Funkce pro úpravu kategorie
  const updateCategory = useCallback(async (id: string, name: string) => {
    try {
      console.log('Upravuji kategorii:', { id, name });
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/categories/${encodedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Nepodařilo se upravit kategorii');
        } catch (parseError) {
          throw new Error(`Chyba serveru: ${response.status} - ${errorText}`);
        }
      }

      const updatedCategory = await response.json();
      
      setCategories(prev => 
        prev.map(cat => cat.id === id ? updatedCategory : cat)
           .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      );
      return updatedCategory;
    } catch (err) {
      console.error('Chyba při úpravě kategorie:', err);
      throw err;
    }
  }, []);

  return { 
    categories, 
    loading, 
    error, 
    addCategory, 
    deleteCategory, 
    updateCategory,
    refetch: fetchCategories 
  };
}

