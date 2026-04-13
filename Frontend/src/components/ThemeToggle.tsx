"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const saved = localStorage.getItem("snip-theme") as "dark" | "light" | null;
        const initial = saved || "dark";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
        if (initial === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggle = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        if (next === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("snip-theme", next);
    };

    return (
        <button
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="relative z-40 w-10 h-10 rounded-full glass flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 cursor-pointer ml-2"
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}
