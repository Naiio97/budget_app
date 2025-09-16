export const PRIMARY_KEY = "primaryAccountId";

export const getPrimaryId = () =>
  typeof window === "undefined" ? null : localStorage.getItem(PRIMARY_KEY);

// Event name for cross-component notifications
const PRIMARY_EVENT = "primaryAccountChanged";

export function setPrimaryId(id: string) {
  localStorage.setItem(PRIMARY_KEY, id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PRIMARY_EVENT, { detail: { id } }));
  }
}

export function clearPrimaryId() {
  localStorage.removeItem(PRIMARY_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PRIMARY_EVENT, { detail: { id: null } }));
  }
}

// Subscribe to primary account changes (same-tab via CustomEvent, cross-tab via storage)
export function onPrimaryIdChange(callback: (id: string | null) => void) {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const ce = e as CustomEvent<{ id?: string | null }>;
    if (typeof ce.detail?.id === "string" || ce.detail?.id === null) {
      callback(ce.detail.id);
    } else {
      callback(getPrimaryId());
    }
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PRIMARY_KEY) callback(e.newValue);
  };

  window.addEventListener(PRIMARY_EVENT, handleCustom as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PRIMARY_EVENT, handleCustom as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}

