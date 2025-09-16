"use client";

import { useEffect, useRef, useState } from "react";

type ToastPhase = "enter" | "show" | "exit";

type ToastItem = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
  phase: ToastPhase;
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message: string; type?: ToastItem["type"]; durationMs?: number }>;
      const id = idRef.current++;
      const duration = ce.detail?.durationMs ?? 3500;
      const newToast: ToastItem = {
        id,
        message: ce.detail?.message || "",
        type: ce.detail?.type || "info",
        phase: "enter",
      };
      setToasts((prev) => [...prev, newToast]);

      // Plynulé zobrazení (enter -> show)
      requestAnimationFrame(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "show" } : t)));
      });

      // Naplánovat skrytí (show -> exit) a následné odstranění
      window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "exit" } : t)));
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 280);
      }, duration);
    };

    window.addEventListener("app-toast", handler as EventListener);
    return () => window.removeEventListener("app-toast", handler as EventListener);
  }, []);

  const colorByType: Record<NonNullable<ToastItem["type"]>, string> = {
    success: "bg-green-50 text-green-900 border-green-200",
    error: "bg-red-50 text-red-900 border-red-200",
    info: "bg-white/90 text-gray-900 border-gray-200",
  } as const;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-32px)] pointer-events-none">
      {toasts.map((t) => {
        const base = `glass border ${colorByType[t.type || "info"]} rounded-xl px-3 py-2 shadow-lg transition-all duration-300 ease-out will-change-transform pointer-events-auto`;
        const phaseClass =
          t.phase === "show"
            ? "opacity-100 translate-y-0 scale-100"
            : t.phase === "exit"
            ? "opacity-0 -translate-y-1.5 scale-[0.98]"
            : "opacity-0 -translate-y-1.5 scale-[0.98]"; // enter (před zobrazením)
        return (
          <div key={t.id} className={`${base} ${phaseClass}`}>
            <div className="text-sm font-medium mb-0.5">
              {t.type === "success" ? "Hotovo" : t.type === "error" ? "Chyba" : "Info"}
            </div>
            <div className="text-sm">{t.message}</div>
          </div>
        );
      })}
    </div>
  );
}


