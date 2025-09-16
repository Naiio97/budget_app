"use client";

import { useEffect, useState } from "react";
import { getPrimaryId, setPrimaryId, clearPrimaryId } from "@/lib/primary-account";
import { useParams, useRouter } from "next/navigation";

export default function StarPrimaryToggle({ id }: { id: string }) {
  const [isPrimary, setIsPrimary] = useState(false);
  const router = useRouter();
  const params = useParams() as { id?: string };

  useEffect(() => {
    setIsPrimary(getPrimaryId() === id);
  }, [id]);

  const toggle = () => {
    const currentId = params?.id;

    if (isPrimary) {
      // odebrat hlavní účet
      clearPrimaryId();
      setIsPrimary(false);
      // neprováděj redirect; zůstaň kde uživatel je
      return;
    }

    // nastavit jako hlavní
    setPrimaryId(id);
    setIsPrimary(true);
    // pokud nejsme na aktuálním detailu, přesměruj na nový hlavní účet
    if (currentId !== id) {
      router.replace(`/accounts/${id}`);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={isPrimary}
      title={isPrimary ? "Odebrat hlavní účet" : "Nastavit jako hlavní"}
      className={`inline-flex items-center justify-center rounded-full
                  w-8 h-8 transition hover:bg-black/5`}
    >
      {/* plná hvězda když je hlavní, jinak obrys */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27z"
          fill={isPrimary ? "var(--accent)" : "none"}
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}
