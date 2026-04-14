"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";

export function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    return (
        <header className="absolute top-0 right-0 left-0 p-4 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-6">
                <Link href="/" className="text-xl font-bold tracking-tight text-[var(--color-primary)]">
                    Snip
                </Link>
                <Link href="/guide" className="hidden md:block text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                    Guide
                </Link>
            </div>
            
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        {pathname !== "/dashboard" && (
                            <Link href="/dashboard" className="text-sm font-medium hover:text-[var(--color-primary)] text-[var(--color-text)] flex items-center gap-1 transition-colors">
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </Link>
                        )}
                        <button
                            onClick={logout}
                            className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-error)] flex items-center gap-1 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                            Log in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm font-medium bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all active:scale-95"
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
