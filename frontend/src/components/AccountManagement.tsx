"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  provider: string;
  accountName: string;
  balanceCZK: number;
  asOf: string;
  connectionId?: string | null;
  isVisible: boolean;
  customName?: string | null;
};

export default function AccountManagement({ initialAccounts = [] as Account[] }: { initialAccounts?: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [newAccount, setNewAccount] = useState<{ name: string; balance: string }>({ name: "", balance: "" });
  const router = useRouter();

  // Synchronizuj s initialAccounts
  useEffect(() => {
    if (initialAccounts && initialAccounts.length > 0) {
      setAccounts(initialAccounts);
    }
  }, [initialAccounts]);

  // Načti aktuální custom názvy
  useEffect(() => {
    const names: Record<string, string> = {};
    accounts.forEach(account => {
      if (account.customName) {
        names[account.id] = account.customName;
      }
    });
    setCustomNames(names);
  }, [accounts]);

  const handleToggleVisibility = async (accountId: string, isVisible: boolean) => {
    try {
      // Okamžitě aktualizuj UI
      setAccounts(prevAccounts => 
        prevAccounts.map(account => 
          account.id === accountId 
            ? { ...account, isVisible }
            : account
        )
      );

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible }),
      });

      if (!response.ok) {
        // Pokud se API volání nepovedlo, vrať změnu zpět
        setAccounts(prevAccounts => 
          prevAccounts.map(account => 
            account.id === accountId 
              ? { ...account, isVisible: !isVisible }
              : account
          )
        );
        throw new Error("Nepodařilo se aktualizovat účet");
      }

      // Odešli custom event pro okamžitou aktualizaci
      window.dispatchEvent(new CustomEvent('account-updated', {
        detail: { accountId, isVisible }
      }));
      router.refresh();
    } catch (error) {
      console.error("Chyba při aktualizaci účtu:", error);
      alert("Nepodařilo se aktualizovat účet");
    }
  };

  const handleSaveCustomName = async (accountId: string) => {
    const customName = customNames[accountId]?.trim() || null;
    
    try {
      // Okamžitě aktualizuj UI
      setAccounts(prevAccounts => 
        prevAccounts.map(account => 
          account.id === accountId 
            ? { ...account, customName }
            : account
        )
      );

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName }),
      });

      if (!response.ok) {
        // Pokud se API volání nepovedlo, vrať změnu zpět
        const originalAccount = accounts.find(a => a.id === accountId);
        setAccounts(prevAccounts => 
          prevAccounts.map(account => 
            account.id === accountId 
              ? { ...account, customName: originalAccount?.customName || null }
              : account
          )
        );
        throw new Error("Nepodařilo se aktualizovat název účtu");
      }

      setEditingAccount(null);
      
      // Odešli custom event pro okamžitou aktualizaci
      window.dispatchEvent(new CustomEvent('account-updated', {
        detail: { accountId, customName }
      }));
      router.refresh();
    } catch (error) {
      console.error("Chyba při aktualizaci názvu:", error);
      alert("Nepodařilo se aktualizovat název účtu");
    }
  };

  const handleCancelEdit = (accountId: string) => {
    setEditingAccount(null);
    // Reset to original custom name
    const account = accounts.find(a => a.id === accountId);
    if (account?.customName) {
      setCustomNames(prev => ({ ...prev, [accountId]: account.customName! }));
    } else {
      setCustomNames(prev => {
        const newNames = { ...prev };
        delete newNames[accountId];
        return newNames;
      });
    }
  };

  const getDisplayName = (account: Account) => {
    return account.customName || account.accountName;
  };

  // žádný load/error – data přichází ze serveru

  // Musím použít přísnou kontrolu, protože accounts může obsahovat pole undefined hodnot
  const validAccounts = accounts.filter(account => account && typeof account === 'object');
  
  console.log("Všechny validní účty:", validAccounts);
  
  const visibleAccounts = validAccounts.filter(account => account.isVisible !== false);
  const hiddenAccounts = validAccounts.filter(account => account.isVisible === false);
  
  console.log("Viditelné účty:", visibleAccounts);
  console.log("Skryté účty:", hiddenAccounts);

  return (
    <div className="space-y-6 max-h-[520px] overflow-y-auto hide-scrollbar">
      {/* Přidat vlastní účet */}
      <div className="glass p-3">
        <div className="text-sm font-semibold mb-2">Přidat vlastní účet</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="glass px-2 py-1 rounded text-sm border border-white/20"
            placeholder="Název účtu"
            value={newAccount.name}
            onChange={(e)=>setNewAccount(prev=>({...prev, name: e.target.value}))}
          />
          <input
            type="number"
            className="glass px-2 py-1 rounded text-sm border border-white/20 w-36 text-right"
            placeholder="Počáteční zůstatek (CZK)"
            value={newAccount.balance}
            onChange={(e)=>setNewAccount(prev=>({...prev, balance: e.target.value}))}
          />
          <button
            className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60"
            disabled={!newAccount.name.trim()}
            onClick={async()=>{
              try {
                const res = await fetch('/api/accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accountName: newAccount.name.trim(), balanceCZK: Number(newAccount.balance)||0 })
                });
                if (!res.ok) throw new Error('Nepodařilo se vytvořit účet');
                const acc = await res.json();
                setAccounts(prev=>[acc, ...prev]);
                setNewAccount({ name: '', balance: '' });
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Účet vytvořen', type: 'success' } }));
                router.refresh();
              } catch (e:any) {
                window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při vytvoření účtu', type: 'error' } }));
              }
            }}
          >
            Přidat
          </button>
        </div>
      </div>
      {/* Viditelné účty */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Aktivní účty ({visibleAccounts.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleAccounts.map((account) => (
            <div key={account.id} className="glass p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4">
                    {account.institutionLogo && (
                      <div className="flex-shrink-0">
                        <img 
                          src={account.institutionLogo} 
                          alt={`${account.provider} logo`}
                          className="w-12 h-12 rounded-xl object-cover bg-white/20 border-2 border-white/30 shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="font-medium text-sm truncate">
                      {account.customName ? account.customName : account.accountName}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {account.provider}
                  </div>
                  <div className="text-sm font-semibold text-[var(--accent)] mt-1">
                    {new Intl.NumberFormat("cs-CZ", { 
                      style: "currency", 
                      currency: "CZK" 
                    }).format(account.balanceCZK)}
                  </div>
                  {account.customName && (
                    <div className="text-xs text-[var(--muted)] mt-1">
                      Původní: {account.accountName}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  {editingAccount === account.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customNames[account.id] || ""}
                        className="glass px-2 py-1 rounded-lg text-sm placeholder-[var(--muted)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
                        onChange={(e) => setCustomNames(prev => ({ 
                          ...prev, 
                          [account.id]: e.target.value 
                        }))}
                        placeholder="Název"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveCustomName(account.id)}
                        className="px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      >
                        Uložit
                      </button>
                      <button
                        onClick={() => handleCancelEdit(account.id)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        Zrušit
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingAccount(account.id)}
                        className="px-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80 hover:bg-[var(--accent)]/5 rounded transition-colors"
                        title="Přejmenovat"
                      >
                        Přejmenovat
                      </button>
                      {!account.connectionId && (
                        <button
                          onClick={async()=>{
                            if (!confirm('Opravdu smazat tento účet? Tato akce je nevratná.')) return;
                            try {
                              const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
                              if (!res.ok) throw new Error('Smazání selhalo');
                              setAccounts(prev=> prev.filter(a=>a.id!==account.id));
                              window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Účet smazán', type: 'success' } }));
                              router.refresh();
                            } catch(e:any) {
                              window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při mazání účtu', type: 'error' } }));
                            }
                          }}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Smazat účet"
                        >
                          Smazat
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleVisibility(account.id, false)}
                        className="px-2 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                        title="Skrýt účet"
                      >
                        Skrýt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skryté účty */}
      {hiddenAccounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Skryté účty ({hiddenAccounts.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hiddenAccounts.map((account) => (
              <div key={account.id} className="glass p-3 opacity-60">
                <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4">
                    {account.institutionLogo && (
                      <div className="flex-shrink-0">
                        <img 
                          src={account.institutionLogo} 
                          alt={`${account.provider} logo`}
                          className="w-12 h-12 rounded-xl object-cover bg-white/20 border-2 border-white/30 shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="font-medium text-sm truncate">
                      {account.customName ? account.customName : account.accountName}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {account.provider}
                  </div>
                    <div className="text-sm font-semibold text-[var(--muted)] mt-1">
                      {new Intl.NumberFormat("cs-CZ", { 
                        style: "currency", 
                        currency: "CZK" 
                      }).format(account.balanceCZK)}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      Skrytý - nezobrazuje se
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleToggleVisibility(account.id, true)}
                      className="px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Zobrazit účet"
                    >
                      Zobrazit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="glass p-6 text-center text-[var(--muted)]">
          Žádné účty nenalezeny. Připojte banku pro zobrazení účtů.
        </div>
      )}
    </div>
  );
}
