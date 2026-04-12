"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut, User, LayoutDashboard } from "lucide-react";

export function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="absolute top-0 right-0 left-0 p-4 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-6">
                <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                    Snip
                </Link>
                <Link href="/guide" className="hidden md:block text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                    Guide
                </Link>
            </div>
            
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        <Link href="/dashboard" className="text-sm font-medium hover:text-indigo-600 flex items-center gap-1 transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <button
                            onClick={logout}
                            className="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="text-sm font-medium hover:text-indigo-600 transition-colors">
                            Log in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
                        >
                            Sign up
                        </Link>
                    </>
                )}
                <ThemeToggle />
            </div>
        </header>
    );
}
