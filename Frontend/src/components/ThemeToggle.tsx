"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const saved = localStorage.getItem("snip-theme") as "dark" | "light" | null;
        const initial = saved || "dark";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const toggle = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("snip-theme", next);
    };

    return (
        <button
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full glass flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}
