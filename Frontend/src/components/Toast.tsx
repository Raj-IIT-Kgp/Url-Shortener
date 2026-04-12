"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    leaving?: boolean;
}

interface ToastContextValue {
    toasts: Toast[];
    toast: (message: string, type?: ToastType, duration?: number) => string;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
        const timer = timers.current.get(id);
        if (timer) { clearTimeout(timer); timers.current.delete(id); }
    }, []);

    const toast = useCallback(
        (message: string, type: ToastType = "info", duration = 3500) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((prev) => [...prev, { id, message, type }]);
            const timer = setTimeout(() => dismiss(id), duration);
            timers.current.set(id, timer);
            return id;
        },
        [dismiss]
    );

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((t) => clearTimeout(t));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
};

const colors: Record<ToastType, string> = {
    success: "var(--color-success)",
    error: "var(--color-error)",
    info: "var(--color-primary-light)",
};

export function ToastContainer() {
    const { toasts, dismiss } = useToast();
    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`${t.leaving ? "toast-leave" : "toast-enter"} pointer-events-auto glass rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg`}
                >
                    <span className="text-sm font-bold mt-0.5 shrink-0" style={{ color: colors[t.type] }}>
                        {icons[t.type]}
                    </span>
                    <p className="text-sm flex-1" style={{ color: "var(--color-text)" }}>{t.message}</p>
                    <button
                        onClick={() => dismiss(t.id)}
                        className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors text-lg leading-none shrink-0 cursor-pointer"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
