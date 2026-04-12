"use client";

import { use, useState } from "react";
import { verifyPassword } from "@/lib/api";
import Link from "next/link";

export default function UnlockPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await verifyPassword(code, password);
            if (result.valid && result.originalUrl) {
                window.location.href = result.originalUrl;
            } else {
                setError("Incorrect password. Please try again.");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex items-center justify-center min-h-screen px-4">
            <div className="glass rounded-2xl p-8 max-w-md w-full glow">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold mb-2">Password Required</h1>
                    <p className="text-[var(--color-text-muted)] text-sm">
                        This short URL is password-protected.
                        <br />
                        Enter the password to continue.
                    </p>
                    <p className="text-[var(--color-text-dim)] text-sm mt-2 font-mono">/{code}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password..."
                        required
                        autoFocus
                        className="w-full px-5 py-4 bg-[var(--color-surface-light)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-lg rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)] transition-colors"
                    />

                    {error && (
                        <p className="text-[var(--color-error)] text-sm px-1">⚠️ {error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Verifying...
                            </span>
                        ) : "Unlock →"}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <Link href="/" className="text-sm text-[var(--color-text-dim)] hover:text-[var(--color-primary-light)] transition-colors">
                        ← Back to Shortener
                    </Link>
                </div>
            </div>
        </main>
    );
}
