"use client";

import { useState } from "react";
import { createShortUrl, type CreateUrlResponse } from "@/lib/api";
import Link from "next/link";

export default function Home() {
    const [url, setUrl] = useState("");
    const [result, setResult] = useState<CreateUrlResponse | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const data = await createShortUrl(url);
            setResult(data);
            setUrl("");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result.shortUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
            {/* Header */}
            <div className="text-center mb-12 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-sm text-[var(--color-text-muted)] mb-6">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                    Powered by Redis & BullMQ
                </div>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
                    <span className="gradient-text">Shorten</span> your links,{" "}
                    <br className="hidden sm:block" />
                    <span className="gradient-text">amplify</span> your reach
                </h1>
                <p className="text-lg text-[var(--color-text-muted)] max-w-lg mx-auto">
                    Create lightning-fast short URLs with real-time analytics,
                    rate limiting, and background click processing.
                </p>
            </div>

            {/* URL Input Form */}
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl glass rounded-2xl p-2 glow transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            >
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste your long URL here..."
                        required
                        className="flex-1 px-5 py-4 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none text-lg rounded-xl focus:bg-[var(--color-surface-light)] transition-colors duration-200"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Shortening...
                            </span>
                        ) : (
                            "Shorten URL"
                        )}
                    </button>
                </div>
            </form>

            {/* Error */}
            {error && (
                <div className="mt-6 w-full max-w-2xl px-5 py-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] text-sm animate-[fadeIn_0.3s_ease-out]">
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="mt-6 w-full max-w-2xl glass rounded-2xl p-6 glow-accent animate-[fadeIn_0.4s_ease-out]">
                    <p className="text-sm text-[var(--color-text-muted)] mb-3">Your shortened URL is ready 🎉</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-border)] font-mono text-[var(--color-accent-light)] truncate text-lg">
                            {result.shortUrl}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="px-5 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap text-sm"
                            style={{
                                background: copied
                                    ? "var(--color-success)"
                                    : "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
                                color: "white",
                            }}
                        >
                            {copied ? "✓ Copied!" : "Copy"}
                        </button>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm text-[var(--color-text-dim)]">
                        <Link
                            href={`/${result.shortCode}/stats`}
                            className="hover:text-[var(--color-primary-light)] transition-colors underline underline-offset-4"
                        >
                            View Analytics →
                        </Link>
                    </div>
                </div>
            )}

            {/* Features Section */}
            <div className="mt-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        icon: "⚡",
                        title: "Blazing Fast",
                        desc: "Redis-cached redirects with sub-millisecond response times",
                    },
                    {
                        icon: "📊",
                        title: "Real-time Analytics",
                        desc: "Track clicks with background processing via BullMQ workers",
                    },
                    {
                        icon: "🛡️",
                        title: "Rate Limited",
                        desc: "Built-in protection against spam with Redis rate limiting",
                    },
                ].map((feature) => (
                    <div
                        key={feature.title}
                        className="glass-light rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:glow"
                    >
                        <div className="text-3xl mb-3">{feature.icon}</div>
                        <h3 className="font-semibold text-[var(--color-text)] mb-1">{feature.title}</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">{feature.desc}</p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <footer className="mt-20 text-sm text-[var(--color-text-dim)]">
                Built with Next.js, NestJS, Redis & PostgreSQL
            </footer>
        </main>
    );
}
