"use client";

import { useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

// ── Singleton event bus (no context needed for a simple toast) ────────────────

type Listener = (toast: Omit<Toast, "id">) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function toast(kind: ToastKind, message: string) {
  listeners.forEach((l) => l({ kind, message }));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = ({ kind, message }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss };
}

// ── Toaster component ─────────────────────────────────────────────────────────

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border
            ${t.kind === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
            }`}
          style={{ animation: "slideUp 0.2s ease-out" }}
        >
          {t.kind === "success"
            ? <CheckCircle size={15} className="shrink-0 mt-0.5 text-green-600" />
            : <XCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-current opacity-50 hover:opacity-100 shrink-0"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
